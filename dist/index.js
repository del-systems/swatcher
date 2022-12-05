#!/usr/bin/env node
'use strict';

var commander = require('commander');
var sjson = require('secure-json-parse');
var fs = require('fs');
var util = require('util');
var clientS3 = require('@aws-sdk/client-s3');
var nodeDownloaderHelper = require('node-downloader-helper');
var tmpPromise = require('tmp-promise');
var pathModule = require('path');
var rfc4648 = require('rfc4648');
var os = require('os');
var looksSame = require('looks-same');
var imageSize = require('image-size');
var nodeFetch = require('node-fetch');

var swatcherVersion = '1.4.3';

class GithubActionsEnvironment {
  constructor (githubPayload) {
    switch (process.env.GITHUB_EVENT_NAME) {
      case 'pull_request':
        this.baseSha = githubPayload.pull_request?.base?.sha;
        this.headSha = githubPayload.pull_request?.head?.sha;
        break
      case 'push':
        this.baseSha = githubPayload.before;
        this.headSha = githubPayload.after;
        break
      case 'workflow_dispatch':
        this.headSha = process.env.GITHUB_SHA;
    }

    if (!this.baseSha && !this.headSha) throw new Error('Base sha and head sha couldn\'t be resolved')
  }
}

/**
 * Fetches current CI and checks veriables
 * @returns {GithubActionsEnvironment}
 */
async function CI () {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) throw new Error('process.env.GITHUB_EVENT_PATH returned falsy value')

  const payload = sjson.parse(await util.promisify(fs.readFile)(eventPath, 'utf8'));
  return new GithubActionsEnvironment(payload)
}

const readPrioritized = (...names) => (
  names
    .map(envName => process.env[envName])
    .reduce((result, current) => result || current, undefined)
);

class S3credentials {
  get accessKey () {
    return readPrioritized('SWATCHER_S3_ACCESS_KEY', 'AWS_ACCESS_KEY_ID', 'AWS_ACCESS_KEY')
  }

  get secretKey () {
    return readPrioritized('SWATCHER_S3_SECRET_KEY', 'AWS_SECRET_ACCESS_KEY', 'AWS_SECRET_KEY')
  }

  get bucketName () {
    return readPrioritized('SWATCHER_S3_BUCKET_NAME', 'AWS_BUCKET')
  }

  get endpoint () {
    return this.region ? `https://s3.${this.region}.amazonaws.com` : readPrioritized('SWATCHER_S3_ENDPOINT', 'AWS_ENDPOINT')
  }

  get region () {
    return readPrioritized('SWATCHER_S3_REGION', 'AWS_DEFAULT_REGION', 'AWS_REGION')
  }

  get forcePathStyleBucket () {
    return (!!readPrioritized('SWATCHER_S3_FORCE_PATH_STYLE_BUCKET')) || false
  }

  get isConfigReady () {
    return !!(this.accessKey && this.bucketName && this.secretKey && this.endpoint)
  }
}

var temporaryDir = async () => await tmpPromise.dir();

class S3 {
  constructor () {
    this._credentials = new S3credentials();
    if (!this._credentials.isConfigReady) throw new Error('S3 config isn\'t ready')

    this._awsS3 = new clientS3.S3Client({
      credentials: {
        accessKeyId: this._credentials.accessKey,
        secretAccessKey: this._credentials.secretKey
      },
      forcePathStyle: this._credentials.forcePathStyleBucket,
      endpoint: this._credentials.endpoint,
      region: this._credentials.region ?? 'default-value' // https://github.com/aws/aws-sdk-js-v3/issues/1845#issuecomment-754832210'
    });
  }

  url (fullKey) {
    return `${this._credentials.endpoint}/${this._credentials.bucketName}/${fullKey}`
  }

  async download (fullKey) {
    const folder = (await temporaryDir()).path;
    return new Promise((resolve, reject) => {
      const dl = new nodeDownloaderHelper.DownloaderHelper(this.url(fullKey), folder, { override: true });
      dl.on('end', downloadInfo => {
        resolve(downloadInfo.filePath);
      });
      dl.on('error', reject);
      dl.start();
    })
  }

