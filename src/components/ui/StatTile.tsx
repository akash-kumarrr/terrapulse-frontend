import type { ReactNode } from 'react'

interface StatTileProps {
  label: string
  value: ReactNode
  /** Signed comparison against something named in `deltaLabel`. */
  delta?: { value: string; tone: 'warm' | 'cool' | 'neutral' }
  deltaLabel?: string
  footnote?: ReactNode
  /** Small colour key tying the tile to a scale on the map or a chart. */
  swatch?: string
}

const DELTA_TONE = {
  warm: 'text-[#e66767]',
  cool: 'text-s1',
  neutral: 'text-ink-2',
} as const

export function StatTile({ label, value, delta, deltaLabel, footnote, swatch }: StatTileProps) {
  return (
    <div className="min-w-0 px-4 py-3">
      <div className="flex items-center gap-1.5">
        {swatch ? (
          <span
            aria-hidden
            className="h-2 w-2 shrink-0 rounded-[2px]"
            style={{ background: swatch }}
          />
        ) : null}
        <p className="truncate text-[11.5px] text-ink-3">{label}</p>
      </div>
      {/* Proportional figures: tabular digits make a display number look loose. */}
      <p className="mt-1.5 text-[25px] font-semibold leading-none tracking-[-0.015em] text-ink">
        {value}
      </p>
      {delta || footnote ? (
        <p className="mt-2 flex items-baseline gap-1.5 text-[11.5px] leading-tight">
          {delta ? <span className={DELTA_TONE[delta.tone]}>{delta.value}</span> : null}
          {deltaLabel ? <span className="text-ink-3">{deltaLabel}</span> : null}
          {footnote ? <span className="text-ink-3">{footnote}</span> : null}
        </p>
      ) : null}
    </div>
  )
}
