import { FEATURES, FEATURE_BY_KEY } from './features'
import type { FeatureKey, HeatPoint } from './types'

export interface Bounds {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
}

export interface Summary {
  min: number
  max: number
  mean: number
  median: number
  p05: number
  p95: number
  std: number
}

export interface Correlation {
  key: FeatureKey
  /** Pearson r against LST. */
  r: number
  /** Mean LST of the coolest vs hottest decile of this variable. */
  deltaLst: number
}

export interface HistogramBin {
  x0: number
  x1: number
  count: number
  share: number
}

export interface BinnedRelation {
  x0: number
  x1: number
  mid: number
  meanLst: number
  count: number
}

export interface ZoneStat {
  id: 'cool' | 'moderate' | 'hot'
  label: string
  count: number
  meanLst: number
  lowerLst: number
  upperLst: number
  features: Record<FeatureKey, number>
}

export interface CityAnalysis {
  n: number
  lst: Summary
  bounds: Bounds
  /** Mean of the hottest decile minus mean of the coolest decile. */
  uhiIntensity: number
  /** Share of samples at or above 45 °C. */
  severeShare: number
  sortedLst: number[]
  correlations: Correlation[]
  histogram: HistogramBin[]
  zones: ZoneStat[]
  /** Distribution of every input variable — drives slider ranges and deltas. */
  featureStats: Record<FeatureKey, Summary>
  hottest: HeatPoint[]
  coolest: HeatPoint[]
  /** Typical distance between neighbouring samples, in degrees. */
  spacingDeg: number
}

/* ── primitives ───────────────────────────────────────────── */

export function mean(values: number[]): number {
  if (values.length === 0) return NaN
  let sum = 0
  for (const v of values) sum += v
  return sum / values.length
}

/** Linear-interpolated quantile over an already-sorted array. */
export function quantileSorted(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN
  if (sorted.length === 1) return sorted[0]
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

export function stdev(values: number[], avg = mean(values)): number {
  if (values.length < 2) return 0
  let acc = 0
  for (const v of values) acc += (v - avg) ** 2
  return Math.sqrt(acc / (values.length - 1))
}

export function summarise(values: number[]): Summary {
  const sorted = [...values].sort((a, b) => a - b)
  const avg = mean(sorted)
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: avg,
    median: quantileSorted(sorted, 0.5),
    p05: quantileSorted(sorted, 0.05),
    p95: quantileSorted(sorted, 0.95),
    std: stdev(sorted, avg),
  }
}

export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length)
  if (n < 3) return 0
  const mx = mean(xs)
  const my = mean(ys)
  let num = 0
  let dx = 0
  let dy = 0
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx
    const b = ys[i] - my
    num += a * b
    dx += a * a
    dy += b * b
  }
  const den = Math.sqrt(dx * dy)
  return den === 0 ? 0 : num / den
}

/** Where a value sits in the distribution, 0–1. */
export function percentileRank(sorted: number[], value: number): number {
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid] < value) lo = mid + 1
    else hi = mid
  }
  return sorted.length ? lo / sorted.length : 0
}

export function histogram(values: number[], binCount = 24): HistogramBin[] {
  if (values.length === 0) return []
  let min = Infinity
  let max = -Infinity
  for (const v of values) {
    if (v < min) min = v
    if (v > max) max = v
  }
  if (min === max) max = min + 1
  const width = (max - min) / binCount
  const counts = new Array(binCount).fill(0)
  for (const v of values) {
    const i = Math.min(binCount - 1, Math.floor((v - min) / width))
    counts[i]++
  }
  return counts.map((count, i) => ({
    x0: min + i * width,
    x1: min + (i + 1) * width,
    count,
    share: count / values.length,
  }))
}

/**
 * Mean LST inside equal-count buckets of one variable. Equal-count (rather
 * than equal-width) keeps every point on the resulting line backed by the
 * same sample size, so a sparse tail cannot swing the shape.
 */
export function binnedRelation(points: HeatPoint[], key: FeatureKey, bins = 10): BinnedRelation[] {
  const rows = points
    .map((p) => ({ x: p[key], y: p.LST_Celsius }))
    .filter((r) => Number.isFinite(r.x) && Number.isFinite(r.y))
    .sort((a, b) => a.x - b.x)
  if (rows.length < bins) return []

  const out: BinnedRelation[] = []
  const size = rows.length / bins
  for (let i = 0; i < bins; i++) {
    const slice = rows.slice(Math.floor(i * size), Math.floor((i + 1) * size))
    if (slice.length === 0) continue
    out.push({
      x0: slice[0].x,
      x1: slice[slice.length - 1].x,
      mid: mean(slice.map((r) => r.x)),
      meanLst: mean(slice.map((r) => r.y)),
      count: slice.length,
    })
  }
  return out
}

