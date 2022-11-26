import parallelPromise, { clusterize } from '../parallel_promise'
import os from 'os'

jest.mock('os', () => ({
  cpus: () => [null, null, null]
}))

it('should clusterize to cpu count', () => {
  expect(clusterize([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]])
  expect(clusterize([])).toEqual([[]])
  expect(clusterize([1, 2])).toEqual([[1, 2]])
})

it('should process in parallel while stopping at first failure', async () => {
  const handler = jest.fn(i => i < 0 ? Promise.reject(i) : Promise.resolve(i))
  await expect(parallelPromise([1, 2, 3, 4, -1, 6, 7, 8], handler)).rejects.toEqual(-1)

  expect(handler).toHaveBeenCalledTimes(6)
})

it('should wait as much as possible', async () => {

  const handler = jest.fn(i => new Promise(resolve => setTimeout(resolve, i, i)))
  const pendingResults = parallelPromise([100, 200, 300, 400, 500, 600, 700, 800], handler)

  const cpuCount = os.cpus().length
  expect(handler).toHaveBeenCalledTimes(cpuCount)

  // next batch shouldn't start before finishing pending onesa
  setTimeout(() => expect(handler).toHaveBeenCalledTimes(cpuCount), 250)

  // next batch should start after finishing previous one
  setTimeout(() => expect(handler).toHaveBeenCalledTimes(cpuCount * 2), 350)

  await expect(pendingResults).resolves.toEqual([100, 200, 300, 400, 500, 600, 700, 800])
})
