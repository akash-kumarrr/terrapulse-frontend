import type { FeatureKey } from './types'

export interface FeatureMeta {
  key: FeatureKey
  label: string
  /** Compact label for axes and dense tables. */
  short: string
  unit: string
  /** Plain-language reason this variable moves surface temperature. */
  why: string
  /** The direction physics predicts, used to flag confounded correlations. */
  expected: 'warming' | 'cooling' | 'neutral'
  /** Why this variable commonly inverts in satellite scenes of real cities. */
  inverseHint: string
  decimals: number
  /** Location columns are context, not levers you can pull in a scenario. */
  group: 'land-cover' | 'energy-balance' | 'weather' | 'location'
}

export const FEATURES: FeatureMeta[] = [
  {
    key: 'NDVI',
    label: 'Vegetation index (NDVI)',
    short: 'NDVI',
    unit: '',
    why: 'Greenness. Plants pull water up and evaporate it, spending solar energy on evaporation instead of on heating the ground.',
    inverseHint:
      'Open water and tidal flats read as near-zero greenness while being the coolest thing in the scene, so a coastal or heavily watered city can invert the land-only relationship.',
    expected: 'cooling',
    decimals: 3,
    group: 'land-cover',
  },
  {
    key: 'Building_Density',
    label: 'Building density',
    short: 'Buildings',
    unit: 'index',
    why: 'Built mass per cell. Concrete and asphalt store the daytime heat and release it slowly, and tall blocks trap radiation between them.',
    inverseHint:
      'Where the built-up index is high but so is tree cover — older, leafier districts — density stops tracking exposed hard surface.',
    expected: 'warming',
    decimals: 0,
    group: 'land-cover',
  },
  {
    key: 'Albedo',
    label: 'Surface albedo',
    short: 'Albedo',
    unit: '',
    why: 'The share of sunlight reflected straight back to the sky. Pale roofs and bare sand reflect; dark asphalt absorbs.',
    inverseHint:
      'Bright bare ground, sand and pale rooftops are also the least planted surfaces, so albedo can end up tracking the absence of vegetation rather than reflectivity.',
    expected: 'cooling',
    decimals: 3,
    group: 'land-cover',
  },
  {
    key: 'NDWI',
    label: 'Water index (NDWI)',
    short: 'NDWI',
    unit: '',
    why: 'Surface moisture and open water. Water has a huge heat capacity, so wet ground warms far more slowly than dry ground.',
    inverseHint:
      'The water index rises both for open water and for merely damp ground, and those two behave very differently under sun.',
    expected: 'cooling',
    decimals: 3,
    group: 'land-cover',
  },
  {
    key: 'Rn_NetRadiation',
    label: 'Net radiation',
    short: 'Net rad.',
    unit: 'W/m²',
    why: 'The energy actually absorbed at the surface once reflection and outgoing radiation are subtracted. Everything else is a split of this budget.',
    inverseHint:
      'Net radiation is computed from the same thermal band as temperature, so its sign follows the retrieval rather than the physics of the site.',
    expected: 'warming',
    decimals: 1,
    group: 'energy-balance',
  },
  {
    key: 'H_SensibleHeatFlux',
    label: 'Sensible heat flux',
    short: 'Sensible H',
    unit: 'W/m²',
    why: 'Energy leaving the surface as warmth you can feel in the air. A high value alongside low vegetation is the signature of a hard, dry surface.',
    inverseHint:
      'Sensible heat is a modelled split of the same energy budget, so it inherits whatever the retrieval assumed.',
    expected: 'warming',
    decimals: 1,
    group: 'energy-balance',
  },
  {
    key: 'G_SoilHeatFlux',
    label: 'Soil heat flux',
    short: 'Soil G',
    unit: 'W/m²',
    why: 'Energy conducted downward into the ground and released again after dark — the mechanism behind night-time heat release.',
    inverseHint:
      'Soil heat flux is a modelled fraction of net radiation, so it moves with that term rather than independently.',
    expected: 'warming',
    decimals: 1,
    group: 'energy-balance',
  },
  {
    key: 'total_precipitation_hourly',
    label: 'Precipitation',
    short: 'Rain',
    unit: 'mm/h',
    why: 'Recent rainfall. A wet surface spends its energy evaporating water rather than raising its own temperature.',
    inverseHint:
      'Rainfall is nearly uniform across a single city scene, so its correlation is driven by where the small remaining variation happens to fall.',
    expected: 'cooling',
    decimals: 6,
    group: 'weather',
  },
  {
    key: 'u_component_of_wind_10m',
    label: 'Wind — eastward',
    short: 'Wind u',
    unit: 'm/s',
    why: 'Eastward wind at 10 m. Moving air carries heat away from the surface and mixes hot pockets into the wider atmosphere.',
    inverseHint:
      'Wind barely varies across one city at one moment, so this mostly encodes which side of the city a cell is on.',
    expected: 'cooling',
    decimals: 3,
    group: 'weather',
  },
  {
    key: 'v_component_of_wind_10m',
    label: 'Wind — northward',
    short: 'Wind v',
    unit: 'm/s',
    why: 'Northward wind at 10 m. Together with the eastward component it sets which neighbourhoods sit downwind of the hottest ground.',
    inverseHint:
      'Wind barely varies across one city at one moment, so this mostly encodes which side of the city a cell is on.',
    expected: 'cooling',
    decimals: 3,
    group: 'weather',
  },
  {
    key: 'Latitude',
    label: 'Latitude',
    short: 'Lat',
    unit: '°N',
    why: 'Where in the city the sample sits.',
    inverseHint:
      'Position alone carries no mechanism.',
    expected: 'neutral',
    decimals: 4,
    group: 'location',
  },
  {
    key: 'Longitude',
    label: 'Longitude',
    short: 'Lon',
    unit: '°E',
    why: 'Where in the city the sample sits.',
    inverseHint:
      'Position alone carries no mechanism.',
    expected: 'neutral',
    decimals: 4,
    group: 'location',
  },
]

export const FEATURE_BY_KEY = Object.fromEntries(
  FEATURES.map((f) => [f.key, f]),
) as Record<FeatureKey, FeatureMeta>

/** Variables a planner can actually change; location is fixed by the pin. */
export const LEVER_FEATURES = FEATURES.filter((f) => f.group !== 'location')

export const FEATURE_GROUPS: { id: FeatureMeta['group']; label: string }[] = [
  { id: 'land-cover', label: 'Land cover' },
  { id: 'energy-balance', label: 'Surface energy balance' },
  { id: 'weather', label: 'Weather' },
  { id: 'location', label: 'Location' },
]
