import type { HeatPoint } from './types'

/**
 * Inverse-distance-weighted sampler over the scattered city samples.
 *
 * The API returns ~2,000 irregularly placed cells, not a grid, so drawing a
 * continuous surface means interpolating. Two things keep that honest:
 *
 *  1. The estimate is a weighted blend of the k nearest *real* samples — it
 *     never extrapolates a trend beyond the values that are actually there.
 *  2. Anywhere further than `maxDist` from a real sample is left transparent,
 *     so the surface stops where the data stops instead of inventing coverage.
 *
 * Points are indexed into a uniform grid (CSR layout over typed arrays) so a
 * per-pixel k-nearest query stays cheap enough to run inside map tiles.
 */
export class SurfaceSampler {
  private readonly xs: Float64Array
  private readonly ys: Float64Array
  private readonly vs: Float64Array
  private readonly cellStart: Int32Array
  private readonly cellItems: Int32Array

  private readonly cols: number
  private readonly rows: number
  private readonly cellSize: number
  private readonly minX: number
  private readonly minY: number

  /** Longitude degrees are narrower than latitude degrees away from the equator. */
  readonly lonScale: number
  /** Coverage radius, in latitude degrees. */
  readonly maxDist: number
  private readonly maxDist2: number
  /** Squared smoothing length that keeps the weighting non-singular. */
  private readonly smoothing2: number
  readonly neighbours: number

  private readonly nearD2: Float64Array
  private readonly nearVal: Float64Array

  /**
   * Distance to the closest real sample from the most recent `sample()` call,
   * in latitude degrees. The tile renderer reads it to fade the surface out
   * at the edge of coverage instead of cutting a hard line.
   */
  lastNearestDist = Infinity

  constructor(
    points: HeatPoint[],
    valueOf: (p: HeatPoint) => number,
    options: {
      spacingDeg?: number
      neighbours?: number
      coverageMultiplier?: number
      /** Smoothing length as a multiple of the sample spacing. */
      smoothingMultiplier?: number
    } = {},
  ) {
    const n = points.length
    // More neighbours in the blend means a broader, softer field. Twelve is
    // enough to span the ring of samples around any point at this density.
    this.neighbours = options.neighbours ?? 14
    this.nearD2 = new Float64Array(this.neighbours)
    this.nearVal = new Float64Array(this.neighbours)

    let latSum = 0
    for (const p of points) latSum += p.Latitude
    this.lonScale = Math.cos(((latSum / Math.max(1, n)) * Math.PI) / 180)

    this.xs = new Float64Array(n)
    this.ys = new Float64Array(n)
    this.vs = new Float64Array(n)

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (let i = 0; i < n; i++) {
      const p = points[i]
      const x = p.Longitude * this.lonScale
      const y = p.Latitude
      this.xs[i] = x
      this.ys[i] = y
      this.vs[i] = valueOf(p)
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }

    const spacing =
      options.spacingDeg ?? Math.sqrt(((maxX - minX) * (maxY - minY)) / Math.max(1, n))
    this.maxDist = spacing * (options.coverageMultiplier ?? 3.2)
    this.maxDist2 = this.maxDist * this.maxDist
    // Roughly one sample spacing: below that the surface starts showing the
    // individual samples again; far above it the field washes out flat.
    const smoothing = spacing * (options.smoothingMultiplier ?? 0.9)
    this.smoothing2 = smoothing * smoothing

    // Aim for a handful of points per cell: enough that a ring search
    // terminates quickly, few enough that each cell scan stays short.
    this.cellSize = Math.max(spacing * 2, 1e-6)
    this.minX = minX - this.cellSize
    this.minY = minY - this.cellSize
    this.cols = Math.max(1, Math.ceil((maxX - minX + 2 * this.cellSize) / this.cellSize))
    this.rows = Math.max(1, Math.ceil((maxY - minY + 2 * this.cellSize) / this.cellSize))

    // CSR build: count, prefix-sum, scatter.
    const cellCount = this.cols * this.rows
    const counts = new Int32Array(cellCount + 1)
    const cellOf = new Int32Array(n)
    for (let i = 0; i < n; i++) {
      const gx = Math.min(this.cols - 1, Math.max(0, ((this.xs[i] - this.minX) / this.cellSize) | 0))
      const gy = Math.min(this.rows - 1, Math.max(0, ((this.ys[i] - this.minY) / this.cellSize) | 0))
      const c = gy * this.cols + gx
      cellOf[i] = c
      counts[c + 1]++
    }
    for (let c = 0; c < cellCount; c++) counts[c + 1] += counts[c]
    this.cellStart = counts
    this.cellItems = new Int32Array(n)
    const cursor = Int32Array.from(counts.subarray(0, cellCount))
    for (let i = 0; i < n; i++) this.cellItems[cursor[cellOf[i]]++] = i
  }

