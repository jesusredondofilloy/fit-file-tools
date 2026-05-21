# Roadmap

## Phase 1 — MVP (parse + merge)

The minimum useful tool: upload `.fit` files on Android, merge them, download the result.

- [ ] Backend: parse `.fit` files with `fitparse`
- [ ] Backend: merge 2+ `.fit` files into a single valid `.fit` file
- [ ] Backend: `POST /api/merge` endpoint (multipart upload → file download)
- [ ] Frontend: file picker for multiple `.fit` files
- [ ] Frontend: merge button + download result
- [ ] Frontend: PWA manifest (installable on Android)
- [ ] Infrastructure: FastAPI deployed on Hetzner VM behind nginx
- [ ] Infrastructure: Frontend deployed to Vercel
- [ ] Infrastructure: TLS via Let's Encrypt

## Phase 2 — Parse & Inspect

Make it useful for understanding what's inside a file before and after merging.

- [ ] `GET /api/parse` — return structured JSON summary of a `.fit` file
- [ ] Frontend: display activity summary (distance, duration, avg HR, avg power, laps)
- [ ] Frontend: display per-record data in a table
- [ ] Support for common Garmin device profiles

## Out of Scope (for now)

- Multi-user accounts / authentication
- Strava / Garmin Connect integration
- Offline-first PWA (service worker caching)
- Native Android app

Go beyond raw data — compute meaningful training metrics.

- [ ] Heart rate zone breakdown
- [ ] Power curve (mean maximal power)
- [ ] Lap summaries with TSS / IF (if power data available)
- [ ] Export to CSV / JSON

Visual output for activity review.

- [ ] Route map (GPS track on a map)
- [ ] Charts: HR, power, speed over time
- [ ] Elevation profile