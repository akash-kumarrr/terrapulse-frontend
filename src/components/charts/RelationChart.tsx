import { useState } from 'react'
import { SERIES } from '../../lib/colors'
import { fmt } from '../../lib/format'
import type { FeatureMeta } from '../../lib/features'
import type { BinnedRelation } from '../../lib/stats'
import { useMeasure } from '../../hooks/useMeasure'

interface RelationChartProps {
  data: BinnedRelation[]
  feature: FeatureMeta
  height?: number
}

const PAD = { top: 16, right: 16, bottom: 28, left: 44 }

/**
 * Mean surface temperature across equal-count buckets of one variable.
 * Equal-count buckets mean every marker rests on the same number of samples,
 * so a thin tail cannot bend the line. One series, so no legend box.
 */
export function RelationChart({ data, feature, height = 200 }: RelationChartProps) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  const inner = Math.max(0, width - 32)
  const plotW = Math.max(0, inner - PAD.left - PAD.right)
  const plotH = height - PAD.top - PAD.bottom

  if (data.length === 0) {
    return <div ref={ref} className="px-4 py-8 text-center text-[12px] text-ink-3">Not enough samples to bucket.</div>
  }

  const xs = data.map((d) => d.mid)
  const ys = data.map((d) => d.meanLst)
  const xMin = Math.min(...xs)
  const xMax = Math.max(...xs)
  const yMin = Math.min(...ys)
  const yMax = Math.max(...ys)
  const yPad = (yMax - yMin) * 0.18 || 1
  const y0 = yMin - yPad
  const y1 = yMax + yPad

  const xOf = (v: number) => PAD.left + ((v - xMin) / (xMax - xMin || 1)) * plotW
  const yOf = (v: number) => PAD.top + plotH - ((v - y0) / (y1 - y0 || 1)) * plotH

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xOf(d.mid)},${yOf(d.meanLst)}`).join(' ')
  const area = `${line} L${xOf(data[data.length - 1].mid)},${PAD.top + plotH} L${xOf(data[0].mid)},${PAD.top + plotH} Z`

  const yTicks = [y0 + (y1 - y0) * 0.15, (y0 + y1) / 2, y1 - (y1 - y0) * 0.15]
  const xTicks = [xMin, (xMin + xMax) / 2, xMax]
  const active = hover != null ? data[hover] : null
  const delta = ys[ys.length - 1] - ys[0]

  return (
    <div ref={ref} className="relative px-4 pb-3 pt-1">
      {width > 0 ? (
        <svg
          width={inner}
          height={height}
          role="img"
          aria-label={`Mean surface temperature by ${feature.label}`}
          onMouseLeave={() => setHover(null)}
        >
          {yTicks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={yOf(t)}
                y2={yOf(t)}
                stroke="#23262b"
                strokeWidth={1}
              />
              <text x={PAD.left - 8} y={yOf(t) + 3.5} textAnchor="end" fontSize={10} fill="#898781">
                {fmt(t, 1)}
              </text>
            </g>
          ))}

          {/* a wash, never a saturated block */}
          <path d={area} fill={SERIES.s1} opacity={0.1} />
          <path
            d={line}
            fill="none"
            stroke={SERIES.s1}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {data.map((d, i) => (
            <circle
              key={i}
              cx={xOf(d.mid)}
              cy={yOf(d.meanLst)}
              r={hover === i ? 5 : 4}
              fill={SERIES.s1}
              stroke="#121417"
              strokeWidth={2}
            />
          ))}

          {active ? (
            <line
              x1={xOf(active.mid)}
              x2={xOf(active.mid)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="#383835"
              strokeWidth={1}
              pointerEvents="none"
            />
          ) : null}

          {/* nearest-point hit bands: a 4px dot is far too small to aim at */}
          {data.map((d, i) => {
            const left = i === 0 ? PAD.left : (xOf(data[i - 1].mid) + xOf(d.mid)) / 2
            const right =
              i === data.length - 1 ? PAD.left + plotW : (xOf(d.mid) + xOf(data[i + 1].mid)) / 2
            return (
              <rect
                key={`hit-${i}`}
                x={left}
                y={PAD.top}
                width={Math.max(2, right - left)}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
              />
            )
          })}

          <line
            x1={PAD.left}
            x2={PAD.left + plotW}
            y1={PAD.top + plotH}
            y2={PAD.top + plotH}
            stroke="#383835"
            strokeWidth={1}
          />

          {xTicks.map((t, i) => (
            <text
              key={i}
              x={xOf(t)}
              y={height - 10}
              fontSize={10}
              fill="#898781"
              textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
            >
              {fmt(t, feature.decimals > 3 ? 4 : feature.decimals)}
            </text>
          ))}
          <text x={PAD.left} y={PAD.top - 4} fontSize={10} fill="#898781">
            °C
          </text>
        </svg>
      ) : null}

      <p className="mt-1 text-[11px] text-ink-3">
        {feature.short} low → high ·{' '}
        <span className={delta > 0 ? 'text-[#e66767]' : 'text-s1'}>
          {delta > 0 ? '+' : '−'}
          {fmt(Math.abs(delta), 1)} °C
        </span>{' '}
        across the range
      </p>

      {active ? (
        <div
          className="tnum pointer-events-none absolute z-10 -translate-x-1/2 rounded border border-line-strong bg-raised px-2 py-1 text-[11px] text-ink shadow-lg"
          style={{ left: xOf(active.mid) + 16, top: 0 }}
        >
          {feature.short} {fmt(active.mid, feature.decimals)}
          <span className="ml-1.5 text-ink-3">
            → {fmt(active.meanLst, 1)} °C · {active.count} cells
          </span>
        </div>
      ) : null}
    </div>
  )
}
