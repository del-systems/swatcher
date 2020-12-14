# swatcher(1) -- track user interface changes like a git history

## SYNOPSIS

```bash
swatcher collect <dir> [other_dirs...]
swatcher generate-diff
```

## DESCRIPTION
This project aimed to collect screenshots from UI tests and store them to S3 compatible storage. Screenshots are referenced by their name
and every new one will be compared with old ones. It will be displayed in HTML report if there any differences. This is not screenshot or
snapshot testing, this is history of the each screen's snapshot.

## COMMANDS
- `collect <dir> [other_dirs...]`

  Collects screenshots from current build and uploads them to S3 compatible storage. Can be called multiple times. Usefull for distributed
  or matrix testing.

  Configurtion needed. See [ENVIRONMENT][].

  Both absolute or relative paths are supported. Each
  path will be converted to absolute one and encoded into base32. Due to limitations of POSIX path delimiter slash `/` is insterted every
  255 chars. POSIX has a limit of 255 bytes for path segment and 4096 bytes for path. You probably want to put your screenshots into
  `/tmp/screenshots` to reduce byte count in your paths. Do not forget that encoding base32 will produce about 160% more bytes than input

- `generate-diff`

  Detects current build sha and previous commit's sha, generates lists of removed, updated and added paths. Generates messagee and posts to
  Github pull request (if any)

  Configurtion needed. See [ENVIRONMENT][].

  Path types that marked with \*(asterisk) are printed to `stdout` and posted as a comment.

  **removed**\* - every path that was detected on previous commit but not on current one. Considered as **removed**. Diff files aren't generated

  **changed** - every path that was detected both on previous commit and current one. Considered as **changed**, but not **updated**. Every screenshot
  will be downloaded from both commits to compare them. If they differ, the path considered as **updated**.

  **updated**\* - every path that was detected on both on previous commit and current one **and** difference is detected.

  **added**\* - every path that was not detected on previous commit but on current one. Considered as **added**. Diff files aren't generated.

## OPTIONS
There are no options yet

## ENVIRONMENT
All configuration is done using environment variables. Each environment variable is read in a order that is printed here. The first read
one is used later.

- `SWATCHER_S3_ACCESS_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_ACCESS_KEY`

  Access key for S3 authenticating

- `SWATCHER_S3_SECRET_KEY`, `AWS_SECRET_ACCESS_KEY`, `AWS_SECRET_KEY`

  Secret key for S3 authenticating

- `SWATCHER_S3_BUCKET_NAME`, `AWS_BUCKET`

  Existing bucket to upload files to. Swatcher will not attempt to create if bucket doesn't exist

- `SWATCHER_S3_REGION`, `AWS_DEFAULT_REGION`, `AWS_REGION`

  _Using these variables will cancel endpoint related ones_. When provided the endpoint is creating using the
  template "https://s3.$REGION.amazonaws.com"

- `SWATCHER_S3_ENDPOINT`, `AWS_ENDPOINT`

  Endpoint to connect to. Useful when using S3 compatible service.

- `SWATCHER_S3_FORCE_PATH_STYLE_BUCKET`

  _Optional_. By default it's false. Empty value considered as `false`, otherwise `true`. Useful when using S3 compatible service
  (like minio)

- `SWATCHER_GITHUB_API_TOKEN`

  Github API token (or developer's personal access token) to post comments

The following environment variables are present in Github Actions. No need to set it up manually.

- `GITHUB_EVENT_NAME`

  Event that triggered build. Accepted only `pull_request` and `push`

- `GITUHB_EVENT_PATH`

  Full path to github event. Requried for detected base and head commit sha

- `GITHUB_REPOSITORY`

  Current github repository in format `owner/repo`

- `GITHUB_API_URL`

  Github API url to make commenting requests

## SECURITY CONSIDERATIONS
To make it possible to easily post comments, every uploaded file is made as public (using object ACL). Make sure that you do not collect
any sensitive data.

## BUGS
If you detect any bugs, please report it to [the repository](https://github.com/del-systems/swatcher)
## HISTORY
1.0.\* - Public initial release
## AUTHOR
Shakhzod Ikromov <aabbcc.double@gmail.com>
