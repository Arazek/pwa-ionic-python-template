# PWA Template — Architecture Definition

## Overview

A mobile-first Progressive Web App template built as a monorepo. Designed for personal reuse
as a production-ready starting point. All services run in Docker; local and prod environments
share the same compose structure with environment-level overrides.

---

## Tech Stack

| Layer          | Technology                          | Version  |
|----------------|-------------------------------------|----------|
| Frontend       | Ionic + Angular                     | v8 / v19 |
| State Mgmt     | NgRx                                | v19      |
| Native Bridge  | Capacitor                           | v6       |
| Backend        | FastAPI (Python)                    | 0.115.x  |
| ORM            | SQLAlchemy (async)                  | 2.x      |
| Migrations     | Alembic                             | latest   |
| Auth           | Keycloak (social: Google, Facebook) | 26.x     |
| Database       | PostgreSQL                          | v17      |
| DB Admin       | pgAdmin 4                           | latest   |
| Reverse Proxy  | Traefik                             | v3       |
| Containerization | Docker + Docker Compose           | latest   |
| Component Docs  | Storybook                         | v8       |

---

## Services & Routing

All traffic enters through Traefik on `https://localhost`.

```
https://localhost/           → frontend  (Angular PWA — nginx)
https://localhost/api/       → backend   (FastAPI)
https://localhost/auth/      → keycloak  (Keycloak server)
https://localhost/pgadmin/   → pgadmin   (pgAdmin 4)
https://localhost:8080/      → traefik   (Traefik dashboard — dev only)
```

TLS:
- **Local**: Traefik self-signed certificate (auto-generated, browser will warn once)
- **Prod**: Traefik ACME / Let's Encrypt (env variable toggle)

---

## Monorepo Directory Structure

```
pwa-template/
├── frontend/                        # Ionic/Angular PWA + Capacitor
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/                # Auth, HTTP interceptors, guards, error handling
│   │   │   │   ├── auth/            # Keycloak service, auth guard, token interceptor
│   │   │   │   └── interceptors/    # HTTP error interceptor
│   │   │   ├── features/            # Feature slices (one folder per domain)
│   │   │   │   └── example/         # Example feature (full NgRx pattern)
│   │   │   │       ├── components/
│   │   │   │       ├── pages/
│   │   │   │       ├── store/
│   │   │   │       │   ├── example.actions.ts
│   │   │   │       │   ├── example.effects.ts
│   │   │   │       │   ├── example.reducer.ts
│   │   │   │       │   ├── example.selectors.ts
│   │   │   │       │   └── example.state.ts
│   │   │   │       └── example.routes.ts
│   │   │   ├── shared/              # Shared components, pipes, directives
│   │   │   ├── store/               # Root NgRx store registration
│   │   │   │   └── app.state.ts
│   │   │   ├── app.config.ts        # Standalone app config (provideRouter, provideStore...)
│   │   │   └── app.routes.ts        # Root routes (lazy-loaded features)
│   │   ├── environments/
│   │   │   ├── environment.ts       # Local dev
│   │   │   └── environment.prod.ts  # Production
│   │   └── theme/                   # Ionic/SCSS global theme
│   ├── android/                     # Capacitor Android (generated)
│   ├── ios/                         # Capacitor iOS (generated)
│   ├── capacitor.config.ts
│   ├── angular.json
│   ├── package.json
│   └── Dockerfile                   # Multi-stage: build → nginx
│
├── backend/                         # FastAPI Python API
│   ├── app/
│   │   ├── main.py                  # FastAPI app factory, lifespan, CORS
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── router.py        # Aggregates all v1 endpoint routers
│   │   │       └── endpoints/
│   │   │           ├── health.py    # GET /api/v1/health
│   │   │           └── example.py   # Example CRUD endpoints
│   │   ├── core/
│   │   │   ├── config.py            # Settings via pydantic-settings (.env)
│   │   │   ├── security.py          # JWT verification via Keycloak JWKS
│   │   │   └── dependencies.py      # FastAPI dependencies (current_user, db session)
│   │   ├── db/
│   │   │   ├── base.py              # SQLAlchemy declarative base
│   │   │   ├── session.py           # Async engine + session factory
│   │   │   └── init_db.py           # DB initialization helper
│   │   ├── models/                  # SQLAlchemy ORM models
│   │   │   └── example.py
│   │   └── schemas/                 # Pydantic request/response schemas
│   │       └── example.py
│   ├── alembic/
│   │   ├── versions/                # Migration files
│   │   └── env.py
│   ├── alembic.ini
│   ├── requirements.txt
│   └── Dockerfile
│
├── infra/
│   ├── traefik/
│   │   ├── traefik.yml              # Static config (entrypoints, providers, TLS)
│   │   ├── dynamic/
│   │   │   └── tls.yml              # Dynamic TLS config (local self-signed)
│   │   └── certs/                   # Self-signed certs (gitignored)
│   ├── keycloak/
│   │   └── realm-export.json        # Pre-configured realm (client, social IdPs skeleton)
│   └── pgadmin/
│       └── servers.json             # Pre-configured server connection
│
├── docker-compose.yml               # Base compose (shared by all envs)
├── docker-compose.local.yml         # Local overrides (volumes, hot reload, dashboard)
├── docker-compose.prod.yml          # Prod overrides (Let's Encrypt, resource limits)
├── .env.example                     # All environment variables documented
├── .env                             # Local secrets (gitignored)
├── run.sh                           # Developer task runner (see below)
├── .gitignore
└── README.md
```

