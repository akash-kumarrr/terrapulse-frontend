/**
 * Colour scales for TerraPulse.
 *
 * The LST scale is a *semantic heat* ramp — the one documented exception to
 * the one-hue sequential rule, and it always ships with a scale legend. It is
 * inferno-family: monotone in lightness (validated), hue spread only 23°, so
 * it reads as a single continuous heat scale rather than a rainbow. On the
 * dark basemap the cool end recedes and the hot end glows, which is the
 * correct dark-mode anchor for a sequential encoding.
 */

/** 9 stops, cool → hot. Used for the map surface and its legend. */
export const HEAT_RAMP = [
  '#160b39',
  '#420a68',
  '#6a176e',
  '#932667',
  '#ba3655',
  '#dd513a',
  '#f37819',
  '#fac228',
  '#fcffa4',
] as const

/**
 * The same ramp clipped to the steps that clear the 2:1 contrast floor
 * against the panel surface (#121417). Used for ordinal chart marks —
 * histogram bins — so the chart and the map read as one scale.
 */
export const CHART_HEAT_RAMP = [
  '#7d1e6d',
  '#a02c62',
  '#c03a51',
  '#dd513a',
  '#f37819',
  '#fac228',
] as const

/**
 * Single-hue sequential ramp for the driver layers (vegetation, built-up
 * density, albedo). Blue, stepped from the documented ramp and ordered
 * dark → light: in dark mode the low end is the one that recedes into the
 * surface, so the anchor flips relative to a light-mode chart.
 */
export const SEQ_BLUE = [
  '#0d366b',
  '#184f95',
  '#256abf',
  '#3987e5',
  '#5598e7',
  '#86b6ef',
  '#b7d3f6',
  '#cde2fb',
] as const

/** Diverging poles for "warmer / cooler than the city mean". */
export const DIVERGING = {
  cool: '#3987e5',
  mid: '#383835',
  warm: '#e66767',
} as const

export const SERIES = {
  s1: '#3987e5',
  s2: '#d95926',
  s3: '#199e70',
  s4: '#c98500',
} as const

type RGB = [number, number, number]

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex([r, g, b]: RGB): string {
  return `#${((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b))
    .toString(16)
    .slice(1)}`
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t)

function sampleRamp(stops: readonly string[], t: number): RGB {
  const rgbStops = stops.map(hexToRgb)
  const x = clamp01(t) * (rgbStops.length - 1)
  const i = Math.min(Math.floor(x), rgbStops.length - 2)
  return mix(rgbStops[i], rgbStops[i + 1], x - i)
}

/** 256-entry lookups so the canvas surface never re-interpolates per pixel. */
function buildLut(stops: readonly string[]): Uint8ClampedArray {
  const lut = new Uint8ClampedArray(256 * 3)
  for (let i = 0; i < 256; i++) {
    const [r, g, b] = sampleRamp(stops, i / 255)
    lut[i * 3] = r
    lut[i * 3 + 1] = g
    lut[i * 3 + 2] = b
  }
  return lut
}

export const HEAT_LUT = buildLut(HEAT_RAMP)
export const SEQ_BLUE_LUT = buildLut(SEQ_BLUE)

export function heatRgb(t: number): RGB {
  const i = Math.round(clamp01(t) * 255) * 3
  return [HEAT_LUT[i], HEAT_LUT[i + 1], HEAT_LUT[i + 2]]
}

export function heatHex(t: number): string {
  return rgbToHex(heatRgb(t))
}

export function rampHex(stops: readonly string[], t: number): string {
  return rgbToHex(sampleRamp(stops, t))
}

/** Bin index → colour for ordinal chart marks. */
export function chartHeatHex(t: number): string {
  const i = Math.min(CHART_HEAT_RAMP.length - 1, Math.floor(clamp01(t) * CHART_HEAT_RAMP.length))
  return CHART_HEAT_RAMP[i]
}

/**
 * Diverging colour for a signed, normalised value (−1 … +1).
 * Weak values stay near the neutral midpoint but keep a visibility floor so a
 * small bar is still readable against the panel.
 */
export function divergingHex(value: number, domain = 1): string {
  const t = clamp01(Math.abs(value) / domain)
  const pole = hexToRgb(value < 0 ? DIVERGING.cool : DIVERGING.warm)
  return rgbToHex(mix(hexToRgb(DIVERGING.mid), pole, 0.3 + 0.7 * t))
}

export { hexToRgb, rgbToHex }
