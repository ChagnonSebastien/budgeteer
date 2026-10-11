const closeGapRatio = 0.03
const similarityRange = 24
const normalVisionShare = 0.8
const maxPasses = 20
const identicalPenalty = 2
const reusePenalty = 0.5

type Rgb = [number, number, number]

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)

const parseHex = (hex: string): Rgb => [1, 3, 5].map((i) => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255)) as Rgb

const toOklab = ([r, g, b]: Rgb): Rgb => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

// Machado et al. 2009 protanopia and deuteranopia at full severity, in linear RGB.
const deficiencies: number[][][] = [
  [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
]

const simulate = (rgb: Rgb, matrix: number[][]): Rgb =>
  matrix.map((row) => Math.min(1, Math.max(0, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2]))) as Rgb

const distance = (a: Rgb, b: Rgb) => {
  const [la, lb] = [toOklab(a), toOklab(b)]
  return 100 * Math.hypot(la[0] - lb[0], la[1] - lb[1], la[2] - lb[2])
}

const perceivedDistance = (a: Rgb, b: Rgb) =>
  normalVisionShare * distance(a, b) +
  (1 - normalVisionShare) * Math.min(...deficiencies.map((m) => distance(simulate(a, m), simulate(b, m))))

const adjacencyWeights = (layers: [number, number][][]) => {
  const n = layers.length
  const weights = Array.from({ length: n }, () => Array(n).fill(0))
  const stacking = Array.from({ length: n }, () => Array(n).fill(0))
  const points = layers[0]?.length ?? 0

  for (let i = 0; i < points; i++) {
    const thickness = layers.map((layer) => Math.abs(layer[i][1] - layer[i][0]))
    const total = thickness.reduce((sum, t) => sum + t, 0)
    if (total === 0) continue
    const visible = thickness.flatMap((t, index) => (t > 0 ? [index] : []))

    for (let a = 0; a < visible.length; a++) {
      for (let b = a + 1; b < visible.length; b++) {
        stacking[visible[a]][visible[b]] += 1 / (b - a)
        stacking[visible[b]][visible[a]] += 1 / (b - a)
      }

      let gap = 0
      for (let b = a + 1; b < visible.length; b++) {
        const closeness = 1 - gap / (total * closeGapRatio)
        if (closeness <= 0) break
        weights[visible[a]][visible[b]] += closeness
        weights[visible[b]][visible[a]] += closeness
        gap += thickness[visible[b]]
      }
    }
  }

  const normalize = (matrix: number[][]) => matrix.map((row) => row.map((w) => w / Math.max(points, 1)))
  return { weights: normalize(weights), stacking: normalize(stacking) }
}

const assignAreaColors = (layers: [number, number][][], palette: string[]): string[] => {
  const n = layers.length
  if (n === 0 || palette.length === 0) return []

  const allRgb = palette.map(parseHex)
  const pairDistance = allRgb.map((a) => allRgb.map((b) => perceivedDistance(a, b)))
  let chosen: number[] = []
  let chosenScore = [-1, -1]
  const search = (start: number, picked: number[]) => {
    if (picked.length === n) {
      let nearest = Infinity
      let sum = 0
      for (let i = 0; i < picked.length; i++)
        for (let j = i + 1; j < picked.length; j++) {
          nearest = Math.min(nearest, pairDistance[picked[i]][picked[j]])
          sum += pairDistance[picked[i]][picked[j]]
        }
      if (nearest > chosenScore[0] || (nearest === chosenScore[0] && sum > chosenScore[1])) {
        chosen = [...picked]
        chosenScore = [nearest, sum]
      }
      return
    }
    for (let i = start; i <= palette.length - (n - picked.length); i++) search(i + 1, [...picked, i])
  }
  if (n < palette.length) search(0, [])
  const colors = n < palette.length ? chosen.map((index) => palette[index]) : palette
  const rgb = colors.map(parseHex)
  const similarity = rgb.map((a, i) =>
    rgb.map((b, j) => (i === j ? identicalPenalty : Math.max(0, 1 - perceivedDistance(a, b) / similarityRange))),
  )
  const { weights, stacking } = adjacencyWeights(layers)

  const assignment: number[] = Array(n).fill(-1)
  const usage: number[] = Array(colors.length).fill(0)

  const conflict = (node: number, color: number) => {
    let total = 0
    for (let other = 0; other < n; other++) {
      if (other === node || assignment[other] === -1) continue
      total += weights[node][other] * similarity[color][assignment[other]]
      if (color === assignment[other]) total += reusePenalty * stacking[node][other]
    }
    return total
  }

  const setColor = (node: number, color: number) => {
    if (assignment[node] !== -1) usage[assignment[node]] -= 1
    assignment[node] = color
    usage[color] += 1
  }

  const byConnection = [...Array(n).keys()].sort(
    (a, b) => weights[b].reduce((s, w) => s + w, 0) - weights[a].reduce((s, w) => s + w, 0) || a - b,
  )
  for (const node of byConnection) {
    const leastUsed = Math.min(...usage)
    let best = -1
    for (let color = 0; color < colors.length; color++) {
      if (usage[color] !== leastUsed) continue
      if (best === -1 || conflict(node, color) < conflict(node, best) - 1e-9) best = color
    }
    setColor(node, best)
  }

  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false
    for (const node of byConnection) {
      for (let color = 0; color < colors.length; color++) {
        if (usage[color] === 0 && conflict(node, color) < conflict(node, assignment[node]) - 1e-9) {
          setColor(node, color)
          changed = true
        }
      }
    }
    for (const u of byConnection) {
      for (const v of byConnection) {
        if (u >= v || assignment[u] === assignment[v]) continue
        const before = conflict(u, assignment[u]) + conflict(v, assignment[v])
        const [cu, cv] = [assignment[u], assignment[v]]
        assignment[u] = cv
        assignment[v] = cu
        if (conflict(u, cv) + conflict(v, cu) < before - 1e-9) changed = true
        else {
          assignment[u] = cu
          assignment[v] = cv
        }
      }
    }
    if (!changed) break
  }

  return assignment.map((color) => colors[color])
}

export default assignAreaColors