  async _paginatedList (prefix, nextMarker) {
    const output = await this._awsS3.send(new clientS3.ListObjectsV2Command({
      Bucket: this._credentials.bucketName,
      Delimiter: '/',
      ContinuationToken: nextMarker,
      Prefix: prefix
    }));

    // In AWS S3 terms `keys` are files
    const keys = output.Contents?.map(item => item.Key) ?? [];
    // In AWS S3 terms `common prefixes` are directories. They are common in multiple keys
    const prefixes = output.CommonPrefixes?.map(item => item.Prefix) ?? [];

    return { nextMarker: output.NextContinuationToken, keys, prefixes }
  }

  async list (prefix) {
    let nextMarker;
    let keys = [];
    let prefixes = [];
    do {
      const data = await this._paginatedList(prefix, nextMarker);
      nextMarker = data.nextMarker;
      keys = keys.concat(data.keys);
      prefixes = prefixes.concat(data.prefixes);
    } while (nextMarker)

    const unique = (v, i, a) => (a.indexOf(v) === i);

    return {
      prefixes: prefixes.map(item => item.substring(prefix.length)).filter(unique),
      keys: keys.map(item => item.substring(prefix.length)).filter(unique)
    }
  }

  async upload (filePath, key, contentType) {
    await this._awsS3.send(new clientS3.PutObjectCommand({
      Body: await (util.promisify(fs.readFile)(filePath)),
      ContentType: contentType,
      Key: key,
      ACL: 'public-read',
      Bucket: this._credentials.bucketName
    }));
  }
}

/**
 * Covert short or relative path to absolute
 * @param {string} path
 * @returns {Promise<string>}
 */
async function getRealPath (path) {
  return new Promise((resolve, reject) => {
    fs.realpath(path, (err, realPath) => {
      if (err) reject(err);
      else resolve(realPath);
    });
  })
}

async function isDir (path) {
  return new Promise((resolve, reject) => {
    fs.lstat(path, (err, stats) => {
      if (err) reject(err);
      else resolve(stats.isDirectory());
    });
  })
}

async function listDir (path) {
  return new Promise((resolve, reject) => {
    fs.readdir(path, (err, files) => {
      if (err) reject(err);
      else resolve(files.map(f => pathModule.join(path, f)));
    });
  })
}

/**
 * Function for filtering out paths from traverser module
 *
 * @callback listFilesFromPathFilter
 * @param {string} fullPath - A full path to the current file or dir
 * @param {bool} isDir - Is current path resolves to a directory or not
 * @param {string} basename - Basename extracted from a fullPath
 * @return {bool} - Should current path be ignored while creating a full list

/**
 * Searchs all valid files recursively for given path. If path is a file, the file itself will be returned
 * @param {string} path - Path to look in for
 * @param {listFilesFromPathFilter} [filter] - Function to filter returned paths. By default hidden items (started with .)
 * are ignored
 * @returns {Promise<string[]>}
 */
async function listFilesFromPath (path, filter) {
  if (!path) throw new Error('Invalid path was given')
  filter = filter ?? ((...[, , basename]) => !basename.startsWith('.'));

  const rPath = await getRealPath(path);
  const isD = await isDir(rPath);
  if (!isD) return [rPath]
  if (!filter(rPath, isD, pathModule.basename(rPath))) return []

  const filesInDir = await listDir(rPath);

  return Promise.all(filesInDir.map(f => listFilesFromPath(f, filter)))
    .then(arr => arr.flat(Infinity))
    .then(arr => arr.filter(item => filter(item, false, pathModule.basename(item))))
}

async function fsOpen (path) {
  return new Promise((resolve, reject) => {
    fs.open(path, 'r', (err, fileDescriptor) => {
      if (err) reject(err);
      else resolve(fileDescriptor);
    });
  })
}

async function fsRead (fileDescriptor, requiredBytes) {
  return new Promise((resolve, reject) => {
    fs.read(fileDescriptor, Buffer.alloc(requiredBytes), 0, requiredBytes, 0, (err, readBytes, buffer) => {
      if (err) reject(err);
      else resolve(buffer);
    });
  })
}

