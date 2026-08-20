import { useCallback, useEffect, useRef, useState } from 'react'
import { HeatMap } from './components/map/HeatMap'
import { Header } from './components/layout/Header'
import { Rail, type ViewId } from './components/layout/Rail'
import { HotspotPanel } from './components/panels/HotspotPanel'
import { OverviewPanel } from './components/panels/OverviewPanel'
import { PointPanel } from './components/panels/PointPanel'
import { Simulator } from './components/panels/Simulator'
import { AnalysisView } from './components/views/AnalysisView'
import { Segmented } from './components/ui/Controls'
import { ErrorState, LoadingSurface } from './components/ui/States'
import { useHeatmap } from './hooks/useHeatmap'
import { fetchHealth } from './lib/api'
import { CITIES, DEFAULT_CITY } from './lib/cities'
import type { LayerId } from './lib/layers'
import type { City, HeatPoint } from './lib/types'

type SidePanel = 'overview' | 'cell' | 'extremes'

export default function App() {
  const [city, setCity] = useState<City>(DEFAULT_CITY)
  const [view, setView] = useState<ViewId>('map')
  const [layerId, setLayerId] = useState<LayerId>('LST_Celsius')
  const [selected, setSelected] = useState<HeatPoint | null>(null)
  const [sidePanel, setSidePanel] = useState<SidePanel>('overview')
  const [focus, setFocus] = useState<{ lat: number; lng: number; nonce: number } | null>(null)
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)
  const nonce = useRef(0)

  const { status, points, analysis, error, fetchedAt, fromCache, reload } = useHeatmap(city)

  useEffect(() => {
    let alive = true
    void fetchHealth().then((ok) => {
      if (alive) setApiOnline(ok)
    })
    return () => {
      alive = false
    }
  }, [])

  // A fresh city invalidates whatever cell was pinned.
  useEffect(() => {
    setSelected(null)
    setSidePanel('overview')
  }, [city])

  const selectFromMap = useCallback((point: HeatPoint | null) => {
    setSelected(point)
    if (point) setSidePanel('cell')
  }, [])

  const focusPoint = useCallback((point: HeatPoint) => {
    setSelected(point)
    setSidePanel('cell')
    setFocus({ lat: point.Latitude, lng: point.Longitude, nonce: ++nonce.current })
  }, [])

  const ready = status === 'ready' && analysis !== null

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-base">
      <Header
        city={city}
        onCityChange={setCity}
        sampleCount={points.length}
        fetchedAt={fetchedAt}
        loading={status === 'loading'}
        fromCache={fromCache}
        onReload={reload}
        apiOnline={apiOnline}
      />

      <div className="flex min-h-0 flex-1">
        <Rail value={view} onChange={setView} />

        <main className="min-w-0 flex-1 overflow-hidden">
          {status === 'loading' && !analysis ? (
            <LoadingSurface cityName={city.name} />
          ) : status === 'error' && error ? (
            <ErrorState
              error={error}
              cityName={city.name}
              onRetry={reload}
              onFallback={city.id === DEFAULT_CITY.id ? undefined : () => setCity(CITIES[0])}
              fallbackLabel={city.id === DEFAULT_CITY.id ? undefined : 'Switch to Delhi'}
            />
          ) : ready && analysis ? (
            view === 'map' ? (
              // Below the breakpoint the panel stacks under the map rather than
              // disappearing — the analysis is the point of the view.
              <div className="grid h-full min-h-0 grid-cols-1 grid-rows-[minmax(280px,46vh)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_384px] lg:grid-rows-1">
                <HeatMap
                  points={points}
                  analysis={analysis}
                  city={city}
                  selected={selected}
                  onSelect={selectFromMap}
                  layerId={layerId}
                  onLayerChange={setLayerId}
                  focus={focus}
                />

                <aside className="flex min-h-0 flex-col border-t border-line bg-panel lg:border-l lg:border-t-0">
                  <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
                    <Segmented
                      ariaLabel="Side panel"
                      size="sm"
                      value={sidePanel}
                      onChange={setSidePanel}
                      options={[
                        { value: 'overview', label: 'Overview' },
                        {
                          value: 'cell',
                          label: 'Cell',
                          title: selected ? undefined : 'Click anywhere on the heat surface',
                        },
                        { value: 'extremes', label: 'Extremes' },
                      ]}
                    />
                  </div>

                  <div className="min-h-0 flex-1 overflow-hidden">
                    {sidePanel === 'overview' ? (
                      <OverviewPanel analysis={analysis} city={city} />
                    ) : sidePanel === 'extremes' ? (
                      <HotspotPanel
                        analysis={analysis}
                        onFocus={focusPoint}
                        selected={selected}
                      />
                    ) : selected ? (
                      <PointPanel
                        point={selected}
                        analysis={analysis}
                        onSimulate={(p) => {
                          setSelected(p)
                          setView('simulator')
                        }}
                        onClear={() => {
                          setSelected(null)
                          setSidePanel('overview')
                        }}
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
                        <p className="text-[12.5px] text-ink-2">No cell pinned</p>
                        <p className="text-[11.5px] leading-relaxed text-ink-3">
                          Click anywhere on the heat surface — or a row under Extremes — to read the
                          nearest measured cell: its twelve values and how each compares with the
                          city.
                        </p>
                      </div>
                    )}
                  </div>
                </aside>
              </div>
            ) : view === 'analysis' ? (
              <div className="h-full overflow-auto">
                <AnalysisView points={points} analysis={analysis} city={city} />
              </div>
            ) : (
              <Simulator analysis={analysis} city={city} seed={selected} />
            )
          ) : null}
        </main>
      </div>
    </div>
  )
}
