# Architecture

## Overview

fit-file-tools is a full-stack web application with a split deployment: a Python backend on a self-hosted Hetzner VM and a React PWA frontend on Vercel. The primary design goal is to keep fitness data under the user's control while remaining accessible from a mobile device.

## System Diagram

```
Android (PWA)
     │
     │  HTTPS
     ▼
 Vercel CDN
 (React PWA)
     │
     │  HTTPS / REST
     ▼
 Hetzner VM
 nginx (reverse proxy)
     │
     ▼
 FastAPI (uvicorn)
 ├── /api/parse
 └── /api/merge
```

## Components

### Backend — Python + FastAPI (`/backend`)

Runs on the Hetzner VM. Handles all file processing.

- **`parser/`** — wraps `fitparse` to decode binary `.fit` files into structured Python dicts. Exposes activity metadata, records, laps, and device info.
- **`merger/`** — merges two or more parsed `.fit` files into a single valid `.fit` file. Handles timestamp reordering and message deduplication.
- **`api/`** — FastAPI application with endpoints for upload, parse, merge, and download. Multipart file uploads, streaming responses for large files.

File storage is ephemeral: uploaded files are processed in memory or in a temp directory and deleted immediately after the response is sent. No fitness data is persisted on the server.

### Frontend — React + Vite (`/frontend`)

Deployed to Vercel as a static PWA.

- `manifest.json` makes it installable on Android via Chrome's "Add to home screen"
- Communicates with the backend API over HTTPS
- File picker supports selecting multiple `.fit` files from device storage
- Download triggers a browser file save after processing

### Infrastructure

| Component | Provider | Notes |
|---|---|---|
| Backend server | Hetzner VM | nginx + systemd service |
| Frontend CDN | Vercel | Auto-deploy from `main` |
| TLS | Let's Encrypt | Managed by certbot on Hetzner |
| Domain | TBD | Pointed to both Vercel and Hetzner |

## Data Flow — Merge

```
User selects 2+ .fit files on Android
        │
        ▼
Frontend sends multipart POST /api/merge
        │
        ▼
Backend: parse each file with fitparse
        │
        ▼
Merge: sort all records by timestamp,
       deduplicate session/device messages
        │
        ▼
Encode merged data back to .fit binary
        │
        ▼
Stream response → browser downloads file
        │
        ▼
Temp files deleted from server
```

## Key Dependencies

| Package | Purpose |
|---|---|
| `fitparse` | Decode `.fit` binary format |
| `fastapi` | Async HTTP framework |
| `uvicorn` | ASGI server |
| `python-multipart` | Multipart file upload support |

## Security Considerations

- No user accounts or authentication in v1 (single-user / personal tool)
- Files are never written to persistent storage
- CORS restricted to the Vercel frontend origin
- Rate limiting via nginx to prevent abuse
