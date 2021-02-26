import os from 'os'

export const clusterize = array => array.reduce(
  (acc, value) => {
    const clusterLimit = os.cpus().length
    const lastCluster = acc.slice(-1).pop()

    if (lastCluster.length === clusterLimit) acc.push([value])
    else lastCluster.push(value)

    return acc
  },
  [[]]
)

export default async function (array, handler) {
  const results = []
  for (const batch of clusterize(array)) (await Promise.all(batch.map(handler))).forEach(i => results.push(i))
  return results
}
