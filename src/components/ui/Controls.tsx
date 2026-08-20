import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline'
  size?: 'sm' | 'md'
}

const VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-s1 text-[#07131f] hover:bg-[#4b93e9] disabled:bg-[#26466b] disabled:text-[#8fa8c4]',
  outline: 'border border-line-strong bg-raised text-ink-2 hover:text-ink hover:border-[#3c434b]',
  ghost: 'text-ink-3 hover:text-ink hover:bg-raised',
}

export function Button({
  variant = 'outline',
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
        size === 'sm' ? 'h-7 px-2.5 text-[11.5px]' : 'h-8 px-3 text-[12.5px]'
      } ${VARIANTS[variant]} ${className}`}
    />
  )
}

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
  title?: string
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  size?: 'sm' | 'md'
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
}: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 rounded border border-line bg-base p-0.5"
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            role="tab"
            type="button"
            aria-selected={active}
            title={opt.title}
            onClick={() => onChange(opt.value)}
            className={`rounded-[3px] font-medium transition-colors ${
              size === 'sm' ? 'h-6 px-2 text-[11px]' : 'h-7 px-2.5 text-[12px]'
            } ${
              active
                ? 'bg-raised text-ink shadow-[inset_0_0_0_1px_#2f343a]'
                : 'text-ink-3 hover:text-ink-2'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group inline-flex items-center gap-2 text-[12px] text-ink-2 hover:text-ink"
    >
      <span
        className={`relative h-[15px] w-[26px] rounded-full border transition-colors ${
          checked ? 'border-s1/60 bg-s1/30' : 'border-line-strong bg-base'
        }`}
      >
        <span
          className={`absolute top-[2px] h-[9px] w-[9px] rounded-full transition-all ${
            checked ? 'left-[13px] bg-s1' : 'left-[2px] bg-[#5c6169]'
          }`}
        />
      </span>
      {label}
    </button>
  )
}
