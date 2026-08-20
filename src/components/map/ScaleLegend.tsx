import { fmt } from '../../lib/format'
import type { MapLayerDef } from '../../lib/layers'
import type { HistogramBin } from '../../lib/stats'

interface ScaleLegendProps {
  layer: MapLayerDef
  domain: [number, number]
  /** Distribution of the mapped variable, drawn above the ramp. */
  bins?: HistogramBin[]
  /** Marks where a selected cell sits on the scale. */
  marker?: number | null
}

/**
 * The scale legend the semantic-heat ramp is required to ship with. The
 * density strip above it answers the question the ramp alone cannot: how much
 * of the city actually sits at each temperature.
 */
export function ScaleLegend({ layer, domain, bins, marker }: ScaleLegendProps) {
  const [min, max] = domain
  const span = max - min || 1
  const gradient = `linear-gradient(to right, ${layer.stops.join(', ')})`
  const peak = bins?.length ? Math.max(...bins.map((b) => b.count)) : 0
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => min + t * span)
  const markerPct =
    marker != null && Number.isFinite(marker)
      ? Math.max(0, Math.min(100, ((marker - min) / span) * 100))
      : null

  return (
    <div className="w-[260px] rounded-md border border-line bg-panel/95 p-3 backdrop-blur-sm">
      <div className="flex items-baseline justify-between gap-2">
        <p className="eyebrow">{layer.caption}</p>
        {layer.unit ? <span className="text-[10.5px] text-ink-3">{layer.unit}</span> : null}
      </div>

      {bins && bins.length > 0 ? (
        <div className="mt-2 flex h-6 items-end gap-px" aria-hidden>
          {bins.map((b, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-[1px] bg-[#3a3f46]"
              style={{ height: `${Math.max(2, (b.count / peak) * 100)}%` }}
            />
          ))}
        </div>
      ) : null}

      <div className="relative mt-1">
        <div className="h-2 rounded-[2px]" style={{ background: gradient }} />
        {markerPct != null ? (
          <span
            className="absolute -top-[3px] h-[14px] w-[2px] -translate-x-1/2 rounded-full bg-ink shadow-[0_0_0_1px_#0a0b0d]"
            style={{ left: `${markerPct}%` }}
            aria-hidden
          />
        ) : null}
      </div>

      <div className="tnum mt-1.5 flex justify-between text-[10px] text-ink-3">
        {ticks.map((t, i) => (
          <span key={i}>{fmt(t, layer.decimals)}</span>
        ))}
      </div>
    </div>
  )
}
