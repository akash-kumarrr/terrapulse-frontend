import { useEffect, useState } from 'react'
import type { ApiError } from '../../lib/api'
import { Button } from './Controls'

export function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className="animate-spin"
      aria-hidden
      fill="none"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
      <path
        d="M14.5 8A6.5 6.5 0 0 0 8 1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

const STAGES = [
  'Requesting the city grid',
  'Earth Engine is compositing imagery',
  'Streaming sample cells',
  'Building the interpolated surface',
]

/**
 * A city surface genuinely takes ~25 s to build. A bare spinner for that long
 * reads as broken, so show elapsed time and what the server is working on.
 */
export function LoadingSurface({ cityName }: { cityName: string }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const started = performance.now()
    const id = setInterval(() => setElapsed((performance.now() - started) / 1000), 200)
    return () => clearInterval(id)
  }, [])

  const stage = Math.min(STAGES.length - 1, Math.floor(elapsed / 7))

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex items-center gap-2 text-ink-2">
        <Spinner size={15} />
        <span className="text-[13px]">Building the {cityName} surface</span>
      </div>
      <ol className="w-full max-w-[280px] space-y-1.5 text-left">
        {STAGES.map((s, i) => (
          <li
            key={s}
            className={`flex items-center gap-2 text-[11.5px] transition-colors ${
              i < stage ? 'text-ink-3' : i === stage ? 'text-ink-2' : 'text-[#4b4f55]'
            }`}
          >
            <span
              className={`h-1 w-1 rounded-full ${
                i < stage ? 'bg-s3' : i === stage ? 'bg-s1' : 'bg-[#2f343a]'
              }`}
            />
            {s}
          </li>
        ))}
      </ol>
      <p className="tnum text-[11px] text-ink-3">
        {elapsed.toFixed(1)}s elapsed · typically 20–40s
      </p>
    </div>
  )
}

interface ErrorStateProps {
  error: ApiError
  cityName: string
  onRetry: () => void
  onFallback?: () => void
  fallbackLabel?: string
}

export function ErrorState({
  error,
  cityName,
  onRetry,
  onFallback,
  fallbackLabel,
}: ErrorStateProps) {
  const [showDetail, setShowDetail] = useState(false)

  const title =
    error.kind === 'earth-engine'
      ? `${cityName} could not be built`
      : error.kind === 'network'
        ? 'Cannot reach the API'
        : error.kind === 'timeout'
          ? 'The request timed out'
          : 'That request failed'

  const guidance =
    error.kind === 'earth-engine'
      ? 'This city is composited on demand through Google Earth Engine, and the server’s Earth Engine session is unavailable right now. It often succeeds on a retry; Delhi is cached and always works.'
      : error.kind === 'timeout'
        ? 'Building a city surface can take a couple of minutes on a cold server. Trying again often succeeds.'
        : error.message

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#4a2f2f] bg-[#241a1a]">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M8 4.5v4m0 2.5v.01"
            stroke="#d03b3b"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="8" cy="8" r="6.5" stroke="#d03b3b" strokeWidth="1.3" />
        </svg>
      </div>
      <div className="max-w-[380px]">
        <h3 className="text-[13.5px] font-semibold text-ink">{title}</h3>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-3">{guidance}</p>
      </div>
      <div className="mt-1 flex items-center gap-2">
        {onFallback && fallbackLabel ? (
          <Button variant="primary" size="sm" onClick={onFallback}>
            {fallbackLabel}
          </Button>
        ) : null}
        <Button size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
      {error.detail ? (
        <div className="mt-1 w-full max-w-[420px]">
          <button
            type="button"
            onClick={() => setShowDetail((v) => !v)}
            className="text-[11px] text-ink-3 underline decoration-dotted underline-offset-2 hover:text-ink-2"
          >
            {showDetail ? 'Hide' : 'Show'} server response
          </button>
          {showDetail ? (
            <pre className="mt-2 max-h-28 overflow-auto rounded border border-line bg-base p-2.5 text-left text-[10.5px] leading-relaxed text-ink-3">
              {error.detail}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
