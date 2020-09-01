import collectCommand from './collect_command.js'

it('should do nothing', async () => {
  await expect(() => collectCommand('')).rejects.toThrowError()
})
