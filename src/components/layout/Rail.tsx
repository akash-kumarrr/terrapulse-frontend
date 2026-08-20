import type { ReactNode } from 'react'

export type ViewId = 'map' | 'analysis' | 'simulator'

interface RailProps {
  value: ViewId
  onChange: (view: ViewId) => void
}

const ICONS: Record<ViewId, ReactNode> = {
  map: (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="m2.5 5.5 5-2 5 2 5-2v11l-5 2-5-2-5 2v-11Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M7.5 3.5v11M12.5 5.5v11" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
  analysis: (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M3 16.5V9M7.7 16.5V4M12.3 16.5v-5M17 16.5V7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  simulator: (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M3 6h14M3 14h14" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="7.5" cy="6" r="2.2" fill="#0a0b0d" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="13" cy="14" r="2.2" fill="#0a0b0d" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
}

const LABELS: Record<ViewId, string> = {
  map: 'Heat map',
  analysis: 'Analysis',
  simulator: 'Simulator',
}

export function Rail({ value, onChange }: RailProps) {
  return (
    <nav
      aria-label="Views"
      className="flex w-[64px] shrink-0 flex-col items-center gap-1 border-r border-line bg-panel py-3"
    >
      {(Object.keys(LABELS) as ViewId[]).map((id) => {
        const active = id === value
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-label={LABELS[id]}
            aria-current={active ? 'page' : undefined}
            className={`flex w-[52px] flex-col items-center gap-1 rounded-md py-2 transition-colors ${
              active
                ? 'bg-raised text-ink shadow-[inset_0_0_0_1px_#23262b]'
                : 'text-ink-3 hover:bg-raised/60 hover:text-ink-2'
            }`}
          >
            {ICONS[id]}
            <span className="text-[9.5px] font-medium leading-none">{LABELS[id]}</span>
          </button>
        )
      })}
    </nav>
  )
}
