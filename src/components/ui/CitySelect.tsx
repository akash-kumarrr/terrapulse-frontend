import { useEffect, useRef, useState } from 'react'
import { CITIES } from '../../lib/cities'
import type { City } from '../../lib/types'

interface CitySelectProps {
  value: City
  onChange: (city: City) => void
}

export function CitySelect({ value, onChange }: CitySelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const matches = CITIES.filter((c) =>
    `${c.name} ${c.state}`.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v)
          setQuery('')
        }}
        className="flex h-8 items-center gap-2 rounded border border-line bg-raised px-2.5 text-[12.5px] text-ink transition-colors hover:border-line-strong"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M8 14.5s5-4.2 5-8a5 5 0 1 0-10 0c0 3.8 5 8 5 8Z"
            stroke="#898781"
            strokeWidth="1.3"
          />
          <circle cx="8" cy="6.4" r="1.7" stroke="#898781" strokeWidth="1.3" />
        </svg>
        <span className="font-medium">{value.name}</span>
        <span className="text-ink-3">{value.state}</span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden className="ml-0.5">
          <path d="m3 4.5 3 3 3-3" stroke="#898781" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>

      {open ? (
        <div className="tp-fade absolute left-0 top-9 z-[1200] w-[268px] overflow-hidden rounded-md border border-line-strong bg-panel shadow-[0_16px_44px_rgba(0,0,0,0.6)]">
          <div className="border-b border-line px-2 py-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cities"
              className="h-7 w-full rounded bg-base px-2 text-[12px] text-ink placeholder:text-[#5c6169] focus:outline-none"
            />
          </div>
          <ul role="listbox" className="max-h-[290px] overflow-auto py-1">
            {matches.length === 0 ? (
              <li className="px-3 py-4 text-center text-[11.5px] text-ink-3">No match</li>
            ) : null}
            {matches.map((city) => {
              const selected = city.id === value.id
              return (
                <li key={city.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(city)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-[12.5px] transition-colors ${
                      selected ? 'bg-raised text-ink' : 'text-ink-2 hover:bg-raised hover:text-ink'
                    }`}
                  >
                    <span className="truncate">
                      {city.name}
                      <span className="ml-1.5 text-[11px] text-ink-3">{city.state}</span>
                    </span>
                    {city.precomputed ? (
                      <span className="flex shrink-0 items-center gap-1 text-[10px] text-s3">
                        <span className="h-1.5 w-1.5 rounded-full bg-s3" />
                        Cached
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] text-ink-3">On demand</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="border-t border-line px-3 py-2 text-[10.5px] leading-relaxed text-ink-3">
            Delhi is cached and returns immediately. Every other city is composited on demand
            through Earth Engine — usually 20–60 seconds, and it can fail if the server’s Earth
            Engine session has dropped.
          </p>
        </div>
      ) : null}
    </div>
  )
}
