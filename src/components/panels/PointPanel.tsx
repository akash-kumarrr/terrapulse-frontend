import { divergingHex, heatHex } from '../../lib/colors'
import { FEATURES, FEATURE_GROUPS } from '../../lib/features'
import { fmt, fmtCoord, fmtTemp } from '../../lib/format'
import { percentileRank, type CityAnalysis } from '../../lib/stats'
import type { HeatPoint } from '../../lib/types'
import { Button } from '../ui/Controls'

interface PointPanelProps {
  point: HeatPoint
  analysis: CityAnalysis
  onSimulate: (point: HeatPoint) => void
  onClear: () => void
}

/** How far this cell sits from the city mean, in standard deviations. */
function zScore(value: number, mean: number, std: number): number {
  return std > 0 ? (value - mean) / std : 0
}

export function PointPanel({ point, analysis, onSimulate, onClear }: PointPanelProps) {
  const rank = percentileRank(analysis.sortedLst, point.LST_Celsius)
  const vsMean = point.LST_Celsius - analysis.lst.mean
  const t =
    (point.LST_Celsius - analysis.lst.min) / (analysis.lst.max - analysis.lst.min || 1)

  return (
    <div className="tp-fade flex h-full flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="eyebrow mb-1">Selected cell</p>
          <div className="flex items-baseline gap-2">
            <span
              className="h-2.5 w-2.5 rounded-[2px]"
              style={{ background: heatHex(t) }}
              aria-hidden
            />
            <span className="text-[24px] font-semibold leading-none tracking-[-0.015em] text-ink">
              {fmtTemp(point.LST_Celsius)}
            </span>
          </div>
          <p className="tnum mt-1.5 text-[11.5px] text-ink-3">
            {fmtCoord(point.Latitude, point.Longitude)}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear} aria-label="Clear selection">
          ✕
        </Button>
      </header>

      <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
        <div className="px-4 py-2.5">
          <p className="text-[11px] text-ink-3">Versus city mean</p>
          <p className="tnum mt-1 text-[15px] font-medium text-ink">
            <span className={vsMean > 0 ? 'text-[#e66767]' : 'text-s1'}>
              {vsMean > 0 ? '+' : '−'}
              {fmt(Math.abs(vsMean), 1)} °C
            </span>
          </p>
        </div>
        <div className="px-4 py-2.5">
          <p className="text-[11px] text-ink-3">Hotter than</p>
          <p className="tnum mt-1 text-[15px] font-medium text-ink">
            {(rank * 100).toFixed(0)}%
            <span className="ml-1 text-[11px] font-normal text-ink-3">of the city</span>
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {FEATURE_GROUPS.map((group) => {
          const rows = FEATURES.filter((f) => f.group === group.id)
          if (rows.length === 0) return null
          return (
            <div key={group.id} className="border-b border-line last:border-0">
              <p className="eyebrow px-4 pb-1.5 pt-3">{group.label}</p>
              <table className="w-full text-[11.5px]">
                <tbody>
                  {rows.map((f) => {
                    const stats = analysis.featureStats[f.key]
                    const value = point[f.key]
                    const z = group.id === 'location' ? 0 : zScore(value, stats.mean, stats.std)
                    const clamped = Math.max(-2.5, Math.min(2.5, z))
                    return (
                      <tr key={f.key} className="hover:bg-raised/60" title={f.why}>
                        <td className="w-[104px] py-1.5 pl-4 pr-2 text-ink-2">{f.short}</td>
                        <td className="py-1.5 pr-2 text-right text-ink">
                          {fmt(value, f.decimals)}
                          {f.unit ? <span className="ml-0.5 text-ink-3">{f.unit}</span> : null}
                        </td>
                        <td className="w-[74px] py-1.5 pr-4">
                          {group.id === 'location' ? null : (
                            <span
                              className="relative block h-[9px] w-full rounded-[2px] bg-[#1b1f24]"
                              title={`${z >= 0 ? '+' : '−'}${Math.abs(z).toFixed(1)}σ vs city mean`}
                            >
                              <span className="absolute inset-y-0 left-1/2 w-px bg-[#2f343a]" />
                              <span
                                className="absolute inset-y-[1px] rounded-[1px]"
                                style={{
                                  background: divergingHex(clamped, 2.5),
                                  left: clamped >= 0 ? '50%' : `${50 + (clamped / 2.5) * 50}%`,
                                  width: `${(Math.abs(clamped) / 2.5) * 50}%`,
                                }}
                              />
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>

      <footer className="border-t border-line p-3">
        <Button variant="primary" size="md" className="w-full" onClick={() => onSimulate(point)}>
          Open this cell in the simulator
        </Button>
        <p className="mt-2 text-[10.5px] leading-relaxed text-ink-3">
          Loads these twelve measurements as the baseline so you can change one and see what the
          model predicts.
        </p>
      </footer>
    </div>
  )
}
