/** One sampled pixel of the city returned by /heatmap/heatmap_data. */
export interface HeatPoint {
  Albedo: number
  Building_Density: number
  LST_Celsius: number
  NDVI: number
  NDWI: number
  total_precipitation_hourly: number
  u_component_of_wind_10m: number
  v_component_of_wind_10m: number
  Longitude: number
  Latitude: number
  Rn_NetRadiation: number
  G_SoilHeatFlux: number
  H_SensibleHeatFlux: number
}

/** Every column except the target itself. */
export type FeatureKey = Exclude<keyof HeatPoint, 'LST_Celsius'>

/** Request body for /model/predict_lst. */
export type EnvironmentalFeatures = Record<FeatureKey, number>

export interface PredictionResult {
  status: string
  inputs: Partial<EnvironmentalFeatures>
  outputs: {
    predicted_lst_celsius: number
    unit: string
  }
}

export interface PredictionResponse {
  city: string
  state: string
  gee_project_id: string
  result: PredictionResult
}

export interface City {
  id: string
  name: string
  state: string
  /** Backend query values — these are what the API is keyed on. */
  query: { city: string; state: string }
  center: [number, number]
  /** True when the API serves this city from a cached build; false when it
   *  is composited on demand through Earth Engine and can fail. */
  precomputed: boolean
}
