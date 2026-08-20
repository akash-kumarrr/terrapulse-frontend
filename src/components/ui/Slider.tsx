import { useId } from 'react'
import { fmt } from '../../lib/format'

interface SliderProps {
  label: string
  hint?: string
  value: number
  min: number
  max: number
  step: number
  decimals: number
  unit?: string
  /** The observed value this scenario started from, drawn as a tick. */
  baseline?: number | null
  onChange: (value: number) => void
  disabled?: boolean
}

export function Slider({
  label,
  hint,
  value,
  min,
  max,
  step,
  decimals,
  unit,
  baseline,
  onChange,
  disabled,
}: SliderProps) {
  const id = useId()
  const span = max - min || 1
  const pct = ((value - min) / span) * 100
  const basePct =
    baseline != null && Number.isFinite(baseline) ? ((baseline - min) / span) * 100 : null
  const drift = baseline != null && Number.isFinite(baseline) ? value - baseline : 0

  return (
    <div className="group">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="truncate text-[12px] text-ink-2" title={hint}>
          {label}
        </label>
        <span className="tnum shrink-0 text-[12px] text-ink">
          {fmt(value, decimals)}
          {unit ? <span className="ml-0.5 text-ink-3">{unit}</span> : null}
        </span>
      </div>

      <div className="relative mt-2 h-4">
        {/* track */}
        <div className="absolute inset-x-0 top-[7px] h-[3px] rounded-full bg-[#23262b]" />
        <div
          className="absolute top-[7px] h-[3px] rounded-full bg-s1/70"
          style={{ left: 0, width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
        {basePct != null ? (
          <span
            aria-hidden
            title="Observed value at this location"
            className="absolute top-[3px] h-[11px] w-[1.5px] -translate-x-1/2 rounded-full bg-[#6f757d]"
            style={{ left: `${Math.max(0, Math.min(100, basePct))}%` }}
          />
        ) : null}
        <input
          id={id}
          type="range"
          className="tp-range absolute inset-0 h-4 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>

      {Math.abs(drift) > step / 2 ? (
        <p className="tnum mt-1 text-[10.5px] text-ink-3">
          {drift > 0 ? '+' : '−'}
          {fmt(Math.abs(drift), decimals)} vs observed
        </p>
      ) : null}
    </div>
  )
}
