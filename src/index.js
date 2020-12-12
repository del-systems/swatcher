import commander from 'commander'
import swatcherVersion from '../version'
import collectCommand from './collect_command'
import generateDiffCommand from './generate_diff_command'

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
  )

commander
  .command('collect <dir> [other_dirs...]')
  .description('Collect screenshots from specified directory')
  .action(collectCommand)

commander
  .command('generate-diff')
  .description('Generate diffs for already collected screenshots')
  .action(generateDiffCommand)

async function main () {
  try {
    await commander.parseAsync()
  } catch (error) {
    console.error(error.name, error.message)
    process.exit(1)
  }
}

main()
