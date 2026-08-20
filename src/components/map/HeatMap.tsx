import L from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { fmt } from '../../lib/format'
import { MAP_LAYERS, type LayerId } from '../../lib/layers'
import { quantileSorted, type CityAnalysis, histogram } from '../../lib/stats'
import { SurfaceSampler } from '../../lib/surface'
import type { City, HeatPoint } from '../../lib/types'
import { Segmented, Switch } from '../ui/Controls'
import { ScaleLegend } from './ScaleLegend'
import { SurfaceLayer } from './SurfaceLayer'

const PANE_SURFACE = 'tp-surface'
const PANE_LABELS = 'tp-labels'

function PaneSetup() {
  const map = useMap()
  useEffect(() => {
    const make = (name: string, z: number) => {
      if (!map.getPane(name)) {
        const pane = map.createPane(name)
        pane.style.zIndex = String(z)
        // Nothing in these panes is interactive; clicks belong to the map.
        pane.style.pointerEvents = 'none'
      }
    }
    make(PANE_SURFACE, 350)
    make(PANE_LABELS, 450)
  }, [map])
  return null
}

function FitToData({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap()
  useEffect(() => {
    // The map mounts inside a grid that settles after the first paint, so
    // measure again before fitting or the field lands smaller than the pane.
    const fit = () => {
      map.invalidateSize({ animate: false })
      map.fitBounds(bounds, { padding: [16, 16], animate: false })
    }
    fit()
    const frame = requestAnimationFrame(fit)
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }))
    observer.observe(map.getContainer())
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [map, bounds])
  return null
}

/** Centres the map when a cell is chosen from a list rather than the map. */
function FlyTo({ target }: { target: { lat: number; lng: number; nonce: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (!target) return
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 12), { duration: 0.6 })
  }, [map, target])
  return null
}

/**
 * The surface carries no markers, so a click resolves to whichever observation
 * lies closest to the clicked position — the data stays inspectable without
 * anything being drawn on top of the field.
 */
function SelectOnMapClick({
  sampler,
  points,
  onSelect,
}: {
  sampler: SurfaceSampler
  points: HeatPoint[]
  onSelect: (point: HeatPoint | null) => void
}) {
  const map = useMap()
  useEffect(() => {
    const onClick = (e: L.LeafletMouseEvent) => {
      const index = sampler.nearestIndex(e.latlng.lat, e.latlng.lng)
      onSelect(index >= 0 ? points[index] : null)
    }
    map.on('click', onClick)
    return () => {
      map.off('click', onClick)
    }
  }, [map, sampler, points, onSelect])
  return null
}

function CursorReadout({ sampler, decimals, unit }: { sampler: SurfaceSampler; decimals: number; unit: string }) {
  const map = useMap()
  const [reading, setReading] = useState<{ lat: number; lng: number; value: number } | null>(null)

  useEffect(() => {
    const onMove = (e: L.LeafletMouseEvent) => {
      const value = sampler.sample(e.latlng.lat, e.latlng.lng)
      setReading({ lat: e.latlng.lat, lng: e.latlng.lng, value })
    }
    const onOut = () => setReading(null)
    map.on('mousemove', onMove)
    map.on('mouseout', onOut)
    return () => {
      map.off('mousemove', onMove)
      map.off('mouseout', onOut)
    }
  }, [map, sampler])

  if (!reading) return null

  return (
    <div className="tnum pointer-events-none absolute bottom-3 left-[54px] z-[600] rounded border border-line bg-panel/95 px-2.5 py-1.5 text-[11px] text-ink-2 backdrop-blur-sm">
      {Number.isFinite(reading.value) ? (
        <>
          <span className="text-ink">
            {fmt(reading.value, decimals)}
            {unit ? ` ${unit}` : ''}
          </span>
          <span className="text-ink-3"> interpolated</span>
        </>
      ) : (
        <span className="text-ink-3">outside sampled area</span>
      )}
      <span className="ml-2 text-ink-3">
        {reading.lat.toFixed(3)}, {reading.lng.toFixed(3)}
      </span>
    </div>
  )
}

interface HeatMapProps {
  points: HeatPoint[]
  analysis: CityAnalysis
  city: City
  selected: HeatPoint | null
  onSelect: (point: HeatPoint | null) => void
  layerId: LayerId
  onLayerChange: (id: LayerId) => void
  focus: { lat: number; lng: number; nonce: number } | null
}

