import { useEffect, useMemo, useState } from 'react'
import { usePrediction, type Scenario } from '../../hooks/usePrediction'
import { SERIES } from '../../lib/colors'
import { FEATURES, FEATURE_GROUPS, LEVER_FEATURES } from '../../lib/features'
import { fmt, fmtDuration, fmtTemp } from '../../lib/format'
import type { CityAnalysis } from '../../lib/stats'
import type { City, EnvironmentalFeatures, HeatPoint } from '../../lib/types'
import { Card, CardHeader } from '../ui/Card'
import { Button, Segmented } from '../ui/Controls'
import { Slider } from '../ui/Slider'
import { Spinner } from '../ui/States'

type BaselineId = 'cell' | 'mean' | 'hottest' | 'coolest'

interface Preset {
  id: string
  label: string
  description: string
  apply: (f: EnvironmentalFeatures, a: CityAnalysis) => EnvironmentalFeatures
}

/** Interventions a city actually has levers for, expressed in the model's inputs. */
const PRESETS: Preset[] = [
  {
    id: 'canopy',
    label: 'Add tree canopy',
    description: 'Raises greenness toward the city’s greenest decile and lifts albedo slightly.',
    apply: (f, a) => ({
      ...f,
      NDVI: Math.min(a.featureStats.NDVI.max, f.NDVI + 0.15),
      Albedo: Math.min(a.featureStats.Albedo.max, f.Albedo + 0.01),
      H_SensibleHeatFlux: Math.max(
        a.featureStats.H_SensibleHeatFlux.min,
        f.H_SensibleHeatFlux * 0.85,
      ),
    }),
  },
  {
    id: 'roofs',
    label: 'Cool roofs',
    description: 'Reflective roof coatings across the built footprint — albedo up, nothing else.',
    apply: (f, a) => ({
      ...f,
      Albedo: Math.min(a.featureStats.Albedo.max, f.Albedo + 0.07),
    }),
  },
  {
    id: 'density',
    label: 'Dense redevelopment',
    description: 'Built-up density up by half, at the cost of vegetation.',
    apply: (f, a) => ({
      ...f,
      Building_Density: Math.min(a.featureStats.Building_Density.max, f.Building_Density * 1.5 + 200),
      NDVI: Math.max(a.featureStats.NDVI.min, f.NDVI - 0.1),
    }),
  },
  {
    id: 'monsoon',
    label: 'After rainfall',
    description: 'Wet-season conditions: precipitation and surface moisture at their upper range.',
    apply: (f, a) => ({
      ...f,
      total_precipitation_hourly: a.featureStats.total_precipitation_hourly.p95,
      NDWI: Math.min(a.featureStats.NDWI.max, f.NDWI + 0.15),
    }),
  },
]

function featuresOf(point: HeatPoint): EnvironmentalFeatures {
  return Object.fromEntries(
    FEATURES.map((f) => [f.key, point[f.key]]),
  ) as EnvironmentalFeatures
}

function meanFeatures(analysis: CityAnalysis): EnvironmentalFeatures {
  return Object.fromEntries(
    FEATURES.map((f) => [f.key, analysis.featureStats[f.key].mean]),
  ) as EnvironmentalFeatures
}

interface SimulatorProps {
  analysis: CityAnalysis
  city: City
  seed: HeatPoint | null
}

