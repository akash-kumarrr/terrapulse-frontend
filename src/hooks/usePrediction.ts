import { useCallback, useRef, useState } from 'react'
import { ApiError, predictLst } from '../lib/api'
import type { City, EnvironmentalFeatures } from '../lib/types'

export interface Scenario {
  id: string
  label: string
  features: EnvironmentalFeatures
  predictedLst: number
  /** Observed LST at the map cell this scenario started from, when there is one. */
  baselineLst: number | null
  elapsedMs: number
  createdAt: number
}

export function usePrediction(city: City) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const counter = useRef(0)

  const predict = useCallback(
    async (
      features: EnvironmentalFeatures,
      meta: { label: string; baselineLst: number | null },
    ): Promise<Scenario | null> => {
      setPending(true)
      setError(null)
      const started = performance.now()
      try {
        const res = await predictLst(features, city.query.city, city.query.state)
        return {
          id: `s${++counter.current}`,
          label: meta.label,
          features,
          predictedLst: res.result.outputs.predicted_lst_celsius,
          baselineLst: meta.baselineLst,
          elapsedMs: performance.now() - started,
          createdAt: Date.now(),
        }
      } catch (err) {
        setError(
          err instanceof ApiError ? err : new ApiError('The prediction failed.', 'upstream'),
        )
        return null
      } finally {
        setPending(false)
      }
    },
    [city],
  )

  return { predict, pending, error, clearError: () => setError(null) }
}
