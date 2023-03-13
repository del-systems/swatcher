export default function readPixelRatioFromPath (path) {
  const re = /pixel_ratio_(\d+)/i
  const result = re.exec(path)
  return Number(result?.at(1))
}
