import commander from 'commander'
import swatcherVersion from '../version.js'
import collectCommand from './collect_command.js'

commander
  .version(swatcherVersion)
  .name('Swatcher - track UI changes like a git history')
  .description(
    'This project aimed to collect screenshots from UI tests and store them to S3 compatible storage.\n' +
    'Screenshots are referenced by their name and every new one will be compared with old ones.\n' +
    'It will be displayed in HTML report if there any differences. This is not screenshot or snapshot\n' +
    'testing, this is history of the each screen\'s snapshot.'
  )

commander
  .command('collect <dir>')
  .description('Collect screenshots from specified directory')
  .action(collectCommand)

commander.parse()
