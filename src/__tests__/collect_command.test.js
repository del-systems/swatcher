import collectCommand from '../collect_command'

it('should do nothing', async () => {
  await expect(() => collectCommand('')).rejects.toThrowError()
})