async function fsClose (fd) {
  return new Promise((resolve, reject) => {
    fs.close(fd, (err) => {
      if (err) reject(err);
      else resolve();
    });
  })
}

const PNG_MAGIC_CODE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

async function isPNG (path) {
  const fd = await fsOpen(path);
  try {
    const fileBuffer = await fsRead(fd, PNG_MAGIC_CODE.length);
    return PNG_MAGIC_CODE.equals(fileBuffer.slice(0, PNG_MAGIC_CODE.length))
  } finally {
    await fsClose(fd);
  }
}

const safeSplit = path => (
  path
    .split('')
    .reduce((accumulator, currentChar) => {
      if (accumulator.length % 255 === 0 && accumulator.length > 0) {
        accumulator = accumulator.concat(['/']);
      }
      accumulator = accumulator.concat([currentChar]);
      return accumulator
    }, [])
    .join('')
);

const removeSlashes = path => path.replace(/\//g, '');

const safeBase32Encode = path => safeSplit(rfc4648.base32.stringify(Buffer.from(path, 'utf8')));
const safeBase32Decode = path => Buffer.from(rfc4648.base32.parse(removeSlashes(path))).toString('utf8');

const clusterize = array => array.reduce(
  (acc, value) => {
    const clusterLimit = os.cpus().length;
    const lastCluster = acc.slice(-1).pop();

    if (lastCluster.length === clusterLimit) acc.push([value]);
    else lastCluster.push(value);

    return acc
  },
  [[]]
);

async function parallelPromise (array, handler) {
  const results = [];
  for (const batch of clusterize(array)) (await Promise.all(batch.map(handler))).forEach(i => results.push(i));
  return results
}

async function collectCommand (dir, otherDirs) {
  const s3 = new S3();
  const ci = await CI();

  const dirs = await asyncMap$1([dir].concat(otherDirs ?? []), async d => await getRealPath(d));
  const pngFiles = (await listPNGFiles(dirs))
    .map(path => ({ path, key: `${ci.headSha}/${safeBase32Encode(path)}`, contentType: 'image/png' }));

  await uploadFiles(s3, pngFiles);
}

const uploadFiles = async (s3, items) => await parallelPromise(items, async item => {
  console.log(`Uploading '${item.path}' with key '${item.key}' and content-type '${item.contentType}'...`);
  await s3.upload(item.path, item.key, item.contentType);
});

const listPNGFiles = async dirs => {
  const files = (await asyncMap$1(dirs, async d => listFilesFromPath(d))).flat();
  const readFiles = await asyncMap$1(files, async path => ({ path, isPNG: await isPNG(path) }));
  return readFiles
    .filter(item => item.isPNG)
    .map(item => item.path)
};

const asyncMap$1 = async (array, closure) => await Promise.all(array.map(closure));

var temporaryFile = async () => {
  const { fd, path, cleanup } = await tmpPromise.file();
  await util.promisify(fs.close)(fd); // we dont need file descriptor

  return { path, cleanup }
};

const isInRange = (x, b, t) => x >= b && x <= t;
const areDimensionsSame = (x, y) => x.width === y.width && x.height === y.height;
const handleEach = (mutatedArray, handler) => {
  for (let i = 0, l = mutatedArray.length; i < l; i++) {
    const element = mutatedArray.shift();
    if (!handler(element)) mutatedArray.push(element);
  }
};

async function comparePNGs (pngBefore, pngAfter, outputPath) {
  const pixelRatio = Number(process.env.SWATCHER_PIXEL_RATIO) || 2;

  const looksSameOptions = {
    pixelRatio,
    shouldCluster: true,
    tolerance: Number(process.env.SWATCHER_DIFF_TOLERANCE) || 5
  };
  const { equal, diffClusters } = await util.promisify(looksSame)(pngBefore, pngAfter, looksSameOptions);
  if (equal) return { equal }

  const dimensions = await util.promisify(imageSize)(pngBefore);
  if (diffClusters.length !== 0 && areDimensionsSame(dimensions, await util.promisify(imageSize)(pngAfter))) {
    dimensions.width /= pixelRatio;
    dimensions.height /= pixelRatio;

    handleEach(diffClusters, cluster => {
      cluster.top /= pixelRatio;
      cluster.left /= pixelRatio;
      cluster.right /= pixelRatio;
      cluster.bottom /= pixelRatio;
      cluster.width = cluster.right - cluster.left;
      cluster.height = cluster.bottom - cluster.top;

      return isClusterHomeIndicator(dimensions, cluster) || isClusterTextFieldCaret(dimensions, cluster)
    });

    if (diffClusters.length === 0) return { equal: true }
  }

  const path = outputPath ?? (await temporaryFile()).path;
  await util.promisify(looksSame.createDiff)({ reference: pngBefore, current: pngAfter, pixelRatio, diff: path });
  return { equal, diffPath: path }
}

const isClusterHomeIndicator = (dimensions, cluster) => (
  isInRange(cluster.height, 4, 6) && isInRange(dimensions.height - cluster.bottom, 7, 9)
);

const isClusterTextFieldCaret = (dimensions, cluster) => (
  isInRange(cluster.width, 0.3, 3) && isInRange(cluster.height, 15, 30)
);

const fetch = async (url, options) => {
  const response = await nodeFetch(url, options);
  if (!response.ok) throw new Error(`Response status was ${response.status} (${response.statusText}) for ${url}`)
  return await response.json()
};

var reportChanges = async (comment) => {
  let credentials;

  try {
    credentials = await checkIfCanComment();
  } catch (error) {
    console.warn(error.message);
    return
  }

  switch (credentials.eventName) {
    case 'pull_request':
      await createOrUpdatePullRequestComment(credentials, comment);
      break
    default:
      console.warn(`Skipping posting a message. Only 'pull_request' event is supported. Current event '${credentials.eventName}'`);
  }
};

const checkIfCanComment = async () => {
  const checkEnvVariableAndReturn = varName => {
    const value = process.env[varName];
    if (!value) throw new Error(`Required environment variable '${varName}' isn't set`)
    return value
  };

  return {
    repo: checkEnvVariableAndReturn('GITHUB_REPOSITORY'),
    token: checkEnvVariableAndReturn('SWATCHER_GITHUB_API_TOKEN'),
    apiURL: checkEnvVariableAndReturn('GITHUB_API_URL'),
    eventName: checkEnvVariableAndReturn('GITHUB_EVENT_NAME'),
    eventPayload: await sjson.parse(await util.promisify(fs.readFile)(checkEnvVariableAndReturn('GITHUB_EVENT_PATH'), 'utf8'))
  }
};

const createOrUpdatePullRequestComment = async (credentials, message) => {
  const headers = {
    Authorization: `token ${credentials.token}`,
    Accept: 'application/vnd.github.v3+json'
  };
  let url = `${credentials.apiURL}/repos/${credentials.repo}/issues/${credentials.eventPayload.pull_request.number}/comments`;
  let response = await fetch(url, { headers });
  let commentId = response.find(c => c.body.startsWith('<!--SWATCHER-->'))?.id;

  if (!commentId) {
    const body = JSON.stringify({ body: '<!--SWATCHER-->' });
    response = await fetch(url, { headers, method: 'POST', body });
    commentId = response.id;
  }

  url = `${credentials.apiURL}/repos/${credentials.repo}/issues/comments/${commentId}`;
  await fetch(url, { method: 'PATCH', headers, body: JSON.stringify({ body: '<!--SWATCHER-->\n# [Swatcher](https://github.com/del-systems/swatcher) Report\n\n' + message }) });
};

async function generateDiffCommand () {
  const s3 = new S3();
  const ci = await CI();

  if (!ci.baseSha) {
    console.warn('Cannot generate diffs when base SHA isn\'t available');
    return
  }

  const headPaths = await listFiles(s3, ci.headSha);
  const basePaths = await listFiles(s3, ci.baseSha);
  const addedPaths = headPaths.filter(item => !basePaths.find(i => i.fsPath === item.fsPath));
  const removedPaths = basePaths.filter(item => !headPaths.find(i => i.fsPath === item.fsPath));
  const updatedPaths = headPaths.filter(item => !!basePaths.find(i => i.fsPath === item.fsPath));

  const changedPaths = (
    await parallelPromise(updatedPaths, async item => {
      let baseDownlaodedPath;
      let headDownloadedPath;

      try {
        baseDownlaodedPath = await s3.download(`${ci.baseSha}/${item.fullKey}`);
        headDownloadedPath = await s3.download(`${ci.headSha}/${item.fullKey}`);
      } catch (error) {
        console.warn(`Skipping file '${item.fsPath}' as it couldn't be downloaded`);
        return null
      }

      const { equal, diffPath } = await comparePNGs(baseDownlaodedPath, headDownloadedPath);
      if (equal || !diffPath) return null

      const diffKey = `${ci.baseSha}-${ci.headSha}/${item.fullKey}`;
      await s3.upload(diffPath, diffKey, 'image/png');
      return {
        ...item,
        diffKey
      }
    })
  )
    .filter(i => !!i);

  console.log('---');
  console.log('Removed');
  console.log(removedPaths);
  console.log('---');
  console.log('Added');
  console.log(addedPaths);
  console.log('---');
  console.log('Changed');
  console.log(changedPaths);

  let body = 'Before|After|Diff\n-----|-----|-----\n';
  body += removedPaths.reduce((accumulator, item) => accumulator + `<img title='${item.fsPath}' src='${s3.url(ci.baseSha + '/' + item.fullKey)}'>| _removed_ | _N/A_ \n`, '');
  body += addedPaths.reduce((accumulator, item) => accumulator + `_not existed_ |<img title='${item.fsPath}' src='${s3.url(ci.headSha + '/' + item.fullKey)}'> | _N/A_ \n`, '');
  body += changedPaths.reduce((accmulator, item) => accmulator + `<img title='${item.fsPath}' src='${s3.url(ci.baseSha + '/' + item.fullKey)}'>|<img title='${item.fsPath}' src='${s3.url(ci.headSha + '/' + item.fullKey)}'>|<img title='${item.fsPath}' src='${s3.url(item.diffKey)}'> \n`, '');
  await reportChanges(body);
}

const listFiles = async (s3, sha, prefix = '') => {
  const { prefixes, keys } = await s3.list(`${sha}/${prefix}`);

  const deeperKeys = await asyncMap(prefixes, async pre => await listFiles(s3, sha, prefix + pre));
  return keys.map(key => ({ fullKey: prefix + key, fsPath: safeBase32Decode(prefix + key) })).concat(deeperKeys.flat())
};

const asyncMap = async (array, closure) => await Promise.all(array.map(closure));

const checkFile = async file => {
  if (!await isPNG(file)) throw new Error(`File at path '${file}' isn't recognized as PNG file`)
};

var diffLocalCommand = async (fileA, fileB, outputFile) => {
  fileA = await getRealPath(fileA);
  fileB = await getRealPath(fileB);
  const fileName = pathModule.basename(outputFile);
  outputFile = await getRealPath(pathModule.dirname(outputFile));

  await checkFile(fileA);
  await checkFile(fileB);

  const { equal } = await comparePNGs(fileA, fileB, pathModule.join(outputFile, fileName));
  if (equal) {
    console.warn('Comparing equal files, exiting with code 2');
    process.exit(2);
  }
};

commander
  .version(swatcherVersion)
  .name('Swatcher - track UI changes like a git history')
  .description(
    'https://github.com/del-systems/swatcher\n' +
    '\n' +
    'This project aimed to collect screenshots from UI tests and store them to S3 compatible storage.\n' +
    'Screenshots are referenced by their name and every new one will be compared with old ones.\n' +
    'It will be displayed in HTML report if there any differences. This is not screenshot or snapshot\n' +
    'testing, this is history of the each screen\'s snapshot.'
  );

commander
  .command('collect <dir> [other_dirs...]')
  .description('Collect screenshots from specified directory')
  .action(collectCommand);

commander
  .command('generate-diff')
  .description('Generate diffs for already collected screenshots')
  .action(generateDiffCommand);

commander
  .command('diff-local <A_png> <B_png> <output_png>')
  .description('Create a diff file for locally available files')
  .action(diffLocalCommand);

async function main () {
  try {
    await commander.parseAsync();
  } catch (error) {
    console.error(error.name, error.message);
    process.exit(1);
  }
}

main();
