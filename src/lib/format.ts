export function fmt(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—'
  // Very small magnitudes (hourly precipitation) would round to 0.00.
  if (value !== 0 && Math.abs(value) < 0.001 && decimals <= 4) {
    return value.toExponential(1).replace('e-', '×10⁻')
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function fmtTemp(value: number, decimals = 1): string {
  return Number.isFinite(value) ? `${fmt(value, decimals)} °C` : '—'
}

export function fmtPercent(fraction: number, decimals = 1): string {
  return Number.isFinite(fraction) ? `${fmt(fraction * 100, decimals)}%` : '—'
}

export function fmtCoord(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(4)}° ${
    lon >= 0 ? 'E' : 'W'
  }`
}

export function fmtDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`
}
