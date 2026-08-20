import type {
  EnvironmentalFeatures,
  HeatPoint,
  PredictionResponse,
  PredictionResult,
} from './types'

const BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'https://terrapulse.fastapicloud.dev'
).replace(/\/$/, '')

export type ApiErrorKind = 'network' | 'timeout' | 'upstream' | 'earth-engine' | 'parse'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number
  /** The raw server text, kept so the UI can offer a "details" disclosure. */
  readonly detail?: string

  constructor(message: string, kind: ApiErrorKind, status?: number, detail?: string) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.detail = detail
  }
}

/** The backend hands back JSON-encoded JSON. Unwrap either shape. */
function unwrap<T>(value: unknown, label: string): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      throw new ApiError(`Could not read the ${label} payload.`, 'parse')
    }
  }
  if (value && typeof value === 'object') return value as T
  throw new ApiError(`The ${label} payload was empty.`, 'parse')
}

function describeFailure(status: number, body: string): ApiError {
  let detail = body
  try {
    const parsed = JSON.parse(body)
    if (typeof parsed?.detail === 'string') detail = parsed.detail
  } catch {
    /* keep the raw body */
  }

  // The server shells out to Earth Engine for any city it has not cached.
  if (/gcloud|earth-?engine|credential/i.test(detail)) {
    throw new ApiError(
      'The server could not reach Google Earth Engine, so this city could not be composited.',
      'earth-engine',
      status,
      detail,
    )
  }
  return new ApiError(detail || `Request failed with status ${status}.`, 'upstream', status, detail)
}

async function post(path: string, init?: RequestInit, timeoutMs = 180_000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      signal: controller.signal,
      ...init,
    })
    if (!res.ok) throw describeFailure(res.status, await res.text())
    return res
  } catch (err) {
    if (err instanceof ApiError) throw err
    if ((err as Error)?.name === 'AbortError') {
      throw new ApiError(
        'The request timed out. Building a city surface can take a couple of minutes.',
        'timeout',
      )
    }
    throw new ApiError('Could not reach the TerraPulse API.', 'network')
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchHeatmap(city: string, state: string): Promise<HeatPoint[]> {
  const res = await post(
    `/heatmap/heatmap_data?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`,
  )
  const body = (await res.json()) as { data?: unknown }
  const points = unwrap<HeatPoint[]>(body.data, 'heatmap')
  if (!Array.isArray(points) || points.length === 0) {
    throw new ApiError('The heatmap came back with no sample points.', 'parse')
  }
  return points.filter((p) => Number.isFinite(p.Latitude) && Number.isFinite(p.Longitude))
}

export async function predictLst(
  features: EnvironmentalFeatures,
  city: string,
  state: string,
): Promise<PredictionResponse> {
  const res = await post(
    `/model/predict_lst?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`,
    {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(features),
    },
    60_000,
  )
  const body = (await res.json()) as Omit<PredictionResponse, 'result'> & { result: unknown }
  const result = unwrap<PredictionResult>(body.result, 'prediction')
  if (!Number.isFinite(result?.outputs?.predicted_lst_celsius)) {
    throw new ApiError('The model did not return a temperature.', 'parse')
  }
  return { ...body, result }
}

export async function fetchHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health/status`, {
      signal: AbortSignal.timeout(8000),
    })
    return res.ok
  } catch {
    return false
  }
}

export { BASE_URL }
