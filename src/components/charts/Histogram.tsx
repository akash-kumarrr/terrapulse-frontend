import { useState } from 'react'
import { chartHeatHex } from '../../lib/colors'
import { fmt } from '../../lib/format'
import type { HistogramBin } from '../../lib/stats'
import { useMeasure } from '../../hooks/useMeasure'

interface HistogramProps {
  bins: HistogramBin[]
  median: number
  /** Optional threshold rule, e.g. the 45 °C heat-risk line. */
  threshold?: { value: number; label: string }
  height?: number
}

const PAD = { top: 14, right: 14, bottom: 26, left: 40 }
const GAP = 2
const MAX_BAR = 24

/** A bar with a 4px rounded data-end and a square foot on the baseline. */
function barPath(x: number, y: number, w: number, h: number, r = 4): string {
  const rr = Math.max(0, Math.min(r, w / 2, h))
  return `M${x},${y + h} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + w - rr},${y} Q${x + w},${y} ${x + w},${y + rr} L${x + w},${y + h} Z`
}

/**
 * Distribution of surface temperature across the sampled city.
 * Bins are ordered buckets, so they take the ordinal segment of the same heat
 * ramp the map uses — the colour restates the x position rather than adding a
 * second variable.
 */
export function Histogram({ bins, median, threshold, height = 190 }: HistogramProps) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  const plotW = Math.max(0, width - PAD.left - PAD.right)
  const plotH = height - PAD.top - PAD.bottom
  const peak = bins.length ? Math.max(...bins.map((b) => b.count)) : 1
  const domainMin = bins[0]?.x0 ?? 0
  const domainMax = bins[bins.length - 1]?.x1 ?? 1
  const span = domainMax - domainMin || 1

  const xOf = (v: number) => PAD.left + ((v - domainMin) / span) * plotW
  const slot = bins.length ? plotW / bins.length : 0
  const barW = Math.max(1, Math.min(MAX_BAR, slot - GAP))

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => domainMin + t * span)
  const yTicks = [0, 0.5, 1].map((t) => Math.round(peak * t))
  const active = hover != null ? bins[hover] : null

  return (
    <div ref={ref} className="relative px-4 pb-3 pt-1">
      {width > 0 ? (
        <svg width={width - 32} height={height} role="img" aria-label="Distribution of surface temperature">
          {/* recessive hairline grid */}
          {yTicks.map((t) => {
            const y = PAD.top + plotH - (t / peak) * plotH
            return (
              <g key={t}>
                <line
                  x1={PAD.left}
                  x2={PAD.left + plotW}
                  y1={y}
                  y2={y}
                  stroke="#23262b"
                  strokeWidth={1}
                />
                <text x={PAD.left - 8} y={y + 3.5} textAnchor="end" fontSize={10} fill="#898781">
                  {t}
                </text>
              </g>
            )
          })}

          {bins.map((b, i) => {
            const h = Math.max(1, (b.count / peak) * plotH)
            const cx = xOf((b.x0 + b.x1) / 2)
            const t = (i + 0.5) / bins.length
            const dim = hover != null && hover !== i
            return (
              <path
                key={i}
                d={barPath(cx - barW / 2, PAD.top + plotH - h, barW, h)}
                fill={chartHeatHex(t)}
                opacity={dim ? 0.42 : 1}
              />
            )
          })}

          {/* Hit targets span the full slot and the full plot height, so a
              one-pixel bar in the tail is still comfortably hoverable. */}
          {bins.map((b, i) => (
            <rect
              key={`hit-${i}`}
              x={xOf(b.x0)}
              y={PAD.top}
              width={Math.max(slot, 6)}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}

          <line
            x1={PAD.left}
            x2={PAD.left + plotW}
            y1={PAD.top + plotH}
            y2={PAD.top + plotH}
            stroke="#383835"
            strokeWidth={1}
          />

          {/* selective direct labels: the median and the risk threshold */}
          <g pointerEvents="none">
            <line
              x1={xOf(median)}
              x2={xOf(median)}
              y1={PAD.top - 4}
              y2={PAD.top + plotH}
              stroke="#c3c2b7"
              strokeWidth={1}
            />
            <text x={xOf(median) + 4} y={PAD.top + 4} fontSize={10} fill="#c3c2b7">
              median {fmt(median, 1)}°
            </text>
          </g>

          {threshold && threshold.value > domainMin && threshold.value < domainMax ? (
            <g pointerEvents="none">
              <line
                x1={xOf(threshold.value)}
                x2={xOf(threshold.value)}
                y1={PAD.top - 4}
                y2={PAD.top + plotH}
                stroke="#d03b3b"
                strokeWidth={1}
              />
              <text
                x={xOf(threshold.value) - 4}
                y={PAD.top + 4}
                fontSize={10}
                fill="#d03b3b"
                textAnchor="end"
              >
                {threshold.label}
              </text>
            </g>
          ) : null}

          {ticks.map((t, i) => (
            <text
              key={i}
              x={xOf(t)}
              y={height - 8}
              fontSize={10}
              fill="#898781"
              textAnchor={i === 0 ? 'start' : i === ticks.length - 1 ? 'end' : 'middle'}
            >
              {fmt(t, 0)}°
            </text>
          ))}
        </svg>
      ) : null}

      {active ? (
        <div
          className="tnum pointer-events-none absolute z-10 -translate-x-1/2 rounded border border-line-strong bg-raised px-2 py-1 text-[11px] text-ink shadow-lg"
          style={{ left: xOf((active.x0 + active.x1) / 2), top: 0 }}
        >
          {fmt(active.x0, 1)}–{fmt(active.x1, 1)} °C
          <span className="ml-1.5 text-ink-3">
            {active.count} cells · {(active.share * 100).toFixed(1)}%
          </span>
        </div>
      ) : null}
    </div>
  )
}