  /**
   * @returns the interpolated value, or NaN when the location falls outside
   *          the sampled area.
   */
  sample(lat: number, lon: number): number {
    const x = lon * this.lonScale
    const y = lat
    const k = this.neighbours
    const nearD2 = this.nearD2
    const nearVal = this.nearVal
    let filled = 0
    let worst = Infinity

    const maxRing = Math.ceil(this.maxDist / this.cellSize) + 1
    const cx = Math.min(this.cols - 1, Math.max(0, ((x - this.minX) / this.cellSize) | 0))
    const cy = Math.min(this.rows - 1, Math.max(0, ((y - this.minY) / this.cellSize) | 0))

    for (let ring = 0; ring <= maxRing; ring++) {
      // A cell outside this ring can be no closer than (ring-1) cells away,
      // so once the k-th neighbour beats that, further rings cannot help.
      if (filled === k) {
        const reach = (ring - 1) * this.cellSize
        if (reach > 0 && reach * reach >= worst) break
      }

      const y0 = cy - ring
      const y1 = cy + ring
      const x0 = cx - ring
      const x1 = cx + ring

      for (let gy = y0; gy <= y1; gy++) {
        if (gy < 0 || gy >= this.rows) continue
        const edgeRow = gy === y0 || gy === y1
        const step = edgeRow || ring === 0 ? 1 : x1 - x0
        for (let gx = x0; gx <= x1; gx += step) {
          if (gx < 0 || gx >= this.cols) continue
          const c = gy * this.cols + gx
          const start = this.cellStart[c]
          const end = this.cellStart[c + 1]
          for (let s = start; s < end; s++) {
            const i = this.cellItems[s]
            const dx = this.xs[i] - x
            const dy = this.ys[i] - y
            const d2 = dx * dx + dy * dy

            if (filled < k) {
              // Insertion sort into a k-sized ascending buffer.
              let j = filled++
              while (j > 0 && nearD2[j - 1] > d2) {
                nearD2[j] = nearD2[j - 1]
                nearVal[j] = nearVal[j - 1]
                j--
              }
              nearD2[j] = d2
              nearVal[j] = this.vs[i]
              worst = nearD2[filled - 1]
            } else if (d2 < worst) {
              let j = k - 1
              while (j > 0 && nearD2[j - 1] > d2) {
                nearD2[j] = nearD2[j - 1]
                nearVal[j] = nearVal[j - 1]
                j--
              }
              nearD2[j] = d2
              nearVal[j] = this.vs[i]
              worst = nearD2[k - 1]
            }
          }
        }
      }
    }

    if (filled === 0) {
      this.lastNearestDist = Infinity
      return NaN
    }
    const nearest = Math.sqrt(nearD2[0])
    this.lastNearestDist = nearest
    if (nearest > this.maxDist) return NaN

    // Regularised (smoothed) inverse-distance weighting. Plain IDW uses
    // w = 1/d², which goes singular at each sample and paints a bull's-eye
    // there — the field reads as a scatter of hard circles rather than a
    // continuous surface. Adding a smoothing length to the denominator caps
    // the weight a single sample can reach, so neighbouring values blend
    // instead of each one dominating its own little disc. It stays a true
    // weighted mean of nearby observations, so the field is still bounded by
    // the real data.
    let num = 0
    let den = 0
    for (let i = 0; i < filled; i++) {
      if (nearD2[i] > this.maxDist2) break
      const w = 1 / (nearD2[i] + this.smoothing2)
      num += w * nearVal[i]
      den += w
    }
    return den === 0 ? NaN : num / den
  }

  /**
   * Index of the closest real sample to a location, or −1 when the location
   * is outside the sampled area. The map has no visible markers, so this is
   * how a click on the surface resolves to the observation behind it.
   */
  nearestIndex(lat: number, lon: number): number {
    const x = lon * this.lonScale
    const y = lat
    let best = Infinity
    let bestIndex = -1
    const maxRing = Math.ceil(this.maxDist / this.cellSize) + 1
    const cx = Math.min(this.cols - 1, Math.max(0, ((x - this.minX) / this.cellSize) | 0))
    const cy = Math.min(this.rows - 1, Math.max(0, ((y - this.minY) / this.cellSize) | 0))

    for (let ring = 0; ring <= maxRing; ring++) {
      const reach = (ring - 1) * this.cellSize
      if (bestIndex >= 0 && reach > 0 && reach * reach >= best) break
      for (let gy = cy - ring; gy <= cy + ring; gy++) {
        if (gy < 0 || gy >= this.rows) continue
        const edgeRow = gy === cy - ring || gy === cy + ring
        const step = edgeRow || ring === 0 ? 1 : 2 * ring
        for (let gx = cx - ring; gx <= cx + ring; gx += step) {
          if (gx < 0 || gx >= this.cols) continue
          const c = gy * this.cols + gx
          for (let s = this.cellStart[c]; s < this.cellStart[c + 1]; s++) {
            const i = this.cellItems[s]
            const dx = this.xs[i] - x
            const dy = this.ys[i] - y
            const d2 = dx * dx + dy * dy
            if (d2 < best) {
              best = d2
              bestIndex = i
            }
          }
        }
      }
    }
    return best <= this.maxDist2 ? bestIndex : -1
  }
}
