import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <section className={`rounded-md border border-line bg-panel ${className}`}>{children}</section>
  )
}

interface CardHeaderProps {
  title: ReactNode
  eyebrow?: string
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

export function CardHeader({
  title,
  eyebrow,
  description,
  actions,
  className = '',
}: CardHeaderProps) {
  return (
    <header
      className={`flex items-start justify-between gap-4 border-b border-line px-4 py-3 ${className}`}
    >
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-1">{eyebrow}</p> : null}
        <h2 className="text-[13.5px] font-semibold leading-tight text-ink">{title}</h2>
        {description ? (
          <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  )
}
