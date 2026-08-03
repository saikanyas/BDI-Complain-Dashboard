# BDI Complaint Dashboard

BDI Complaint Dashboard is a hackathon prototype for visualising, classifying and analysing municipal complaint data. It combines a Next.js dashboard with a FastAPI service for complaint intake, tracking, prediction, administration, map data, geocoding and route planning.

> Thai note: ระบบนี้เป็น prototype สำหรับการสาธิตและพัฒนาต่อ ข้อมูลคำร้องและรูปภาพต้องผ่านการตรวจสอบสิทธิ์และความเป็นส่วนตัวก่อนเผยแพร่หรือใช้งานจริง

## What it provides

- Dashboard KPIs, trends, status and priority summaries
- Complaint category, district, community and department analysis
- Complaint submission and public tracking flows
- Admin login, complaint completion, department updates and audit logging
- Prediction and hotspot views backed by the FastAPI service
- Map visualisation, community geocoding and route planning through external services
- Static JSON snapshots in `public/data/` for fast dashboard rendering

This repository does not claim to be a production municipal system. The dataset, model outputs and external-service integrations should be treated as prototype/demo assets until their provenance, privacy and operating requirements are approved.

## Tech stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS, Recharts, Leaflet
- Backend: Python, FastAPI, Uvicorn, pandas, scikit-learn, pythainlp
- Data: CSV source data, generated JSON snapshots, audit log and optional image uploads
- External services: Nominatim for geocoding and OSRM for route planning
- Package managers: npm for the frontend and pip for the backend

## Repository structure

```text
app/                 Next.js routes and pages
components/          Shared UI, charts, map and routing components
public/data/         Dashboard JSON snapshots
api/main.py          FastAPI application and API routes
api/model.py         Data loading, models and prediction helpers
api/geocoding.py     Community geocoding with local cache and fallback
api/routing_engine.py Route planning through OSRM
api/data/             CSV data, audit log and geocoding cache
api/uploads/          Prototype image uploads
models/               Model/result artifacts used by routing support
```

## Requirements

- Node.js 20 or newer
- npm
- Python 3.11 or newer (use a deployment runtime supported by all listed packages)
- Internet access for uncached geocoding and route requests

## Frontend setup

From the repository root:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

For a production build:

```bash
npm run build
npm run start
```

The frontend uses `http://localhost:8000` as the default API URL. Set `NEXT_PUBLIC_API_URL` when the backend is hosted elsewhere.

## Backend setup

From the repository root:

```bash
python -m venv .venv
```

Activate the environment, then install dependencies:

```bash
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r api/requirements.txt

# macOS/Linux
source .venv/bin/activate
pip install -r api/requirements.txt
```

Configure the required admin authentication values before starting the API. Do not use the example values in a real deployment.

```bash
ADMIN_USERS="admin:replace-me"
ADMIN_SECRET="replace-with-a-long-random-value"
```

Then run the service from the `api` directory because the application imports sibling modules:

```bash
cd api
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The health endpoint is `http://localhost:8000/health`.

Optional AI answers require `ANTHROPIC_API_KEY`. Without it, the API uses its built-in fallback response mode.

## Environment variables

Copy `.env.example` to a local environment file or configure the variables in the hosting platform. Never commit `.env` or real credentials.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | No | Frontend URL for the FastAPI service |
| `CORS_ORIGINS` | No | Comma-separated browser origins allowed to call the API |
| `ADMIN_USERS` | For admin actions | Comma-separated `username:password` pairs |
| `ADMIN_SECRET` | For admin actions | Secret used to sign admin tokens |
| `ANTHROPIC_API_KEY` | No | Optional AI answer mode |

## Data and privacy

The application can use complaint records, locations, audit entries and uploaded images. Before publishing a repository or deploying it publicly:

1. Confirm the legal basis and ownership of every dataset and image.
2. Remove or anonymise names, house numbers, contact details and other identifying information.
3. Replace operational data with synthetic mock data when public sharing is not approved.
4. Rotate any credential that has ever been committed.
5. Keep the repository private until this review is complete.

The checked-in JSON files are dashboard snapshots; they are not a substitute for a governed production data store. There is currently no database migration or production persistence design in this prototype.

This sanitized demo branch contains synthetic complaint records, synthetic locations and mock SVG images only. Do not replace them with operational records, personal information or user-uploaded images before a separate privacy review.

## Validation

Recommended checks before opening a pull request:

```bash
npm install
npm run lint
npm run build
python -m compileall api
```

Also verify that the backend imports and starts in a clean virtual environment, that the frontend can reach the configured API, and that routing/geocoding still work with both cached and uncached locations.

## Known limitations

- The default dashboard pages are statically built from JSON snapshots; there is no automatic CSV-to-JSON generator in the application yet.
- The sentiment snapshot is not recomputed by the application from the CSV source; validate or regenerate it before using sentiment findings operationally.
- The static snapshots are generated from the synthetic CSV for this demo branch and are not an automatic CSV-to-JSON sync pipeline.
- Model training and prediction happen in the API process and are not designed for horizontal scaling.
- Rate limiting is in memory and is suitable only for a single-process prototype.
- Nominatim and OSRM are external public services with rate limits and availability constraints.
- The current prototype does not provide a production database, background jobs, deployment secrets management or automated end-to-end tests.
- The production build and lint checks pass on this branch, but there are no automated end-to-end tests.

## License and repository status

No open-source license is included. Do not assume permission to redistribute the source, dataset or images.

This branch is intended for safe integration review. It is based on the latest fetched `origin/main`, preserves the routing/geocoding features already present there, and should be merged into the default branch only after security, privacy and clean-environment tests pass.