---

## Authentication Flow

```
User
 │
 ▼
Angular (keycloak-angular lib)
 │  redirect to /auth/realms/pwa/protocol/openid-connect/auth
 ▼
Keycloak
 │  offers "Login with Google" / "Login with Facebook"
 ▼
Google or Facebook OAuth2
 │  returns code to Keycloak callback
 ▼
Keycloak
 │  issues access_token (JWT) + refresh_token
 ▼
Angular stores tokens (memory + keycloak-js session)
 │
 ▼
FastAPI receives Bearer token on every request
 │  verifies signature via GET /auth/realms/pwa/protocol/openid-connect/certs (JWKS)
 │  extracts user claims (sub, email, roles)
 ▼
Protected endpoint responds
```

Keycloak Realm pre-configured with:
- Realm: `pwa`
- Client: `pwa-frontend` (public, PKCE, redirect URIs for localhost + prod)
- Identity Providers: Google and Facebook (credentials filled via `.env`)
- Roles: `user`, `admin`

---

## Backend API Design

- Base path: `/api/v1/`
- Auth: Bearer JWT (verified against Keycloak JWKS, no Keycloak SDK on backend)
- WebSocket: `/api/v1/ws/{channel}` — authenticated via token query param
- All responses: JSON
- Async throughout (asyncpg driver + SQLAlchemy async sessions)

```
GET  /api/v1/health              → public, returns service status
GET  /api/v1/example             → protected, list items
POST /api/v1/example             → protected, create item
GET  /api/v1/example/{id}        → protected, get item
PUT  /api/v1/example/{id}        → protected, update item
DELETE /api/v1/example/{id}      → protected, delete item
WS   /api/v1/ws/example          → protected WebSocket
```

---

## Frontend App Structure (Angular v19 Standalone)

- **No NgModules** — fully standalone components
- **Routing**: lazy-loaded feature routes
- **NgRx**: signal store pattern per feature, root store for auth/app state
- **Ionic**: mobile-first layout with tab navigation scaffold
- **Capacitor**: configured for iOS + Android native builds
- **PWA**: `@angular/pwa` service worker, `manifest.webmanifest`, offline shell

### NgRx Store Layout
```
store/
  app.state.ts         ← root state interface

features/example/store/
  example.state.ts     ← feature state interface + initial state
  example.actions.ts   ← load, loadSuccess, loadFailure, create, update, delete
  example.reducer.ts   ← pure reducer
  example.selectors.ts ← memoized selectors
  example.effects.ts   ← side effects (HTTP calls via service)
```

---

## Database

- **PostgreSQL 17** with two databases:
  - `app_db` — application data (managed by Alembic)
  - `keycloak_db` — Keycloak internal data (managed by Keycloak)
