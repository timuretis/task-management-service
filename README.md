# Task Management Service

REST API and React client for managing tasks, deployed to AWS.

## Live URL
## Local setup
Requires Node 24 (see `.nvmrc`).

```bash
npm ci
cp .env.example .env   # PORT, NODE_ENV, CORS_ORIGIN
npm run build -w api
npm run start:dev -w api
```

The API listens on `http://localhost:3000`:
`GET /health`, `GET /tasks`, `POST /tasks` with `{ "title": "...", "description": "..." }`.
Data is kept in memory until the database arrives in phase 2.

## Running tests
```bash
bash scripts/verify.sh   # lint, unit + e2e tests with coverage (80% gate), build
```
## Deployment
## System Architecture
### Scalability (10x traffic)
### Observability
### AI Utilization