export function HeatMap({
  points,
  analysis,
  city,
  selected,
  onSelect,
  layerId,
  onLayerChange,
  focus,
}: HeatMapProps) {
  const [showSurface, setShowSurface] = useState(true)
  // Translucent enough that roads, rivers and place names stay readable
  // underneath — the field should sit *on* the city, not replace it.
  const [opacity, setOpacity] = useState(0.6)

  const layer = MAP_LAYERS.find((l) => l.id === layerId) ?? MAP_LAYERS[0]

  // Clipping the scale at the 2nd/98th percentile keeps a handful of extreme
  // cells from flattening the colour range everywhere else.
  const domain = useMemo<[number, number]>(() => {
    const sorted = points.map((p) => p[layer.id]).sort((a, b) => a - b)
    const lo = quantileSorted(sorted, 0.02)
    const hi = quantileSorted(sorted, 0.98)
    return lo === hi ? [lo, lo + 1] : [lo, hi]
  }, [points, layer.id])

  const bins = useMemo(
    () => histogram(points.map((p) => p[layer.id]), 26),
    [points, layer.id],
  )

  const sampler = useMemo(
    () =>
      new SurfaceSampler(points, (p) => p[layer.id], {
        spacingDeg: analysis.spacingDeg,
      }),
    [points, layer.id, analysis.spacingDeg],
  )

  const bounds = useMemo<L.LatLngBoundsExpression>(
    () => [
      [analysis.bounds.minLat, analysis.bounds.minLon],
      [analysis.bounds.maxLat, analysis.bounds.maxLon],
    ],
    [analysis.bounds],
  )

  return (
    <div className="relative h-full w-full overflow-hidden bg-base">
      <MapContainer
        center={city.center}
        zoom={10}
        minZoom={8}
        maxZoom={15}
        zoomControl={false}
        // Fractional zoom: with integer steps only, fitting the city's bounds
        // can leave the field filling barely half the pane.
        zoomSnap={0.25}
        zoomDelta={0.5}
        wheelPxPerZoomLevel={90}
        className="h-full w-full"
      >
        <PaneSetup />
        <FitToData bounds={bounds} />
        <FlyTo target={focus} />
        <SelectOnMapClick sampler={sampler} points={points} onSelect={onSelect} />

        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a> &middot; LST from Google Earth Engine'
          subdomains="abcd"
          maxZoom={19}
        />

        {showSurface ? (
          <SurfaceLayer
            sampler={sampler}
            lut={layer.lut}
            domain={domain}
            opacity={opacity}
            pane={PANE_SURFACE}
          />
        ) : null}

        {/* Place names ride above the surface so the map stays navigable. */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          pane={PANE_LABELS}
          maxZoom={19}
        />

        <CursorReadout sampler={sampler} decimals={layer.decimals} unit={layer.unit} />
        <ZoomControl />
      </MapContainer>

      {/* ── floating chrome ─────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[600] flex items-start justify-between gap-3 p-3">
        <div className="pointer-events-auto flex flex-col gap-2">
          <Segmented
            ariaLabel="Map layer"
            size="sm"
            value={layerId}
            onChange={onLayerChange}
            options={MAP_LAYERS.map((l) => ({
              value: l.id,
              label: l.caption,
              title: l.note,
            }))}
          />
          <div className="flex items-center gap-3 rounded border border-line bg-panel/95 px-2.5 py-1.5 backdrop-blur-sm">
            <Switch checked={showSurface} onChange={setShowSurface} label="Heat surface" />
            <span className="h-3 w-px bg-line" />
            <label className="flex items-center gap-2 text-[12px] text-ink-2">
              <span className="text-ink-3">Opacity</span>
              <input
                type="range"
                className="tp-range h-4 w-[84px] cursor-pointer appearance-none bg-transparent"
                min={0.2}
                max={1}
                step={0.05}
                value={opacity}
                disabled={!showSurface}
                aria-label="Heat surface opacity"
                onChange={(e) => setOpacity(Number(e.target.value))}
                style={{
                  background: `linear-gradient(to right, #3987e5 ${
                    ((opacity - 0.2) / 0.8) * 100
                  }%, #23262b ${((opacity - 0.2) / 0.8) * 100}%)`,
                  backgroundSize: '100% 3px',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  borderRadius: 999,
                }}
              />
              <span className="tnum w-[30px] text-right text-ink">
                {Math.round(opacity * 100)}%
              </span>
            </label>
          </div>
        </div>

        <div className="pointer-events-auto max-w-[300px] rounded border border-line bg-panel/95 px-3 py-2 text-[11px] leading-relaxed text-ink-3 backdrop-blur-sm">
          {layer.note}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 right-3 z-[600]">
        <div className="pointer-events-auto">
          <ScaleLegend
            layer={layer}
            domain={domain}
            bins={bins}
            marker={selected ? selected[layer.id] : null}
          />
          <p className="mt-1 text-right text-[10px] text-ink-3">
            Scale clipped at the 2nd–98th percentile
          </p>
        </div>
      </div>
    </div>
  )
}

function ZoomControl() {
  const map = useMap()
  useEffect(() => {
    const control = L.control.zoom({ position: 'bottomleft' })
    control.addTo(map)
    return () => {
      control.remove()
    }
  }, [map])
  return null
}
