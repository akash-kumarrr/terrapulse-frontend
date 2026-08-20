import L from 'leaflet'
import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import type { SurfaceSampler } from '../../lib/surface'

interface SurfaceOptions extends L.GridLayerOptions {
  sampler: SurfaceSampler
  lut: Uint8ClampedArray
  domainMin: number
  domainSpan: number
  /** Distance in screen pixels between interpolation samples. */
  step: number
}

/**
 * Draws the interpolated field into map tiles.
 *
 * Each tile is sampled on a coarse lattice and scaled up with the canvas's own
 * bilinear filter — cheap, and the smoothing is honest because the underlying
 * field is already continuous. The lattice is computed with a one-sample
 * border on every side and the scale-up is offset by exactly that border, so
 * neighbouring tiles blend instead of showing seams.
 */
const InterpolatedGridLayer = L.GridLayer.extend({
  createTile(this: L.GridLayer & { options: SurfaceOptions; _map: L.Map }, coords: L.Coords) {
    const tile = document.createElement('canvas')
    const size = this.getTileSize()
    tile.width = size.x
    tile.height = size.y

    const ctx = tile.getContext('2d')
    if (!ctx) return tile

    const { sampler, lut, domainMin, domainSpan, step } = this.options
    const map = this._map
    const origin = coords.scaleBy(size)

    const cols = Math.ceil(size.x / step)
    const rows = Math.ceil(size.y / step)

    // Longitude is linear in screen x for Web Mercator and latitude is not, so
    // unproject once per row and once per column rather than once per sample.
    const lons = new Float64Array(cols + 2)
    for (let i = -1; i <= cols; i++) {
      const px = origin.x + i * step + step / 2
      lons[i + 1] = map.unproject(L.point(px, origin.y), coords.z).lng
    }
    const lats = new Float64Array(rows + 2)
    for (let j = -1; j <= rows; j++) {
      const py = origin.y + j * step + step / 2
      lats[j + 1] = map.unproject(L.point(origin.x, py), coords.z).lat
    }

    const w = cols + 2
    const h = rows + 2
    const field = new ImageData(w, h)
    const data = field.data
    // A long fade means the field dissolves into the basemap at the edge of
    // coverage rather than ending on a hard rim.
    const fadeStart = sampler.maxDist * 0.45
    const fadeSpan = sampler.maxDist - fadeStart

    let painted = false
    for (let j = 0; j < h; j++) {
      const lat = lats[j]
      for (let i = 0; i < w; i++) {
        const value = sampler.sample(lat, lons[i])
        const o = (j * w + i) * 4
        if (!Number.isFinite(value)) continue

        let t = (value - domainMin) / domainSpan
        t = t < 0 ? 0 : t > 1 ? 1 : t
        const c = Math.round(t * 255) * 3
        data[o] = lut[c]
        data[o + 1] = lut[c + 1]
        data[o + 2] = lut[c + 2]

        // Fade out where the nearest real sample gets far away, so the
        // surface stops at the edge of the evidence instead of cutting a line.
        const near = sampler.lastNearestDist
        const fade = near <= fadeStart ? 1 : 1 - (near - fadeStart) / fadeSpan
        data[o + 3] = Math.round(255 * (fade < 0 ? 0 : fade))
        painted = true
      }
    }

    if (!painted) return tile

    const scratch = document.createElement('canvas')
    scratch.width = w
    scratch.height = h
    scratch.getContext('2d')?.putImageData(field, 0, 0)

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    const inset = 1 - 0.5 / step
    ctx.drawImage(scratch, inset, inset, cols, rows, 0, 0, size.x, size.y)

    return tile
  },
})

interface SurfaceLayerProps {
  sampler: SurfaceSampler
  lut: Uint8ClampedArray
  domain: [number, number]
  opacity: number
  pane: string
  step?: number
}

export function SurfaceLayer({
  sampler,
  lut,
  domain,
  opacity,
  pane,
  step = 3,
}: SurfaceLayerProps) {
  const map = useMap()
  const layerRef = useRef<L.GridLayer | null>(null)
  const [domainMin, domainMax] = domain

  // Rebuilding tiles is the expensive part, so it happens only when the field
  // or its scale actually changes.
  useEffect(() => {
    const layer = new (InterpolatedGridLayer as unknown as new (o: SurfaceOptions) => L.GridLayer)({
      sampler,
      lut,
      domainMin,
      domainSpan: domainMax - domainMin || 1,
      step,
      pane,
      keepBuffer: 1,
      updateWhenZooming: false,
      className: 'lst-surface',
    })
    layer.addTo(map)
    layerRef.current = layer
    return () => {
      layer.remove()
      layerRef.current = null
    }
  }, [map, sampler, lut, domainMin, domainMax, step, pane])

  // Opacity is a cheap CSS change — never a reason to re-render tiles.
  useEffect(() => {
    layerRef.current?.setOpacity(opacity)
  }, [opacity])

  return null
}