/** Mean LST of the top decile of `key` minus that of the bottom decile. */
function decileDelta(points: HeatPoint[], key: FeatureKey): number {
  const rows = [...points].sort((a, b) => a[key] - b[key])
  const cut = Math.max(1, Math.round(rows.length / 10))
  const low = mean(rows.slice(0, cut).map((p) => p.LST_Celsius))
  const high = mean(rows.slice(-cut).map((p) => p.LST_Celsius))
  return high - low
}

function zoneFeatures(points: HeatPoint[]): Record<FeatureKey, number> {
  const out = {} as Record<FeatureKey, number>
  for (const f of FEATURES) out[f.key] = mean(points.map((p) => p[f.key]))
  return out
}

export function analyse(points: HeatPoint[]): CityAnalysis {
  const lstValues = points.map((p) => p.LST_Celsius)
  const sortedLst = [...lstValues].sort((a, b) => a - b)
  const lst = summarise(lstValues)

  const bounds = points.reduce<Bounds>(
    (acc, p) => ({
      minLat: Math.min(acc.minLat, p.Latitude),
      maxLat: Math.max(acc.maxLat, p.Latitude),
      minLon: Math.min(acc.minLon, p.Longitude),
      maxLon: Math.max(acc.maxLon, p.Longitude),
    }),
    { minLat: Infinity, maxLat: -Infinity, minLon: Infinity, maxLon: -Infinity },
  )

  const decile = Math.max(1, Math.round(points.length / 10))
  const byLst = [...points].sort((a, b) => a.LST_Celsius - b.LST_Celsius)
  const uhiIntensity =
    mean(byLst.slice(-decile).map((p) => p.LST_Celsius)) -
    mean(byLst.slice(0, decile).map((p) => p.LST_Celsius))

  const correlations: Correlation[] = FEATURES.filter((f) => f.group !== 'location')
    .map((f) => ({
      key: f.key,
      r: pearson(
        points.map((p) => p[f.key]),
        lstValues,
      ),
      deltaLst: decileDelta(points, f.key),
    }))
    .sort((a, b) => Math.abs(b.r) - Math.abs(a.r))

  const third = Math.floor(points.length / 3)
  const slices: [ZoneStat['id'], string, HeatPoint[]][] = [
    ['cool', 'Coolest third', byLst.slice(0, third)],
    ['moderate', 'Middle third', byLst.slice(third, third * 2)],
    ['hot', 'Hottest third', byLst.slice(third * 2)],
  ]
  const zones: ZoneStat[] = slices.map(([id, label, slice]) => ({
    id,
    label,
    count: slice.length,
    meanLst: mean(slice.map((p) => p.LST_Celsius)),
    lowerLst: slice[0]?.LST_Celsius ?? NaN,
    upperLst: slice[slice.length - 1]?.LST_Celsius ?? NaN,
    features: zoneFeatures(slice),
  }))

  // Sample spacing from area per point — used to size the interpolation
  // radius so the surface never invents coverage the data does not have.
  const latSpan = bounds.maxLat - bounds.minLat
  const lonSpan = (bounds.maxLon - bounds.minLon) * Math.cos((bounds.minLat * Math.PI) / 180)
  const spacingDeg = Math.sqrt((latSpan * lonSpan) / Math.max(1, points.length))

  const featureStats = Object.fromEntries(
    FEATURES.map((f) => [f.key, summarise(points.map((p) => p[f.key]))]),
  ) as Record<FeatureKey, Summary>

  return {
    n: points.length,
    lst,
    bounds,
    uhiIntensity,
    featureStats,
    severeShare: lstValues.filter((v) => v >= 45).length / points.length,
    sortedLst,
    correlations,
    histogram: histogram(lstValues, 24),
    zones,
    hottest: byLst.slice(-8).reverse(),
    coolest: byLst.slice(0, 8),
    spacingDeg,
  }
}

/* ── narrative ────────────────────────────────────────────── */

export interface Finding {
  id: string
  headline: string
  body: string
  tone: 'warming' | 'cooling' | 'neutral'
}

/**
 * Turns the numbers above into sentences. Every claim here is read straight
 * off the analysis — nothing is asserted that the data does not show.
 */
