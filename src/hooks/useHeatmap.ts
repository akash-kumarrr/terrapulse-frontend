import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, fetchHeatmap } from '../lib/api'
import { analyse, type CityAnalysis } from '../lib/stats'
import type { City, HeatPoint } from '../lib/types'

export interface HeatmapState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  points: HeatPoint[]
  analysis: CityAnalysis | null
  error: ApiError | null
  /** Milliseconds the request took, shown so a slow city is explained. */
  elapsedMs: number
  fetchedAt: number | null
  fromCache: boolean
}

interface CacheEntry {
  points: HeatPoint[]
  analysis: CityAnalysis
  fetchedAt: number
  elapsedMs: number
}

/** A city surface costs ~25 s and ~800 KB to build, so keep it for the session. */
const cache = new Map<string, CacheEntry>()

const EMPTY: HeatmapState = {
  status: 'idle',
  points: [],
  analysis: null,
  error: null,
  elapsedMs: 0,
  fetchedAt: null,
  fromCache: false,
}

export function useHeatmap(city: City) {
  const [state, setState] = useState<HeatmapState>(EMPTY)
  const requestId = useRef(0)

  const load = useCallback(
    async (opts: { force?: boolean } = {}) => {
      const id = ++requestId.current
      const cached = cache.get(city.id)

      if (cached && !opts.force) {
        setState({
          status: 'ready',
          points: cached.points,
          analysis: cached.analysis,
          error: null,
          elapsedMs: cached.elapsedMs,
          fetchedAt: cached.fetchedAt,
          fromCache: true,
        })
        return
      }

      setState((prev) => ({
        ...prev,
        status: 'loading',
        error: null,
        // Hold the previous render rather than flashing a skeleton on refetch.
        points: opts.force ? prev.points : [],
        analysis: opts.force ? prev.analysis : null,
      }))

      const started = performance.now()
      try {
        const points = await fetchHeatmap(city.query.city, city.query.state)
        if (id !== requestId.current) return
        const analysis = analyse(points)
        const entry: CacheEntry = {
          points,
          analysis,
          fetchedAt: Date.now(),
          elapsedMs: performance.now() - started,
        }
        cache.set(city.id, entry)
        setState({
          status: 'ready',
          points,
          analysis,
          error: null,
          elapsedMs: entry.elapsedMs,
          fetchedAt: entry.fetchedAt,
          fromCache: false,
        })
      } catch (err) {
        if (id !== requestId.current) return
        setState({
          ...EMPTY,
          status: 'error',
          error:
            err instanceof ApiError
              ? err
              : new ApiError('Something went wrong loading this city.', 'upstream'),
          elapsedMs: performance.now() - started,
        })
      }
    },
    [city],
  )

  useEffect(() => {
    void load()
  }, [load])

  return { ...state, reload: () => load({ force: true }) }
}