export function Simulator({ analysis, city, seed }: SimulatorProps) {
  const [baselineId, setBaselineId] = useState<BaselineId>(seed ? 'cell' : 'mean')
  const [features, setFeatures] = useState<EnvironmentalFeatures>(() =>
    seed ? featuresOf(seed) : meanFeatures(analysis),
  )
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [appliedPreset, setAppliedPreset] = useState<string | null>(null)
  const { predict, pending, error } = usePrediction(city)

  const baseline = useMemo(() => {
    const source =
      baselineId === 'cell'
        ? seed
        : baselineId === 'hottest'
          ? analysis.hottest[0]
          : baselineId === 'coolest'
            ? analysis.coolest[0]
            : null
    return {
      features: source ? featuresOf(source) : meanFeatures(analysis),
      observedLst: source ? source.LST_Celsius : analysis.lst.mean,
      label:
        baselineId === 'cell'
          ? seed
            ? 'Pinned cell'
            : 'City average — no cell pinned'
          : baselineId === 'hottest'
            ? 'Hottest cell'
            : baselineId === 'coolest'
              ? 'Coolest cell'
              : 'City average',
    }
  }, [baselineId, seed, analysis])

  // A new pin from the map becomes the baseline, which in turn reloads the
  // sliders through the effect below.
  useEffect(() => {
    if (seed) setBaselineId('cell')
  }, [seed])

  useEffect(() => {
    setFeatures(baseline.features)
    setAppliedPreset(null)
  }, [baseline])

  const dirty = LEVER_FEATURES.some(
    (f) => Math.abs(features[f.key] - baseline.features[f.key]) > 1e-9,
  )

  const run = async (label: string) => {
    const scenario = await predict(features, {
      label,
      baselineLst: baseline.observedLst,
    })
    if (scenario) setScenarios((prev) => [scenario, ...prev].slice(0, 8))
  }

  const latest = scenarios[0] ?? null
  const chartMax = Math.max(
    baseline.observedLst,
    ...scenarios.map((s) => s.predictedLst),
    1,
  )

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 overflow-auto p-3 xl:grid-cols-[minmax(0,1fr)_400px]">
      {/* ── inputs ─────────────────────────────────────────── */}
      <Card className="flex min-h-0 flex-col">
        <CardHeader
          eyebrow="Scenario inputs"
          title="Twelve measurements go to the model"
          description="Start from a real place, change what a city could plausibly change, and ask the model what the surface temperature becomes."
          actions={
            <Segmented
              ariaLabel="Baseline"
              size="sm"
              value={baselineId}
              onChange={setBaselineId}
              options={[
                { value: 'cell', label: 'Pinned cell', title: seed ? undefined : 'Pin a cell on the map first' },
                { value: 'mean', label: 'City average' },
                { value: 'hottest', label: 'Hottest' },
                { value: 'coolest', label: 'Coolest' },
              ]}
            />
          }
        />

        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <span className="text-[11px] text-ink-3">Presets</span>
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              title={preset.description}
              onClick={() => {
                setFeatures((f) => preset.apply(f, analysis))
                setAppliedPreset(preset.id)
              }}
              className={`h-7 rounded border px-2.5 text-[11.5px] transition-colors ${
                appliedPreset === preset.id
                  ? 'border-s1/50 bg-s1/10 text-ink'
                  : 'border-line bg-raised text-ink-2 hover:border-line-strong hover:text-ink'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            disabled={!dirty}
            onClick={() => {
              setFeatures(baseline.features)
              setAppliedPreset(null)
            }}
            className="h-7 rounded px-2 text-[11.5px] text-ink-3 transition-colors hover:text-ink disabled:opacity-40 disabled:hover:text-ink-3"
          >
            Reset
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {FEATURE_GROUPS.filter((g) => g.id !== 'location').map((group) => (
            <fieldset key={group.id} className="border-b border-line px-4 py-3 last:border-0">
              <legend className="eyebrow mb-3">{group.label}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                {LEVER_FEATURES.filter((f) => f.group === group.id).map((f) => {
                  const stats = analysis.featureStats[f.key]
                  const span = stats.max - stats.min || 1
                  return (
                    <Slider
                      key={f.key}
                      label={f.label}
                      hint={f.why}
                      unit={f.unit}
                      decimals={f.decimals}
                      value={features[f.key]}
                      min={stats.min}
                      max={stats.max}
                      step={span / 200}
                      baseline={baseline.features[f.key]}
                      onChange={(v) => {
                        setFeatures((prev) => ({ ...prev, [f.key]: v }))
                        setAppliedPreset(null)
                      }}
                    />
                  )
                })}
              </div>
            </fieldset>
          ))}

          <div className="px-4 py-3 text-[11px] text-ink-3">
            Location is fixed at{' '}
            <span className="tnum text-ink-2">
              {features.Latitude.toFixed(4)}, {features.Longitude.toFixed(4)}
            </span>{' '}
            — the model receives it as context, not as something you can move.
          </div>
        </div>

        <footer className="flex items-center gap-3 border-t border-line p-3">
          <Button
            variant="primary"
            onClick={() => run(appliedPreset ? PRESETS.find((p) => p.id === appliedPreset)!.label : dirty ? 'Custom scenario' : baseline.label)}
            disabled={pending}
          >
            {pending ? <Spinner /> : null}
            {pending ? 'Predicting' : 'Run prediction'}
          </Button>
          <p className="text-[11px] text-ink-3">
            {dirty ? 'Modified from baseline' : `Unchanged — ${baseline.label.toLowerCase()}`}
          </p>
        </footer>
      </Card>

      {/* ── results ────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-col gap-3">
        <Card>
          <CardHeader eyebrow="Model output" title="Predicted surface temperature" />
          <div className="px-4 py-4">
            {error ? (
              <p className="text-[12px] text-[#d03b3b]">{error.message}</p>
            ) : latest ? (
              <>
                {/* the one hero figure on this view */}
                <p className="text-[48px] font-semibold leading-none tracking-[-0.02em] text-ink">
                  {fmt(latest.predictedLst, 2)}
                  <span className="ml-1 text-[20px] font-normal text-ink-3">°C</span>
                </p>
                <p className="mt-3 text-[12px] text-ink-2">
                  {latest.label} ·{' '}
                  <span className="text-ink-3">responded in {fmtDuration(latest.elapsedMs)}</span>
                </p>
                {latest.baselineLst != null ? (
                  <p className="tnum mt-2 text-[12px] text-ink-3">
                    Observed at the baseline location:{' '}
                    <span className="text-ink-2">{fmtTemp(latest.baselineLst)}</span> ·{' '}
                    <span
                      className={
                        latest.predictedLst > latest.baselineLst ? 'text-[#e66767]' : 'text-s1'
                      }
                    >
                      {latest.predictedLst > latest.baselineLst ? '+' : '−'}
                      {fmt(Math.abs(latest.predictedLst - latest.baselineLst), 2)} °C
                    </span>
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-[12px] leading-relaxed text-ink-3">
                No prediction yet. Adjust the inputs on the left — or apply a preset — then run the
                model.
              </p>
            )}
          </div>
        </Card>

        {scenarios.length > 0 ? (
          <Card className="flex min-h-0 flex-col">
            <CardHeader
              eyebrow="Comparison"
              title="Scenarios this session"
              actions={
                <Button size="sm" variant="ghost" onClick={() => setScenarios([])}>
                  Clear
                </Button>
              }
            />
            <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
              <div className="mb-3 flex items-center gap-2 text-[10.5px] text-ink-3">
                <span className="h-2 w-4 rounded-[2px]" style={{ background: SERIES.s1 }} />
                Model prediction
                <span className="ml-2 h-2 w-4 rounded-[2px] bg-[#4b4f55]" />
                Observed at baseline
              </div>
              <ul className="space-y-3">
                {scenarios.map((s) => (
                  <li key={s.id}>
                    <div className="flex items-baseline justify-between gap-2 text-[11.5px]">
                      <span className="truncate text-ink-2">{s.label}</span>
                      <span className="tnum shrink-0 text-ink">{fmt(s.predictedLst, 2)} °C</span>
                    </div>
                    <div className="mt-1.5 space-y-[2px]">
                      <div
                        className="h-[9px] rounded-r-[3px]"
                        style={{
                          width: `${(s.predictedLst / chartMax) * 100}%`,
                          background: SERIES.s1,
                        }}
                      />
                      {s.baselineLst != null ? (
                        <div
                          className="h-[5px] rounded-r-[2px] bg-[#4b4f55]"
                          style={{ width: `${(s.baselineLst / chartMax) * 100}%` }}
                        />
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <p className="border-t border-line px-4 py-3 text-[10.5px] leading-relaxed text-ink-3">
              Differences between scenarios are the useful signal here — they show which lever the
              model responds to most. Treat a single absolute value with more caution than the gap
              between two.
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
