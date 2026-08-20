import { useState } from 'react'
import { heatHex } from '../../lib/colors'
import { fmt, fmtTemp } from '../../lib/format'
import type { CityAnalysis } from '../../lib/stats'
import type { HeatPoint } from '../../lib/types'
import { Segmented } from '../ui/Controls'

interface HotspotPanelProps {
  analysis: CityAnalysis
  onFocus: (point: HeatPoint) => void
  selected: HeatPoint | null
}

export function HotspotPanel({ analysis, onFocus, selected }: HotspotPanelProps) {
  const [mode, setMode] = useState<'hot' | 'cool'>('hot')
  const rows = mode === 'hot' ? analysis.hottest : analysis.coolest
  const span = analysis.lst.max - analysis.lst.min || 1

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <p className="eyebrow mb-1">Extremes</p>
          <h2 className="text-[13.5px] font-semibold text-ink">
            {mode === 'hot' ? 'Hottest cells' : 'Coolest cells'}
          </h2>
        </div>
        <Segmented
          ariaLabel="Extreme direction"
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'hot', label: 'Hottest' },
            { value: 'cool', label: 'Coolest' },
          ]}
        />
      </div>

      <ul className="min-h-0 flex-1 overflow-auto">
        {rows.map((p, i) => {
          const isSelected = selected === p
          return (
            <li key={`${p.Latitude}-${p.Longitude}`}>
              <button
                type="button"
                onClick={() => onFocus(p)}
                className={`flex w-full items-center gap-3 border-b border-line px-4 py-2.5 text-left transition-colors ${
                  isSelected ? 'bg-raised' : 'hover:bg-raised/60'
                }`}
              >
                <span className="tnum w-4 shrink-0 text-[11px] text-ink-3">{i + 1}</span>
                <span
                  className="h-6 w-1 shrink-0 rounded-[1px]"
                  style={{ background: heatHex((p.LST_Celsius - analysis.lst.min) / span) }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="tnum block text-[12.5px] font-medium text-ink">
                    {fmtTemp(p.LST_Celsius)}
                  </span>
                  <span className="tnum block text-[10.5px] text-ink-3">
                    {p.Latitude.toFixed(3)}, {p.Longitude.toFixed(3)}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="tnum block text-[11px] text-ink-2">
                    NDVI {fmt(p.NDVI, 2)}
                  </span>
                  <span className="tnum block text-[10.5px] text-ink-3">
                    build {Math.round(p.Building_Density).toLocaleString()}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <p className="border-t border-line px-4 py-3 text-[10.5px] leading-relaxed text-ink-3">
        Selecting a row centres the map on that cell and opens its full measurements.
      </p>
    </div>
  )
}
