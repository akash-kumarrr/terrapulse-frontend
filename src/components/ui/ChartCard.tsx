import { useState, type ReactNode } from 'react'
import { Card, CardHeader } from './Card'
import { Segmented } from './Controls'

export interface TableTwin {
  columns: string[]
  rows: (string | number)[][]
  /** Columns after this index are right-aligned numerics. */
  firstNumericColumn?: number
}

interface ChartCardProps {
  title: ReactNode
  eyebrow?: string
  description?: ReactNode
  /** The WCAG-clean equivalent of the chart. Every chart here has one. */
  table: TableTwin
  children: ReactNode
  actions?: ReactNode
  className?: string
}

/**
 * Wraps a chart with its table twin so no value is reachable only by hovering
 * a coloured mark.
 */
export function ChartCard({
  title,
  eyebrow,
  description,
  table,
  children,
  actions,
  className = '',
}: ChartCardProps) {
  const [view, setView] = useState<'chart' | 'table'>('chart')

  return (
    <Card className={`flex flex-col overflow-hidden ${className}`}>
      <CardHeader
        title={title}
        eyebrow={eyebrow}
        description={description}
        actions={
          <div className="flex items-center gap-2">
            {actions}
            <Segmented
              ariaLabel={`View ${typeof title === 'string' ? title : 'chart'} as`}
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: 'chart', label: 'Chart' },
                { value: 'table', label: 'Table' },
              ]}
            />
          </div>
        }
      />
      <div className="min-h-0 flex-1">
        {view === 'chart' ? (
          children
        ) : (
          <div className="max-h-[320px] overflow-auto">
            <table className="w-full border-collapse text-[11.5px]">
              <thead className="sticky top-0 bg-panel">
                <tr className="border-b border-line">
                  {table.columns.map((c, i) => (
                    <th
                      key={c}
                      scope="col"
                      className={`px-4 py-2 font-medium text-ink-3 ${
                        i >= (table.firstNumericColumn ?? 1) ? 'text-right' : 'text-left'
                      }`}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-line/60 last:border-0">
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={`px-4 py-1.5 ${
                          ci >= (table.firstNumericColumn ?? 1)
                            ? 'text-right text-ink-2'
                            : 'text-left text-ink'
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  )
}