export function explain(analysis: CityAnalysis, cityName: string): Finding[] {
  const findings: Finding[] = []
  const { correlations, zones, lst, uhiIntensity } = analysis
  const hot = zones.find((z) => z.id === 'hot')
  const cool = zones.find((z) => z.id === 'cool')

  // A water index near or above zero in the coolest third means the scene
  // includes open water, which sits far below any land surface and widens the
  // spread beyond the built heat-island effect.
  const hasOpenWater = (cool?.features.NDWI ?? -1) > -0.05

  findings.push({
    id: 'range',
    headline: `${uhiIntensity.toFixed(1)} °C separates the hottest and coolest tenth of ${cityName}`,
    body:
      `Surface temperature across the ${analysis.n.toLocaleString()} sampled cells runs from ${lst.min.toFixed(1)} °C to ${lst.max.toFixed(1)} °C, averaging ${lst.mean.toFixed(1)} °C — one city, one satellite overpass, one sky. The only thing that differs between those cells is what covers the ground.` +
      (hasOpenWater
        ? ` Note that the coolest cells here include open water, which sits well below any land surface and widens the spread beyond the built heat-island effect alone.`
        : ''),
    tone: 'neutral',
  })

  // Net radiation and the heat fluxes are derived from the same thermal
  // imagery as LST itself, so correlating them with LST is partly
  // definitional. Only independently measured variables get to headline.
  const independent = correlations.filter((c) => {
    const g = FEATURE_BY_KEY[c.key].group
    return g === 'land-cover' || g === 'weather'
  })

  const agrees = (c: Correlation) => {
    const expected = FEATURE_BY_KEY[c.key].expected
    if (expected === 'neutral') return true
    return (c.r > 0 ? 'warming' : 'cooling') === expected
  }

  const top = independent.find(agrees) ?? independent[0] ?? correlations[0]
  if (top) {
    const meta = FEATURE_BY_KEY[top.key]
    const dir = top.r > 0 ? 'rises' : 'falls'
    findings.push({
      id: 'top-driver',
      headline: `${meta.label} is the strongest driver (r = ${top.r >= 0 ? '+' : '−'}${Math.abs(top.r).toFixed(2)})`,
      body: `As ${meta.short} increases, surface temperature ${dir} — the top tenth of cells by ${meta.short} sits ${Math.abs(top.deltaLst).toFixed(1)} °C ${top.deltaLst > 0 ? 'above' : 'below'} the bottom tenth. ${meta.why}`,
      tone: top.r > 0 ? 'warming' : 'cooling',
    })
  }

  // A variable pointing the opposite way to its physics is worth reporting on
  // its own terms — it is almost always standing in for something else.
  const contrarian = independent.find((c) => c !== top && !agrees(c) && Math.abs(c.r) > 0.15)
  if (contrarian) {
    const meta = FEATURE_BY_KEY[contrarian.key]
    const observed = contrarian.r > 0 ? 'hotter' : 'cooler'
    const predicted = meta.expected === 'cooling' ? 'cooler' : 'hotter'
    findings.push({
      id: 'contrarian',
      headline: `${meta.label} runs against the physics here (r = ${contrarian.r >= 0 ? '+' : '−'}${Math.abs(contrarian.r).toFixed(2)})`,
      body: `On its own, a higher ${meta.short} should go with ${predicted} ground. Across ${cityName} it goes with ${observed} ground instead, which means it is standing in for something else rather than acting on its own. ${meta.inverseHint}`,
      tone: 'neutral',
    })
  }

  if (hot && cool) {
    // Only claim a greenness advantage when the coolest third actually has
    // one; where it does not, the contrarian finding above already covers it.
    const ndviGap = cool.features.NDVI - hot.features.NDVI
    if (Number.isFinite(ndviGap) && ndviGap > 0.02) {
      const relative = (ndviGap / Math.max(hot.features.NDVI, 1e-6)) * 100
      findings.push({
        id: 'green-gap',
        headline:
          relative > 5 && relative < 1000
            ? `The coolest third carries ${relative.toFixed(0)}% more greenness`
            : 'The coolest third is the greener third',
        body: `Mean NDVI is ${cool.features.NDVI.toFixed(2)} in the coolest third against ${hot.features.NDVI.toFixed(2)} in the hottest — alongside a ${(hot.meanLst - cool.meanLst).toFixed(1)} °C difference in mean surface temperature between the two.`,
        tone: 'cooling',
      })
    }

    const buildGap = hot.features.Building_Density - cool.features.Building_Density
    if (Number.isFinite(buildGap) && buildGap > 0) {
      // A ratio is only meaningful when the denominator is substantial;
      // otherwise state the two numbers and let them speak.
      const ratio = hot.features.Building_Density / cool.features.Building_Density
      const useRatio = cool.features.Building_Density >= 50 && ratio < 25
      findings.push({
        id: 'built-gap',
        headline: useRatio
          ? `Built-up density is ${ratio.toFixed(1)}× higher where it is hottest`
          : 'The hottest third is the densely built third',
        body: `The hottest third averages a building-density index of ${Math.round(hot.features.Building_Density).toLocaleString()} against ${Math.round(cool.features.Building_Density).toLocaleString()} in the coolest third. Dense masonry absorbs through the day and releases through the night.`,
        tone: 'warming',
      })
    }
  }

  if (analysis.severeShare > 0.01) {
    findings.push({
      id: 'severe',
      headline: `${(analysis.severeShare * 100).toFixed(1)}% of the city is at or above 45 °C`,
      body: `${Math.round(analysis.severeShare * analysis.n).toLocaleString()} of ${analysis.n.toLocaleString()} sampled cells cross 45 °C surface temperature — the band where asphalt and rooftops become a health risk for people working outdoors.`,
      tone: 'warming',
    })
  }

  return findings
}
