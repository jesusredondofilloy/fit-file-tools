# fit-file-tools

A web-based tool for working with Garmin `.fit` files — parse, merge, and analyze your activity data from any device.

## Features

- **Parse** `.fit` files from Garmin devices
- **Merge** multiple `.fit` files into one (primary use case)
- Installable as a **Progressive Web App (PWA)** on Android
- Data stays on **your own server** — no third-party cloud

## Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12 + FastAPI |
| Parsing | `fitparse` |
| Frontend | React + Vite (PWA) |
| Backend hosting | Hetzner VM |
| Frontend hosting | Vercel |

## Project Structure

```
fit-file-tools/
├── backend/          # Python FastAPI server
│   ├── parser/       # .fit file parsing
│   ├── merger/       # merge logic
│   └── api/          # REST endpoints
├── frontend/         # React PWA
└── docs/
```

## Quick Start

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn api.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Deployment

- **Backend**: FastAPI on Hetzner VM, served via nginx + systemd
- **Frontend**: Vercel (auto-deploy from `main` branch)
- **PWA**: Installable on Android via "Add to home screen" in Chrome

## License

MIT — see [LICENSE](./LICENSE)
