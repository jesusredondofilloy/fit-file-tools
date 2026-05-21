# AGENTS.md

Instructions for AI coding agents (Claude Code, Copilot, etc.) working on this repository.

## Project Summary

fit-file-tools is a full-stack web app for parsing and merging Garmin `.fit` files.
- **Backend**: Python 3.12 + FastAPI, runs on a Hetzner VM
- **Frontend**: React + Vite PWA, deployed to Vercel
- Primary use case: merging two or more `.fit` files on Android via the installed PWA

See `ARCHITECTURE.md` for the full system design and data flow.

## Directory Layout

```
backend/
  api/          FastAPI app (main.py, routers)
  parser/       fitparse wrappers — decode .fit → Python dicts
  merger/       merge logic — combine parsed files into one .fit
  tests/        pytest tests
  requirements.txt
frontend/
  src/
  public/
    manifest.json   PWA manifest — do not remove
  package.json
  vite.config.ts
docs/           Additional documentation
```

## Development Setup

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # dev server on :5173
npm run build      # production build → dist/
```

## Running Tests

```bash
# backend
cd backend && pytest

# frontend
cd frontend && npm test
```

## Key Constraints

- **No persistent file storage**: uploaded `.fit` files must be processed in memory or a temp dir and deleted immediately after the response. Never write user fitness data to disk permanently.
- **CORS**: the FastAPI app must only allow the Vercel frontend origin (and `localhost` for dev). Do not open CORS to `*` in production.
- **PWA manifest**: `frontend/public/manifest.json` is required for Android installability. Do not remove or rename it.
- **Python version**: 3.12+. Do not use deprecated `fitparse` APIs.
- **No auth in v1**: this is a personal single-user tool. Do not add authentication complexity unless explicitly asked.

## Code Conventions

### Python (backend)
- Type hints on all function signatures
- Pydantic models for all request/response schemas
- Async endpoints (`async def`) throughout
- No print statements — use `logging`
- File processing logic lives in `parser/` and `merger/`, not in API route handlers

### TypeScript (frontend)
- Strict mode enabled
- No `any` types
- Components in `src/components/`, API calls in `src/api/`
- The PWA must remain installable — do not break `manifest.json` or service worker config

## Deployment Notes

- Backend is deployed as a systemd service on Hetzner, fronted by nginx
- Frontend auto-deploys to Vercel from the `main` branch
- Environment variables: backend reads `ALLOWED_ORIGINS` for CORS config; frontend reads `VITE_API_URL` for the backend URL

## Common Tasks

**Add a new API endpoint**: create a router in `backend/api/routers/`, register it in `backend/api/main.py`, add a corresponding function in `src/api/` on the frontend.

**Add a new `.fit` processing feature**: implement it in `backend/parser/` or `backend/merger/`, write a pytest test against a real `.fit` file in `backend/tests/fixtures/`, then expose it via a new or existing endpoint.

**Test with real data**: place sample `.fit` files in `backend/tests/fixtures/` (gitignored by default — do not commit real activity files).
