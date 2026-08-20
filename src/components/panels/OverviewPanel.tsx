import { heatHex } from '../../lib/colors'
import { fmt, fmtPercent, fmtTemp } from '../../lib/format'
import { explain, type CityAnalysis } from '../../lib/stats'
import type { City } from '../../lib/types'
import { StatTile } from '../ui/StatTile'

interface OverviewPanelProps {
  analysis: CityAnalysis
  city: City
}

const TONE_MARK = {
  warming: { color: '#e66767', label: 'Warming' },
  cooling: { color: '#3987e5', label: 'Cooling' },
  neutral: { color: '#898781', label: 'Context' },
} as const

export function OverviewPanel({ analysis, city }: OverviewPanelProps) {
  const findings = explain(analysis, city.name)

  return (
    <div className="flex h-full flex-col overflow-auto">
      <div className="grid grid-cols-2 divide-x divide-y divide-line border-b border-line">
        <StatTile
          label="Mean surface temperature"
          value={fmtTemp(analysis.lst.mean)}
          footnote={`across ${analysis.n.toLocaleString()} cells`}
          swatch={heatHex(
            (analysis.lst.mean - analysis.lst.min) / (analysis.lst.max - analysis.lst.min || 1),
          )}
        />
        <StatTile
          label="Hottest cell"
          value={fmtTemp(analysis.lst.max)}
          delta={{ value: `+${fmt(analysis.lst.max - analysis.lst.mean, 1)} °C`, tone: 'warm' }}
          deltaLabel="vs city mean"
          swatch={heatHex(1)}
        />
        <StatTile
          label="Heat-island spread"
          value={`${fmt(analysis.uhiIntensity, 1)} °C`}
          footnote="hottest tenth − coolest tenth"
        />
        <StatTile
          label="Area at or above 45 °C"
          value={fmtPercent(analysis.severeShare, 1)}
          footnote={`${Math.round(analysis.severeShare * analysis.n).toLocaleString()} cells`}
        />
      </div>

      <div className="px-4 py-3">
        <p className="eyebrow">What the data says</p>
        <ul className="mt-3 space-y-4">
          {findings.map((f) => {
            const tone = TONE_MARK[f.tone]
            return (
              <li key={f.id} className="border-l-2 pl-3" style={{ borderColor: tone.color }}>
                <p className="text-[12.5px] font-medium leading-snug text-ink">{f.headline}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">{f.body}</p>
              </li>
            )
          })}
        </ul>
      </div>

      <p className="mt-auto border-t border-line px-4 py-3 text-[10.5px] leading-relaxed text-ink-3">
        Every figure here is computed from the {analysis.n.toLocaleString()} sample cells the API
        returned for {city.name} — nothing is modelled or assumed. Correlation describes what moves
        together in this snapshot, not proof of cause.
      </p>
    </div>
  )
}
