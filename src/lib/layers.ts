import { HEAT_LUT, HEAT_RAMP, SEQ_BLUE, SEQ_BLUE_LUT } from './colors'

export type LayerId = 'LST_Celsius' | 'NDVI' | 'Building_Density' | 'Albedo'

export interface MapLayerDef {
  id: LayerId
  label: string
  /** Short name for the legend caption. */
  caption: string
  unit: string
  decimals: number
  stops: readonly string[]
  lut: Uint8ClampedArray
  /** What a reader should take away from this layer. */
  note: string
}

export const MAP_LAYERS: MapLayerDef[] = [
  {
    id: 'LST_Celsius',
    label: 'Land surface temperature',
    caption: 'Surface temperature',
    unit: '°C',
    decimals: 1,
    stops: HEAT_RAMP,
    lut: HEAT_LUT,
    note: 'The measured skin temperature of the ground, roofs and roads — not the air temperature a thermometer reads.',
  },
  {
    id: 'NDVI',
    label: 'Vegetation (NDVI)',
    caption: 'Vegetation index',
    unit: '',
    decimals: 2,
    stops: SEQ_BLUE,
    lut: SEQ_BLUE_LUT,
    note: 'Greenness. Compare against the temperature layer: the cool corridors and the green ones tend to be the same places.',
  },
  {
    id: 'Building_Density',
    label: 'Built-up density',
    caption: 'Building density',
    unit: '',
    decimals: 0,
    stops: SEQ_BLUE,
    lut: SEQ_BLUE_LUT,
    note: 'Built mass per cell. The densest cores usually sit under the hottest part of the temperature layer.',
  },
  {
    id: 'Albedo',
    label: 'Surface albedo',
    caption: 'Albedo',
    unit: '',
    decimals: 3,
    stops: SEQ_BLUE,
    lut: SEQ_BLUE_LUT,
    note: 'Reflectivity. Bright surfaces send sunlight back to the sky before it can become heat.',
  },
]
