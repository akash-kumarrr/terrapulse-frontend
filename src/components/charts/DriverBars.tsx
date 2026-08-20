import { divergingHex } from '../../lib/colors'
import { FEATURE_BY_KEY } from '../../lib/features'
import { fmt } from '../../lib/format'
import type { Correlation } from '../../lib/stats'
import type { FeatureKey } from '../../lib/types'
import { useMeasure } from '../../hooks/useMeasure'

interface DriverBarsProps {
  correlations: Correlation[]
  selected: FeatureKey
  onSelect: (key: FeatureKey) => void
}

const ROW_H = 26
const BAR_H = 11
const LABEL_W = 96
const VALUE_W = 46

/** Horizontal bar with the rounded data-end on the outer side only. */
function barPath(x0: number, x1: number, y: number, h: number, r = 4): string {
  const w = Math.abs(x1 - x0)
  const rr = Math.max(0, Math.min(r, w, h / 2))
  if (x1 >= x0) {
    return `M${x0},${y} L${x1 - rr},${y} Q${x1},${y} ${x1},${y + rr} L${x1},${y + h - rr} Q${x1},${y + h} ${x1 - rr},${y + h} L${x0},${y + h} Z`
  }
  return `M${x0},${y} L${x1 + rr},${y} Q${x1},${y} ${x1},${y + rr} L${x1},${y + h - rr} Q${x1},${y + h} ${x1 + rr},${y + h} L${x0},${y + h} Z`
}

/**
 * Pearson correlation of each variable against surface temperature.
 * Polarity is the story — which side of zero a variable falls on — so this is
 * a diverging encoding: two opposing hues with a neutral midpoint at r = 0.
 */
export function DriverBars({ correlations, selected, onSelect }: DriverBarsProps) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const inner = Math.max(0, width - 32)
  const plotW = Math.max(0, inner - LABEL_W - VALUE_W)
  const centre = LABEL_W + plotW / 2
  const height = correlations.length * ROW_H + 26

  const maxAbs = Math.max(0.2, ...correlations.map((c) => Math.abs(c.r)))
  const scale = (r: number) => (r / maxAbs) * (plotW / 2 - 6)

  return (
    <div ref={ref} className="px-4 pb-2 pt-1">
      {width > 0 ? (
        <svg width={inner} height={height} role="img" aria-label="Correlation of each variable with surface temperature">
          {/* zero baseline — the neutral midpoint of the diverging scale */}
          <line
            x1={centre}
            x2={centre}
            y1={4}
            y2={correlations.length * ROW_H + 4}
            stroke="#383835"
            strokeWidth={1}
          />

          {correlations.map((c, i) => {
            const meta = FEATURE_BY_KEY[c.key]
            const y = i * ROW_H + 4
            const barY = y + (ROW_H - BAR_H) / 2
            const end = centre + scale(c.r)
            const isSelected = c.key === selected
            return (
              <g
                key={c.key}
                className="cursor-pointer"
                onClick={() => onSelect(c.key)}
                role="button"
                aria-label={`${meta.label}, correlation ${c.r.toFixed(2)}`}
              >
                <rect
                  x={0}
                  y={y}
                  width={inner}
                  height={ROW_H}
                  fill={isSelected ? '#191c21' : 'transparent'}
                  rx={3}
                />
                <text
                  x={0}
                  y={y + ROW_H / 2 + 3.5}
                  fontSize={11.5}
                  fill={isSelected ? '#f1f2ef' : '#c3c2b7'}
                >
                  {meta.short}
                </text>
                <path
                  d={barPath(centre, end, barY, BAR_H)}
                  fill={divergingHex(c.r, maxAbs)}
                  opacity={isSelected ? 1 : 0.9}
                />
                <text
                  x={inner}
                  y={y + ROW_H / 2 + 3.5}
                  fontSize={11}
                  fill="#c3c2b7"
                  textAnchor="end"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {c.r >= 0 ? '+' : '−'}
                  {fmt(Math.abs(c.r), 2)}
                </text>
              </g>
            )
          })}

          <text x={centre - 8} y={height - 6} fontSize={10} fill="#898781" textAnchor="end">
            cools
          </text>
          <text x={centre + 8} y={height - 6} fontSize={10} fill="#898781">
            warms
          </text>
        </svg>
      ) : null}

      {/* legend — identity is never left to colour alone */}
      <div className="mt-1 flex items-center gap-4 border-t border-line pt-2 text-[10.5px] text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-[2px]" style={{ background: divergingHex(-1) }} />
          Negative r — higher values coincide with cooler ground
        </span>
      </div>
      <div className="mt-1 flex items-center gap-4 text-[10.5px] text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-[2px]" style={{ background: divergingHex(1) }} />
          Positive r — higher values coincide with hotter ground
        </span>
      </div>
    </div>
  )
}
