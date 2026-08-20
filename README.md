# TerraPulse

Urban land-surface-temperature intelligence. Maps where a city is hot and cool,
explains which ground conditions that heat travels with, and lets you push those
conditions through the prediction model to see what the surface temperature
becomes.

React · Vite · TypeScript · Leaflet · Tailwind v4. No UI kit, no chart library —
the charts are hand-built SVG so the marks follow one spec.

## Running it

```bash
npm install
```

```bash
npm run dev
```

The app talks straight to `https://terrapulse.fastapicloud.dev`; the API sends
`access-control-allow-origin: *`, so no proxy is needed. Point it somewhere else
with an env var:

```bash
echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local
```

## The three views

**Heat map** — a single continuous temperature field over a dark basemap. No
dots, pins or markers: the individual observations are never drawn, only the
blended surface they produce. Switch the field between temperature, vegetation,
built-up density and albedo to see the drivers over the same ground. Clicking
anywhere resolves to the nearest measured cell and opens its twelve values.

**Analysis** — distribution of temperature, the correlation of every variable
against it, the shape of the relationship for whichever driver you select, and
a zone profile splitting the city into equal thirds by temperature. Every chart
has a table twin.

**Simulator** — the twelve model inputs as sliders, seeded from a real place
(a pinned cell, the city average, the hottest or coolest cell). Presets express
actual interventions — tree canopy, cool roofs, dense redevelopment, post-rain
conditions. Runs accumulate so you can compare them.

## Things worth knowing about the data

- **The heatmap endpoint is slow and large.** Delhi takes ~25 s and returns
  ~800 KB. Responses are cached per city for the session, and the loading state
  shows elapsed time rather than an indefinite spinner.
- **`data` and `result` are JSON-encoded JSON.** Both need a second parse;
  `lib/api.ts` unwraps either shape.
- **Delhi is cached server-side; other cities are composited on demand** through
  Earth Engine and take longer. That path is intermittently unavailable — when
  it fails the API returns a `gcloud command not found` auth error, which the UI
  reports as an Earth Engine failure with the raw response behind a disclosure.
- **The model's absolute output can sit well below the observed temperature**
  for the same location. The simulator therefore leads with the difference
  between scenarios and shows the observed value beside the prediction.

## How the map surface is built

The API returns ~2,000 irregularly scattered cells, not a grid, so a continuous
surface has to be interpolated. `lib/surface.ts` indexes the points into a
uniform grid (CSR layout over typed arrays) and answers per-pixel k-nearest
queries with an expanding ring search; `SurfaceLayer` samples that field on a
coarse lattice inside each map tile and lets the canvas scale it up.

Two rules keep it honest:

1. Every estimate is an inverse-distance blend of the **14 nearest real
   samples** — it never extrapolates a trend past the values that are actually
   there. The weighting is regularised (`w = 1/(d² + s²)`, with `s` about one
   sample spacing) rather than plain `1/d²`: the unregularised form goes
   singular at each observation and paints a bull's-eye there, which makes the
   field read as a scatter of hard circles instead of a continuous surface.
   Measured on the Delhi data, that artefact drops from 0.99 °C to 0.08 °C.
2. Anywhere further than ~3 km from a real sample is left transparent, so the
   surface stops where the evidence stops instead of inventing coverage.

The lattice is computed with a one-sample border on each side and the scale-up
is offset by exactly that border, so neighbouring tiles blend rather than seam.

The indexed sampler is verified against a brute-force reference over the real
Delhi dataset: identical values to the bit across 4,000 random queries,
identical coverage masking, no values outside the observed range, and a
nearest-observation lookup that agrees with an exhaustive search on 800/800
clicks. (Regularised weighting deliberately does not snap to a sample's own
value — that snap is what produced the bull's-eyes.)

## Colour

Temperature uses a semantic heat ramp (inferno-family, monotone in lightness,
23° of hue spread) with a scale legend — the one case where a multi-hue
sequential scale is the right call. The driver layers use a single-hue blue
ramp. Correlations use a diverging blue↔red scale with a neutral grey midpoint,
because polarity is the story there. Every scale was validated against the panel
surface for lightness band, chroma, colour-vision separation and contrast before
being used.

## Layout

```
src/
  lib/          api client, stats and narrative, colour scales, spatial index
  hooks/        data fetching, prediction, element measurement
  components/
    map/        Leaflet layers — interpolated surface, scale legend
    charts/     hand-built SVG charts
    panels/     overview, selected cell, extremes, simulator
    views/      analysis grid
    layout/     header, view rail
    ui/         card, chart card with table twin, controls, slider, states
```
