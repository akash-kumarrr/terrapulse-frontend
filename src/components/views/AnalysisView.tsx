import { useMemo, useState } from 'react'
import { DriverBars } from '../charts/DriverBars'
import { Histogram } from '../charts/Histogram'
import { RelationChart } from '../charts/RelationChart'
import { FEATURE_BY_KEY, FEATURES } from '../../lib/features'
import { fmt, fmtTemp } from '../../lib/format'
import { binnedRelation, type CityAnalysis } from '../../lib/stats'
import type { City, FeatureKey, HeatPoint } from '../../lib/types'
import { Card, CardHeader } from '../ui/Card'
import { ChartCard } from '../ui/ChartCard'

interface AnalysisViewProps {
  points: HeatPoint[]
  analysis: CityAnalysis
  city: City
}

export function AnalysisView({ points, analysis, city }: AnalysisViewProps) {
  const [driver, setDriver] = useState<FeatureKey>(analysis.correlations[0]?.key ?? 'NDVI')
  const driverMeta = FEATURE_BY_KEY[driver]

  const relation = useMemo(() => binnedRelation(points, driver, 10), [points, driver])

  const zoneRows = FEATURES.filter((f) => f.group !== 'location')

  return (
    <div className="grid gap-3 p-3 xl:grid-cols-2">
      <ChartCard
        eyebrow="Distribution"
        title={`Surface temperature across ${city.name}`}
        description={`${analysis.n.toLocaleString()} sampled cells, ${fmtTemp(analysis.lst.min)} to ${fmtTemp(analysis.lst.max)}.`}
        table={{
          columns: ['Range (°C)', 'Cells', 'Share'],
          rows: analysis.histogram.map((b) => [
            `${fmt(b.x0, 1)} – ${fmt(b.x1, 1)}`,
            b.count,
            `${(b.share * 100).toFixed(1)}%`,
          ]),
        }}
      >
        <Histogram
          bins={analysis.histogram}
          median={analysis.lst.median}
          threshold={{ value: 45, label: '45° risk' }}
        />
      </ChartCard>

      <ChartCard
        eyebrow="Drivers"
        title="What moves with surface temperature"
        description="Pearson correlation across every sampled cell. Select a row to plot it below. Net radiation and the two heat fluxes are derived from the same thermal imagery as temperature itself, so read those three as bookkeeping rather than as causes."
        table={{
          columns: ['Variable', 'r', 'Δ°C across deciles'],
          rows: analysis.correlations.map((c) => [
            FEATURE_BY_KEY[c.key].label,
            `${c.r >= 0 ? '+' : '−'}${fmt(Math.abs(c.r), 3)}`,
            `${c.deltaLst >= 0 ? '+' : '−'}${fmt(Math.abs(c.deltaLst), 2)}`,
          ]),
        }}
      >
        <DriverBars correlations={analysis.correlations} selected={driver} onSelect={setDriver} />
      </ChartCard>

      <ChartCard
        eyebrow="Relationship"
        title={`Mean temperature by ${driverMeta.label.toLowerCase()}`}
        description={driverMeta.why}
        table={{
          columns: [`${driverMeta.short} range`, 'Mean LST (°C)', 'Cells'],
          rows: relation.map((r) => [
            `${fmt(r.x0, driverMeta.decimals)} – ${fmt(r.x1, driverMeta.decimals)}`,
            fmt(r.meanLst, 2),
            r.count,
          ]),
        }}
      >
        <RelationChart data={relation} feature={driverMeta} />
      </ChartCard>

      <Card className="overflow-hidden">
        <CardHeader
          eyebrow="Zone profile"
          title="How the coolest and hottest thirds differ"
          description="The city split into three equal groups by surface temperature, then averaged. This is the heat-island story in one table."
        />
        <div className="overflow-auto">
          <table className="w-full border-collapse text-[11.5px]">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="px-4 py-2 text-left font-medium text-ink-3">
                  Variable
                </th>
                {analysis.zones.map((z) => (
                  <th key={z.id} scope="col" className="px-3 py-2 text-right font-medium text-ink-3">
                    {z.label}
                  </th>
                ))}
                <th scope="col" className="px-4 py-2 text-right font-medium text-ink-3">
                  Hot − cool
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line bg-raised/40">
                <td className="px-4 py-2 font-medium text-ink">Mean surface temperature</td>
                {analysis.zones.map((z) => (
                  <td key={z.id} className="px-3 py-2 text-right text-ink">
                    {fmt(z.meanLst, 1)} °C
                  </td>
                ))}
                <td className="px-4 py-2 text-right font-medium text-[#e66767]">
                  +{fmt(analysis.zones[2].meanLst - analysis.zones[0].meanLst, 1)} °C
                </td>
              </tr>
              {zoneRows.map((f) => {
                const cool = analysis.zones[0].features[f.key]
                const hot = analysis.zones[2].features[f.key]
                const diff = hot - cool
                return (
                  <tr key={f.key} className="border-b border-line/60 last:border-0" title={f.why}>
                    <td className="px-4 py-1.5 text-ink-2">{f.label}</td>
                    {analysis.zones.map((z) => (
                      <td key={z.id} className="px-3 py-1.5 text-right text-ink-2">
                        {fmt(z.features[f.key], f.decimals)}
                      </td>
                    ))}
                    <td
                      className={`px-4 py-1.5 text-right ${
                        diff > 0 ? 'text-[#e66767]' : 'text-s1'
                      }`}
                    >
                      {diff > 0 ? '+' : '−'}
                      {fmt(Math.abs(diff), f.decimals)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-4 py-3 text-[10.5px] leading-relaxed text-ink-3">
          Read this as association, not proof of cause. Vegetation, building density and albedo all
          move together in a real city, so no single row is the whole explanation.
        </p>
      </Card>
    </div>
  )
}
