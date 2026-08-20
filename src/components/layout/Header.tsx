import { CitySelect } from '../ui/CitySelect'
import { Button } from '../ui/Controls'
import { Spinner } from '../ui/States'
import type { City } from '../../lib/types'

interface HeaderProps {
  city: City
  onCityChange: (city: City) => void
  sampleCount: number
  fetchedAt: number | null
  loading: boolean
  fromCache: boolean
  onReload: () => void
  apiOnline: boolean | null
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="10" cy="10" r="8.5" stroke="#2f343a" />
        <circle cx="10" cy="10" r="5.5" stroke="#8a4a3a" />
        <circle cx="10" cy="10" r="2.6" fill="#f37819" />
      </svg>
      <span className="text-[13.5px] font-semibold tracking-[-0.01em] text-ink">TerraPulse</span>
      <span className="hidden text-[11px] text-ink-3 sm:inline">Urban heat intelligence</span>
    </div>
  )
}

function timeAgo(ts: number): string {
  const secs = Math.round((Date.now() - ts) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`
  return `${Math.round(secs / 3600)}h ago`
}

export function Header({
  city,
  onCityChange,
  sampleCount,
  fetchedAt,
  loading,
  fromCache,
  onReload,
  apiOnline,
}: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-panel px-4">
      <div className="flex items-center gap-4">
        <Logo />
        <span className="h-5 w-px bg-line" />
        <CitySelect value={city} onChange={onCityChange} />
      </div>

      <div className="flex items-center gap-4">
        {loading ? (
          <span className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
            <Spinner size={12} />
            Loading {city.name}
          </span>
        ) : sampleCount > 0 ? (
          <span className="tnum hidden text-[11.5px] text-ink-3 md:inline">
            {sampleCount.toLocaleString()} cells
            {fetchedAt ? ` · ${fromCache ? 'cached' : 'fetched'} ${timeAgo(fetchedAt)}` : ''}
          </span>
        ) : null}

        <span className="flex items-center gap-1.5 text-[11.5px] text-ink-3" title="TerraPulse API">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              apiOnline === null ? 'bg-[#4b4f55]' : apiOnline ? 'bg-good' : 'bg-critical'
            }`}
          />
          API
        </span>

        <Button size="sm" onClick={onReload} disabled={loading}>
          Refresh
        </Button>
      </div>
    </header>
  )
}