- Alembic autogenerate enabled; migration workflow via `run.sh`
- pgAdmin pre-configured to connect to both databases

---

## Environment Variables (`.env.example`)

```env
# Postgres
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_USER=appuser
POSTGRES_PASSWORD=changeme
POSTGRES_DB=app_db

# Keycloak DB
KEYCLOAK_DB=keycloak_db
KEYCLOAK_DB_USER=keycloak
KEYCLOAK_DB_PASSWORD=changeme

# Keycloak Admin
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=changeme

# Keycloak Social IdPs
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=

# Backend
SECRET_KEY=changeme
BACKEND_CORS_ORIGINS=["https://localhost"]

# pgAdmin
PGADMIN_EMAIL=admin@local.dev
PGADMIN_PASSWORD=changeme

# TLS mode: local | letsencrypt
TLS_MODE=local
ACME_EMAIL=your@email.com
DOMAIN=localhost
```

---

## `run.sh` — Task Runner

```
./run.sh dev          # Start all services (local compose)
./run.sh prod         # Start all services (prod compose)
./run.sh stop         # Stop all services
./run.sh restart      # Stop + dev
./run.sh logs [svc]   # Tail logs (all or specific service)
./run.sh build        # Rebuild all images
./run.sh db:migrate   # Run Alembic migrations
./run.sh db:revision  # Create new Alembic revision
./run.sh db:reset     # Drop + recreate app_db (dev only)
./run.sh frontend:sync  # Capacitor sync (ionic build + cap sync)
./run.sh keycloak:export  # Export Keycloak realm config
```

---

## Docker Compose Services

| Service    | Image                   | Notes                                     |
|------------|-------------------------|-------------------------------------------|
| traefik    | traefik:v3              | Entrypoints: 80→443 redirect, 443 HTTPS   |
| postgres   | postgres:17             | Single instance, two databases            |
| keycloak   | quay.io/keycloak/keycloak:26 | Depends on postgres                  |
| backend    | ./backend (custom)      | FastAPI, hot-reload in dev                |
| frontend   | ./frontend (custom)     | nginx in prod, ng serve in dev            |
| pgadmin    | dpage/pgadmin4          | Pre-configured server connection          |

---

## Local Dev TLS Notes

Traefik generates a self-signed cert for `localhost`. On first run:
- Chrome: type `thisisunsafe` on the warning page
- Firefox: Advanced → Accept Risk
- For mobile testing on same network: access via machine IP, same override

---

## Storybook

Storybook is set up in `frontend/` for developing and documenting shared UI components in isolation.

- **Version**: `@storybook/angular` v8
- **Config**: `frontend/.storybook/` (`main.ts`, `preview.ts`, `preview-head.html`)
- **Addons**: `addon-essentials`, `addon-interactions`, `@chromatic-com/storybook`
- **Autodocs**: enabled — stories tagged with `autodocs` get an auto-generated docs page
- **Theme toggle**: Light/Dark switcher in the toolbar (toggles `.dark` class on `<body>`)
- **Font**: Source Sans 3 injected globally via `preview-head.html`

### Story locations

Stories live co-located with their component, exclusively inside `shared/components/`:

```
shared/components/<name>/
  <name>.component.ts
  <name>.component.stories.ts   ← story file
```

Features do not have stories — only `shared/` components are documented in Storybook.

### Running Storybook

```bash
# From frontend/
npm run storybook          # dev server (hot reload)
npm run build-storybook    # static build
```

---

## Production Deployment Checklist

1. Set `TLS_MODE=letsencrypt` and `DOMAIN=yourdomain.com` in `.env`
2. Point DNS A record to server IP
3. Fill all `changeme` values with strong secrets
4. Fill Google and Facebook OAuth credentials
5. `./run.sh prod`
6. After Keycloak boots: configure social IdP redirect URIs in Google/Facebook console
   - `https://yourdomain.com/auth/realms/pwa/broker/google/endpoint`
   - `https://yourdomain.com/auth/realms/pwa/broker/facebook/endpoint`
