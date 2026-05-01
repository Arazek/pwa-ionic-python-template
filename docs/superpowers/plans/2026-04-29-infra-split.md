# Infra Split + Project Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split shared infrastructure from the app layer so one infra instance serves multiple projects, and add `project-setup.sh` to bootstrap new projects end-to-end.

**Architecture:** Infra services (Traefik, Keycloak, Postgres, pgAdmin) move to `docker-compose.infra.yml` and run under project name `pwa-infra`. The app compose declares those networks as `external: true`. `run.sh` gains `infra:*` commands and auto-starts infra before any app command. `project-setup.sh` creates the `.env`, Postgres DB, Keycloak realm, and runs migrations.

**Tech Stack:** Bash, Docker Compose v2, Traefik v3, Keycloak 26, PostgreSQL 17, Alembic.

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `docker-compose.infra.yml` | All infra services + network/volume definitions |
| Create | `docker-compose.infra.local.yml` | Local port bindings + debug flags for infra |
| Create | `docker-compose.infra.prod.yml` | Prod ports + resource limits for infra |
| Modify | `docker-compose.yml` | App services only; networks as `external: true`; `APP_NAME` in Traefik labels |
| Modify | `docker-compose.local.yml` | App hot-reload overrides only; remove keycloak section |
| Modify | `docker-compose.prod.yml` | App resource limits only; remove infra sections |
| Modify | `.env.example` | Add `APP_NAME` field |
| Modify | `run.sh` | Add `INFRA_COMPOSE*` vars, `ensure_infra`, `infra:*` commands; call `ensure_infra` in app commands |
| Create | `project-setup.sh` | Interactive + flag-based project bootstrapper |
| Modify | `README.md` | Add multi-project workflow section |

---

## Task 1: Create docker-compose.infra.yml

**Files:**
- Create: `docker-compose.infra.yml`

- [ ] **Step 1: Create the file**

```yaml
# =============================================================================
# Shared infrastructure — run once, shared across all projects on this machine
# Start: ./run.sh infra:up   Stop: ./run.sh infra:down
# =============================================================================

services:

  # ---------------------------------------------------------------------------
  # Docker socket proxy — Traefik reads Docker labels without root socket access
  # ---------------------------------------------------------------------------
  socket-proxy:
    image: tecnativa/docker-socket-proxy
    restart: unless-stopped
    networks:
      - socket-proxy
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      CONTAINERS: 1
      NETWORKS: 1
      SERVICES: 1
      TASKS: 1

  # ---------------------------------------------------------------------------
  # Traefik — reverse proxy, TLS termination, auto-discovers services by label
  # ---------------------------------------------------------------------------
  traefik:
    image: traefik:v3.6.10
    restart: unless-stopped
    networks:
      - proxy
      - socket-proxy
    volumes:
      - ./infra/traefik/traefik.yml:/etc/traefik/traefik.yml:ro
      - ./infra/traefik/dynamic:/etc/traefik/dynamic:ro
      - ./infra/traefik/certs:/etc/traefik/certs:ro
      - traefik_acme:/etc/traefik/acme
    environment:
      - TLS_MODE=${TLS_MODE:-local}
      - DOMAIN=${DOMAIN:-localhost}
      - ACME_EMAIL=${ACME_EMAIL}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.traefik-dashboard.rule=Host(`${DOMAIN}`) && PathPrefix(`/traefik`)"
      - "traefik.http.routers.traefik-dashboard.service=api@internal"
      - "traefik.http.routers.traefik-dashboard.tls=true"

  # ---------------------------------------------------------------------------
  # PostgreSQL — single instance, one database per project
  # ---------------------------------------------------------------------------
  postgres:
    image: postgres:17
    restart: unless-stopped
    networks:
      - internal
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
      KEYCLOAK_DB: ${KEYCLOAK_DB}
      KEYCLOAK_DB_USER: ${KEYCLOAK_DB_USER}
      KEYCLOAK_DB_PASSWORD: ${KEYCLOAK_DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infra/postgres/init.sh:/docker-entrypoint-initdb.d/init.sh:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ---------------------------------------------------------------------------
  # Keycloak — single instance, one realm per project
  # ---------------------------------------------------------------------------
  keycloak:
    image: quay.io/keycloak/keycloak:26.0
    restart: unless-stopped
    networks:
      - proxy
      - internal
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/${KEYCLOAK_DB}
      KC_DB_USERNAME: ${KEYCLOAK_DB_USER}
      KC_DB_PASSWORD: ${KEYCLOAK_DB_PASSWORD}
      KC_BOOTSTRAP_ADMIN_USERNAME: ${KEYCLOAK_ADMIN}
      KC_BOOTSTRAP_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
      KC_PROXY_HEADERS: xforwarded
      KC_HTTP_ENABLED: "true"
      KC_HTTP_RELATIVE_PATH: /auth
      KC_HOSTNAME: ${DOMAIN:-localhost}
    command: ["start", "--import-realm"]
    volumes:
      - ./infra/keycloak/realm-export.json:/opt/keycloak/data/import/realm-export.json:ro
      - ./infra/keycloak/themes:/opt/keycloak/themes:ro
    depends_on:
      postgres:
        condition: service_healthy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.keycloak.rule=Host(`${DOMAIN}`) && PathPrefix(`/auth`)"
      - "traefik.http.routers.keycloak.tls=true"
      - "traefik.http.services.keycloak.loadbalancer.server.port=8080"

  # ---------------------------------------------------------------------------
  # pgAdmin — database admin UI
  # ---------------------------------------------------------------------------
  pgadmin:
    image: dpage/pgadmin4:latest
    restart: unless-stopped
    networks:
      - proxy
      - internal
    environment:
      PGADMIN_DEFAULT_EMAIL: ${PGADMIN_DEFAULT_EMAIL}
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_DEFAULT_PASSWORD}
      PGADMIN_CONFIG_SERVER_MODE: "False"
      SCRIPT_NAME: /pgadmin
    volumes:
      - pgadmin_data:/var/lib/pgadmin
      - ./infra/pgadmin/servers.json:/pgadmin4/servers.json:ro
    depends_on:
      - postgres
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.pgadmin.rule=Host(`${DOMAIN}`) && PathPrefix(`/pgadmin`)"
      - "traefik.http.routers.pgadmin.tls=true"
      - "traefik.http.services.pgadmin.loadbalancer.server.port=80"

networks:
  proxy:
    name: proxy
    driver: bridge
  internal:
    name: internal
    driver: bridge
  socket-proxy:
    name: socket-proxy
    driver: bridge
    internal: true

volumes:
  postgres_data:
  pgadmin_data:
  traefik_acme:
```

- [ ] **Step 2: Verify syntax**

```bash
docker compose -f docker-compose.infra.yml --project-name pwa-infra config --quiet
```

Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.infra.yml
git commit -m "feat: add shared infra compose file"
```

---

## Task 2: Create docker-compose.infra.local.yml

**Files:**
- Create: `docker-compose.infra.local.yml`

- [ ] **Step 1: Create the file**

```yaml
# =============================================================================
# Local development overrides for shared infra
# Usage: ./run.sh infra:up  (run.sh merges this automatically)
# =============================================================================

services:

  traefik:
    ports:
      - "8090:80"    # HTTP redirect
      - "4443:443"   # HTTPS — access all projects via https://<name>.localhost:4443
      - "8080:8080"  # Traefik dashboard

  keycloak:
    environment:
      KC_LOG_LEVEL: info
      KC_HOSTNAME_STRICT: "false"
```

- [ ] **Step 2: Verify syntax**

```bash
docker compose -f docker-compose.infra.yml -f docker-compose.infra.local.yml --project-name pwa-infra config --quiet
```

Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.infra.local.yml
git commit -m "feat: add local overrides for shared infra"
```

---

## Task 3: Create docker-compose.infra.prod.yml

**Files:**
- Create: `docker-compose.infra.prod.yml`

- [ ] **Step 1: Create the file**

```yaml
# =============================================================================
# Production overrides for shared infra
# Usage: ./run.sh infra:up --prod  (not yet wired — for future prod use)
# Requires: TLS_MODE=letsencrypt, DOMAIN=yourdomain.com, DNS A record set
# =============================================================================

services:

  traefik:
    ports:
      - "80:80"
      - "443:443"

  postgres:
    restart: always
    deploy:
      resources:
        limits:
          memory: 512M

  keycloak:
    restart: always
    environment:
      KC_LOG_LEVEL: warn
    deploy:
      resources:
        limits:
          memory: 768M

  pgadmin:
    restart: always
```

- [ ] **Step 2: Verify syntax**

```bash
docker compose -f docker-compose.infra.yml -f docker-compose.infra.prod.yml --project-name pwa-infra config --quiet
```

Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.infra.prod.yml
git commit -m "feat: add prod overrides for shared infra"
```

---

## Task 4: Update docker-compose.yml (app layer only)

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Replace the entire file**

```yaml
# =============================================================================
# App services — frontend + backend only
# Requires shared infra to be running: ./run.sh infra:up
# Networks proxy and internal are created by docker-compose.infra.yml
# =============================================================================

services:

  # ---------------------------------------------------------------------------
  # Backend — FastAPI
  # ---------------------------------------------------------------------------
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    networks:
      - proxy
      - internal
    environment:
      POSTGRES_HOST: ${POSTGRES_HOST}
      POSTGRES_PORT: ${POSTGRES_PORT}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
      SECRET_KEY: ${SECRET_KEY}
      KEYCLOAK_INTERNAL_URL: ${KEYCLOAK_INTERNAL_URL}
      KEYCLOAK_REALM: ${KEYCLOAK_REALM}
      BACKEND_CORS_ORIGINS: ${BACKEND_CORS_ORIGINS}
      LOG_LEVEL: ${LOG_LEVEL:-info}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.${APP_NAME}-backend.rule=Host(`${DOMAIN}`) && PathPrefix(`/api`)"
      - "traefik.http.routers.${APP_NAME}-backend.tls=true"
      - "traefik.http.services.${APP_NAME}-backend.loadbalancer.server.port=8000"

  # ---------------------------------------------------------------------------
  # Frontend — Angular/Ionic PWA
  # ---------------------------------------------------------------------------
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: unless-stopped
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.${APP_NAME}-frontend.rule=Host(`${DOMAIN}`)"
      - "traefik.http.routers.${APP_NAME}-frontend.tls=true"
      - "traefik.http.services.${APP_NAME}-frontend.loadbalancer.server.port=80"

networks:
  proxy:
    external: true
  internal:
    external: true
```

- [ ] **Step 2: Verify syntax**

```bash
docker compose -f docker-compose.yml config --quiet
```

Expected: warning about missing `APP_NAME`/`DOMAIN` env vars (acceptable — they come from `.env` at runtime), exit code 0.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: strip infra services from app compose, use external networks"
```

---

## Task 5: Update docker-compose.local.yml (app overrides only)

**Files:**
- Modify: `docker-compose.local.yml`

- [ ] **Step 1: Replace the entire file**

```yaml
# =============================================================================
# Local development overrides for app services
# Usage: docker compose -f docker-compose.yml -f docker-compose.local.yml up
# (run.sh handles this automatically with ./run.sh dev)
# =============================================================================

services:

  backend:
    build:
      target: development
    volumes:
      - ./backend:/app
    command: ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
    environment:
      LOG_LEVEL: debug

  frontend:
    build:
      target: development
    volumes:
      - ./frontend/src:/app/src
      - ./frontend/angular.json:/app/angular.json
      - ./frontend/ionic.config.json:/app/ionic.config.json
    ports:
      - "4200:4200"
    command: ["npx", "ng", "serve", "--host", "0.0.0.0", "--port", "4200", "--disable-host-check"]
    labels:
      - "traefik.http.services.${APP_NAME}-frontend.loadbalancer.server.port=4200"

  storybook:
    build:
      context: ./frontend
      target: development
    volumes:
      - ./frontend/src:/app/src
      - ./frontend/.storybook:/app/.storybook
      - ./frontend/angular.json:/app/angular.json
      - ./frontend/tsconfig.storybook.json:/app/tsconfig.storybook.json
    ports:
      - "6006:6006"
    command: ["npm", "run", "storybook"]
    networks:
      - internal
```

- [ ] **Step 2: Verify syntax**

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml config --quiet
```

Expected: no errors (env var warnings are fine), exit code 0.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.local.yml
git commit -m "feat: strip infra overrides from local app compose"
```

---

## Task 6: Update docker-compose.prod.yml (app overrides only)

**Files:**
- Modify: `docker-compose.prod.yml`

- [ ] **Step 1: Replace the entire file**

```yaml
# =============================================================================
# Production overrides for app services
# Usage: docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
# (run.sh handles this automatically with ./run.sh prod)
# =============================================================================

services:

  backend:
    build:
      target: production
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
    restart: always

  frontend:
    build:
      target: production
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 128M
    restart: always
```

- [ ] **Step 2: Verify syntax**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet
```

Expected: exit code 0.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.prod.yml
git commit -m "feat: strip infra overrides from prod app compose"
```

---

## Task 7: Update .env.example

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add APP_NAME under the General section**

Find this block in `.env.example`:

```
# -----------------------------------------------------------------------------
# General
# -----------------------------------------------------------------------------
DOMAIN=localhost
```

Replace with:

```
# -----------------------------------------------------------------------------
# General
# -----------------------------------------------------------------------------
# Unique name for this project — used as Traefik router prefix (no spaces, lowercase)
APP_NAME=myapp
DOMAIN=myapp.localhost
```

Also update `KEYCLOAK_PUBLIC_URL` and `BACKEND_CORS_ORIGINS` to match the new default domain:

Find:
```
KEYCLOAK_PUBLIC_URL=https://localhost:4443/auth
```
Replace with:
```
KEYCLOAK_PUBLIC_URL=https://myapp.localhost:4443/auth
```

Find:
```
BACKEND_CORS_ORIGINS=["https://localhost", "https://localhost:4443"]
```
Replace with:
```
BACKEND_CORS_ORIGINS=["https://myapp.localhost:4443"]
```

Also update `POSTGRES_DB` and `KEYCLOAK_REALM` to match `APP_NAME`:

Find:
```
POSTGRES_DB=app_db
```
Replace with:
```
POSTGRES_DB=myapp
```

Find:
```
KEYCLOAK_REALM=pwa
```
Replace with:
```
KEYCLOAK_REALM=myapp
```

- [ ] **Step 2: Verify the file still has all required fields**

```bash
grep -E "^(APP_NAME|DOMAIN|POSTGRES_DB|KEYCLOAK_REALM|SECRET_KEY|BACKEND_CORS_ORIGINS)=" .env.example
```

Expected output:
```
APP_NAME=myapp
DOMAIN=myapp.localhost
POSTGRES_DB=myapp
KEYCLOAK_REALM=myapp
SECRET_KEY=changeme-use-openssl-rand-hex-32
BACKEND_CORS_ORIGINS=["https://myapp.localhost:4443"]
```

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "feat: add APP_NAME to .env.example, align defaults with subdomain routing"
```

---

## Task 8: Update run.sh

**Files:**
- Modify: `run.sh`

- [ ] **Step 1: Add infra compose variables after the existing COMPOSE_* lines**

Find:
```bash
COMPOSE_BASE="-f docker-compose.yml"
COMPOSE_LOCAL="${COMPOSE_BASE} -f docker-compose.local.yml"
COMPOSE_PROD="${COMPOSE_BASE} -f docker-compose.prod.yml"
```

Replace with:
```bash
COMPOSE_BASE="-f docker-compose.yml"
COMPOSE_LOCAL="${COMPOSE_BASE} -f docker-compose.local.yml"
COMPOSE_PROD="${COMPOSE_BASE} -f docker-compose.prod.yml"

INFRA_BASE="--project-name pwa-infra -f docker-compose.infra.yml"
INFRA_LOCAL="${INFRA_BASE} -f docker-compose.infra.local.yml"
INFRA_PROD="${INFRA_BASE} -f docker-compose.infra.prod.yml"
```

- [ ] **Step 2: Add `infra_is_running` and `ensure_infra` functions**

Add after the `require_tool` function (after line `command -v "$1" &>/dev/null || error "$1 is required but not installed."`):

```bash
infra_is_running() {
  $DOCKER ps --filter "name=pwa-infra-traefik-1" --filter "status=running" --format "{{.Names}}" 2>/dev/null | grep -q "pwa-infra-traefik-1"
}

ensure_infra() {
  if ! infra_is_running; then
    warn "Shared infra is not running. Starting it now..."
    cmd_infra_up
  fi
}
```

- [ ] **Step 3: Add the four infra commands**

Add after the `cmd_certs` function block:

```bash
# ---------------------------------------------------------------------------
# Infra: start shared services (Traefik, Keycloak, Postgres, pgAdmin)
# ---------------------------------------------------------------------------
cmd_infra_up() {
  require_env
  require_tool docker
  $DOCKER info &>/dev/null || error "Docker daemon is not running. Start it with: sudo systemctl start docker"
  [ ! -f infra/traefik/certs/local.crt ] && cmd_certs
  info "Starting shared infra (Traefik, Keycloak, Postgres, pgAdmin)..."
  $DOCKER compose ${INFRA_LOCAL} up -d
  success "Infra started. Keycloak may take 30-60s on first boot."
}

# ---------------------------------------------------------------------------
# Infra: stop shared services
# ---------------------------------------------------------------------------
cmd_infra_down() {
  info "Stopping shared infra..."
  $DOCKER compose ${INFRA_BASE} down "$@"
  success "Infra stopped."
}

# ---------------------------------------------------------------------------
# Infra: tail logs
# ---------------------------------------------------------------------------
cmd_infra_logs() {
  local svc="${1:-}"
  $DOCKER compose ${INFRA_BASE} logs -f ${svc}
}

# ---------------------------------------------------------------------------
# Infra: show running infra containers
# ---------------------------------------------------------------------------
cmd_infra_status() {
  $DOCKER compose ${INFRA_BASE} ps
}
```

- [ ] **Step 4: Add `ensure_infra` call to `cmd_dev`**

Find:
```bash
cmd_dev() {
  require_env
  require_tool docker
  $DOCKER info &>/dev/null || error "Docker daemon is not running. Start it with: sudo systemctl start docker"
  [ ! -f infra/traefik/certs/local.crt ] && cmd_certs
  info "Starting services in dev mode..."
  $DOCKER compose ${COMPOSE_LOCAL} up --build "$@"
}
```

Replace with:
```bash
cmd_dev() {
  require_env
  require_tool docker
  $DOCKER info &>/dev/null || error "Docker daemon is not running. Start it with: sudo systemctl start docker"
  ensure_infra
  info "Starting app services in dev mode..."
  $DOCKER compose ${COMPOSE_LOCAL} up --build "$@"
}
```

- [ ] **Step 5: Add `ensure_infra` call to `cmd_prod`**

Find:
```bash
cmd_prod() {
  require_env
  require_tool docker
  $DOCKER info &>/dev/null || error "Docker daemon is not running. Start it with: sudo systemctl start docker"
  info "Starting services in prod mode..."
  $DOCKER compose ${COMPOSE_PROD} up -d --build "$@"
  success "Services started. Run './run.sh logs' to follow output."
}
```

Replace with:
```bash
cmd_prod() {
  require_env
  require_tool docker
  $DOCKER info &>/dev/null || error "Docker daemon is not running. Start it with: sudo systemctl start docker"
  ensure_infra
  info "Starting app services in prod mode..."
  $DOCKER compose ${COMPOSE_PROD} up -d --build "$@"
  success "Services started. Run './run.sh logs' to follow output."
}
```

- [ ] **Step 6: Update `cmd_stop` to only stop app services**

Find:
```bash
cmd_stop() {
  info "Stopping all services..."
  $DOCKER compose ${COMPOSE_BASE} down "$@"
}
```

Replace with:
```bash
cmd_stop() {
  info "Stopping app services (frontend + backend)..."
  info "Infra keeps running. Use './run.sh infra:down' to stop it."
  $DOCKER compose ${COMPOSE_BASE} down "$@"
}
```

- [ ] **Step 7: Add `ensure_infra` to db and shell commands**

Find:
```bash
cmd_db_migrate() {
  require_env
  info "Running Alembic migrations..."
  $DOCKER compose ${COMPOSE_LOCAL} run --rm backend alembic upgrade head
  success "Migrations applied."
}
```

Replace with:
```bash
cmd_db_migrate() {
  require_env
  ensure_infra
  info "Running Alembic migrations..."
  $DOCKER compose ${COMPOSE_LOCAL} run --rm backend alembic upgrade head
  success "Migrations applied."
}
```

Find:
```bash
cmd_db_revision() {
  local msg="${1:-}"
  [ -z "$msg" ] && error "Usage: ./run.sh db:revision \"your message\""
  require_env
  info "Creating Alembic revision: ${msg}"
  $DOCKER compose ${COMPOSE_LOCAL} run --rm backend alembic revision --autogenerate -m "${msg}"
}
```

Replace with:
```bash
cmd_db_revision() {
  local msg="${1:-}"
  [ -z "$msg" ] && error "Usage: ./run.sh db:revision \"your message\""
  require_env
  ensure_infra
  info "Creating Alembic revision: ${msg}"
  $DOCKER compose ${COMPOSE_LOCAL} run --rm backend alembic revision --autogenerate -m "${msg}"
}
```

Find:
```bash
cmd_db_reset() {
  warn "This will DROP and recreate the app database. Are you sure? (yes/N)"
  read -r confirm
  [ "$confirm" != "yes" ] && { info "Aborted."; exit 0; }
  require_env
  info "Resetting app database..."
  $DOCKER compose ${COMPOSE_LOCAL} run --rm backend alembic downgrade base
  $DOCKER compose ${COMPOSE_LOCAL} run --rm backend alembic upgrade head
  success "Database reset."
}
```

Replace with:
```bash
cmd_db_reset() {
  warn "This will DROP and recreate the app database. Are you sure? (yes/N)"
  read -r confirm
  [ "$confirm" != "yes" ] && { info "Aborted."; exit 0; }
  require_env
  ensure_infra
  info "Resetting app database..."
  $DOCKER compose ${COMPOSE_LOCAL} run --rm backend alembic downgrade base
  $DOCKER compose ${COMPOSE_LOCAL} run --rm backend alembic upgrade head
  success "Database reset."
}
```

Find:
```bash
cmd_shell() {
  local svc="${1:-backend}"
  $DOCKER compose ${COMPOSE_LOCAL} exec "${svc}" /bin/bash
}
```

Replace with:
```bash
cmd_shell() {
  local svc="${1:-backend}"
  ensure_infra
  $DOCKER compose ${COMPOSE_LOCAL} exec "${svc}" /bin/bash
}
```

- [ ] **Step 8: Update the help text**

Find:
```bash
cmd_help() {
  echo ""
  echo -e "${CYAN}PWA Template — run.sh${NC}"
  echo ""
  echo "Usage: ./run.sh <command> [args]"
  echo ""
  echo "Commands:"
  echo "  dev                   Start all services (local, with hot reload)"
  echo "  prod                  Start all services (production mode, detached)"
  echo "  stop                  Stop all services"
  echo "  restart               Stop + dev"
  echo "  logs [service]        Tail logs (all services or specific)"
  echo "  build                 Rebuild all Docker images"
  echo "  certs                 Generate self-signed TLS certs for local dev"
  echo "  db:migrate            Run Alembic migrations (upgrade head)"
  echo "  db:revision <msg>     Create new Alembic autogenerate revision"
  echo "  db:reset              Drop + recreate app DB (dev only, destructive)"
  echo "  frontend:sync         Build Angular + run Capacitor sync"
  echo "  storybook             Start Storybook component explorer (http://localhost:6006)"
  echo "  keycloak:user [u] [p] Create a dev user in the pwa realm (default: testuser/testpass123)"
  echo "  keycloak:export       Export Keycloak realm config to infra/keycloak/"
  echo "  shell [service]       Open a bash shell in a service (default: backend)"
  echo ""
}
```

Replace with:
```bash
cmd_help() {
  echo ""
  echo -e "${CYAN}PWA Template — run.sh${NC}"
  echo ""
  echo "Usage: ./run.sh <command> [args]"
  echo ""
  echo -e "${CYAN}Shared infrastructure (run once, shared across projects):${NC}"
  echo "  infra:up              Start infra: Traefik, Keycloak, Postgres, pgAdmin (detached)"
  echo "  infra:down            Stop shared infra"
  echo "  infra:logs [service]  Tail infra logs"
  echo "  infra:status          Show running infra containers"
  echo ""
  echo -e "${CYAN}App services (frontend + backend):${NC}"
  echo "  dev                   Start app services (local, hot reload) — starts infra if needed"
  echo "  prod                  Start app services (production mode, detached)"
  echo "  stop                  Stop app services only (infra keeps running)"
  echo "  restart               Stop app + dev"
  echo "  logs [service]        Tail app logs"
  echo "  build                 Rebuild app Docker images"
  echo ""
  echo -e "${CYAN}Database:${NC}"
  echo "  certs                 Generate self-signed TLS certs for local dev"
  echo "  db:migrate            Run Alembic migrations (upgrade head)"
  echo "  db:revision <msg>     Create new Alembic autogenerate revision"
  echo "  db:reset              Drop + recreate app DB (dev only, destructive)"
  echo ""
  echo -e "${CYAN}Other:${NC}"
  echo "  frontend:sync         Build Angular + run Capacitor sync"
  echo "  storybook             Start Storybook component explorer (http://localhost:6006)"
  echo "  keycloak:user [u] [p] Create a dev user in the current realm (default: testuser/testpass123)"
  echo "  keycloak:export       Export Keycloak realm config to infra/keycloak/"
  echo "  shell [service]       Open a bash shell in a service (default: backend)"
  echo ""
}
```

- [ ] **Step 9: Add the four infra cases to the dispatch block**

Find:
```bash
case "$CMD" in
  dev)              cmd_dev "$@" ;;
```

Replace with:
```bash
case "$CMD" in
  infra:up)         cmd_infra_up ;;
  infra:down)       cmd_infra_down "$@" ;;
  infra:logs)       cmd_infra_logs "$@" ;;
  infra:status)     cmd_infra_status ;;
  dev)              cmd_dev "$@" ;;
```

- [ ] **Step 10: Verify run.sh is valid bash**

```bash
bash -n run.sh
```

Expected: no output, exit code 0.

- [ ] **Step 11: Commit**

```bash
git add run.sh
git commit -m "feat: add infra commands and ensure_infra to run.sh"
```

---

## Task 9: Create project-setup.sh

**Files:**
- Create: `project-setup.sh`

- [ ] **Step 1: Create the file**

```bash
#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# project-setup.sh — Bootstrap a new project into the shared infra
#
# Usage:
#   ./project-setup.sh                                       # interactive
#   ./project-setup.sh --name myapp                          # domain defaults to myapp.localhost
#   ./project-setup.sh --name myapp --domain myapp.localhost
#   ./project-setup.sh --name myapp --domain myapp.localhost --non-interactive
#   ./project-setup.sh --name myapp --force                  # overwrite existing .env
# =============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${CYAN}[setup]${NC} $*"; }
success() { echo -e "${GREEN}[setup]${NC} $*"; }
warn()    { echo -e "${YELLOW}[setup]${NC} $*"; }
error()   { echo -e "${RED}[setup]${NC} $*" >&2; exit 1; }

# Use sudo for docker if needed
if docker info &>/dev/null 2>&1; then
  DOCKER="docker"
else
  DOCKER="sudo docker"
fi

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
APP_NAME=""
DOMAIN=""
NON_INTERACTIVE=false
FORCE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name)           APP_NAME="${2:-}"; shift 2 ;;
    --domain)         DOMAIN="${2:-}"; shift 2 ;;
    --non-interactive) NON_INTERACTIVE=true; shift ;;
    --force)          FORCE=true; shift ;;
    *) error "Unknown argument: $1. Usage: ./project-setup.sh [--name <name>] [--domain <domain>] [--non-interactive] [--force]" ;;
  esac
done

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
prompt_or_error() {
  local var_name="$1"
  local prompt_text="$2"
  local default="$3"
  if [ -z "${!var_name}" ]; then
    if [ "$NON_INTERACTIVE" = true ]; then
      error "--${var_name,,} is required in non-interactive mode."
    fi
    if [ -n "$default" ]; then
      read -rp "$(echo -e "${CYAN}[setup]${NC} ${prompt_text} [${default}]: ")" input
      printf -v "$var_name" '%s' "${input:-$default}"
    else
      read -rp "$(echo -e "${CYAN}[setup]${NC} ${prompt_text}: ")" input
      printf -v "$var_name" '%s' "$input"
    fi
  fi
}

validate_name() {
  local name="$1"
  [ -z "$name" ] && error "Project name cannot be empty."
  [[ "$name" =~ ^[a-z0-9][a-z0-9-]{0,39}$ ]] || error "Project name must be lowercase alphanumeric + hyphens, max 40 chars. Got: '${name}'"
}

validate_domain() {
  local domain="$1"
  [ -z "$domain" ] && error "Domain cannot be empty."
  [[ "$domain" =~ ^https?:// ]] && error "Domain must not include protocol (https://). Got: '${domain}'"
  [[ "$domain" =~ /$ ]] && error "Domain must not have a trailing slash. Got: '${domain}'"
}

wait_for_postgres() {
  info "Waiting for Postgres to be ready..."
  local retries=30
  until $DOCKER exec pwa-infra-postgres-1 pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" &>/dev/null; do
    retries=$((retries - 1))
    [ "$retries" -le 0 ] && error "Postgres did not become ready in 30 attempts."
    sleep 1
  done
  success "Postgres is ready."
}

wait_for_keycloak() {
  info "Waiting for Keycloak to be ready (may take 30-60s on first boot)..."
  local retries=60
  until $DOCKER exec pwa-infra-keycloak-1 curl -sf http://localhost:8080/auth/health/ready &>/dev/null; do
    retries=$((retries - 1))
    [ "$retries" -le 0 ] && error "Keycloak did not become ready in 60 attempts."
    printf "."
    sleep 1
  done
  echo ""
  success "Keycloak is ready."
}

# ---------------------------------------------------------------------------
# Step 1: Collect project name and domain
# ---------------------------------------------------------------------------
default_name="$(basename "$(pwd)")"
prompt_or_error APP_NAME "Project name (lowercase, hyphens ok)" "$default_name"
validate_name "$APP_NAME"

default_domain="${APP_NAME}.localhost"
prompt_or_error DOMAIN "Domain" "$default_domain"
validate_domain "$DOMAIN"

info "Setting up project '${APP_NAME}' at https://${DOMAIN}"

# ---------------------------------------------------------------------------
# Step 2: Write .env
# ---------------------------------------------------------------------------
[ ! -f .env.example ] && error ".env.example not found. Run this script from the project root."

if [ -f .env ] && [ "$FORCE" = false ]; then
  error ".env already exists. Use --force to overwrite, or delete it manually."
fi

info "Writing .env..."
cp .env.example .env

SECRET_KEY=$(openssl rand -hex 32)

# sed substitutions — use | as delimiter to avoid issues with / in values
sed -i "s|^APP_NAME=.*|APP_NAME=${APP_NAME}|" .env
sed -i "s|^DOMAIN=.*|DOMAIN=${DOMAIN}|" .env
sed -i "s|^POSTGRES_DB=.*|POSTGRES_DB=${APP_NAME}|" .env
sed -i "s|^KEYCLOAK_REALM=.*|KEYCLOAK_REALM=${APP_NAME}|" .env
sed -i "s|^KEYCLOAK_PUBLIC_URL=.*|KEYCLOAK_PUBLIC_URL=https://${DOMAIN}/auth|" .env
sed -i "s|^BACKEND_CORS_ORIGINS=.*|BACKEND_CORS_ORIGINS=[\"https://${DOMAIN}\"]|" .env
sed -i "s|^SECRET_KEY=.*|SECRET_KEY=${SECRET_KEY}|" .env

success ".env written."

# Load the full .env so remaining steps can read all vars
set -a; source .env; set +a

# ---------------------------------------------------------------------------
# Step 3: TLS certs
# ---------------------------------------------------------------------------
if [ ! -f infra/traefik/certs/local.crt ]; then
  info "Generating self-signed TLS certificate..."
  command -v openssl &>/dev/null || error "openssl is required but not installed."
  mkdir -p infra/traefik/certs
  openssl req -x509 -newkey rsa:4096 -nodes \
    -keyout infra/traefik/certs/local.key \
    -out infra/traefik/certs/local.crt \
    -days 365 \
    -subj "/CN=${DOMAIN}" \
    -addext "subjectAltName=DNS:${DOMAIN},DNS:localhost,IP:127.0.0.1" 2>/dev/null
  success "TLS certificate generated."
fi

# ---------------------------------------------------------------------------
# Step 4: Start infra if not running
# ---------------------------------------------------------------------------
if ! $DOCKER ps --filter "name=pwa-infra-traefik-1" --filter "status=running" --format "{{.Names}}" 2>/dev/null | grep -q "pwa-infra-traefik-1"; then
  info "Starting shared infra..."
  $DOCKER compose --project-name pwa-infra -f docker-compose.infra.yml -f docker-compose.infra.local.yml up -d
  success "Infra started."
else
  info "Shared infra already running."
fi

# ---------------------------------------------------------------------------
# Step 5: Wait for Postgres
# ---------------------------------------------------------------------------
wait_for_postgres

# ---------------------------------------------------------------------------
# Step 6: Create Postgres database
# ---------------------------------------------------------------------------
info "Creating Postgres database '${APP_NAME}'..."
DB_EXISTS=$($DOCKER exec pwa-infra-postgres-1 psql -U "${POSTGRES_USER}" -tAc \
  "SELECT 1 FROM pg_database WHERE datname='${APP_NAME}'")
if [ "$DB_EXISTS" = "1" ]; then
  warn "Database '${APP_NAME}' already exists — skipping."
else
  $DOCKER exec pwa-infra-postgres-1 psql -U "${POSTGRES_USER}" \
    -c "CREATE DATABASE \"${APP_NAME}\" OWNER \"${POSTGRES_USER}\";"
  success "Database '${APP_NAME}' created."
fi

# ---------------------------------------------------------------------------
# Step 7: Wait for Keycloak
# ---------------------------------------------------------------------------
wait_for_keycloak

# ---------------------------------------------------------------------------
# Step 8: Create Keycloak realm
# ---------------------------------------------------------------------------
info "Checking Keycloak realm '${APP_NAME}'..."

# Authenticate kcadm
$DOCKER exec pwa-infra-keycloak-1 /opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080/auth \
  --realm master \
  --user "${KEYCLOAK_ADMIN}" \
  --password "${KEYCLOAK_ADMIN_PASSWORD}" &>/dev/null

# Check if realm already exists
REALM_EXISTS=$($DOCKER exec pwa-infra-keycloak-1 /opt/keycloak/bin/kcadm.sh get realms \
  --fields realm 2>/dev/null | grep -c "\"${APP_NAME}\"" || true)

if [ "$REALM_EXISTS" -gt 0 ]; then
  warn "Realm '${APP_NAME}' already exists — skipping."
else
  info "Exporting 'pwa' realm as template..."

  # Export pwa realm using Admin REST API (online, no server restart needed)
  $DOCKER exec pwa-infra-keycloak-1 bash -c "
    TOKEN=\$(curl -s \
      -d 'client_id=admin-cli' \
      -d 'username=${KEYCLOAK_ADMIN}' \
      -d 'password=${KEYCLOAK_ADMIN_PASSWORD}' \
      -d 'grant_type=password' \
      'http://localhost:8080/auth/realms/master/protocol/openid-connect/token' \
      | grep -o '\"access_token\":\"[^\"]*\"' \
      | sed 's/\"access_token\":\"//;s/\"//') && \
    curl -s -X POST \
      -H \"Authorization: Bearer \$TOKEN\" \
      -H 'Content-Type: application/json' \
      'http://localhost:8080/auth/admin/realms/pwa/partial-export?exportClients=true&exportGroupsAndRoles=true' \
      -o /tmp/pwa-realm-export.json
  "

  # Copy out, patch, copy back
  $DOCKER cp pwa-infra-keycloak-1:/tmp/pwa-realm-export.json /tmp/pwa-realm-export.json

  sed \
    -e "s|\"realm\" *: *\"pwa\"|\"realm\": \"${APP_NAME}\"|g" \
    -e "s|\"id\" *: *\"pwa\"|\"id\": \"${APP_NAME}\"|g" \
    -e "s|https://localhost:4443|https://${DOMAIN}|g" \
    -e "s|https://localhost|https://${DOMAIN}|g" \
    /tmp/pwa-realm-export.json > /tmp/${APP_NAME}-realm.json

  $DOCKER cp /tmp/${APP_NAME}-realm.json pwa-infra-keycloak-1:/tmp/${APP_NAME}-realm.json

  info "Importing realm '${APP_NAME}'..."
  $DOCKER exec pwa-infra-keycloak-1 /opt/keycloak/bin/kcadm.sh create realms \
    -f /tmp/${APP_NAME}-realm.json

  success "Realm '${APP_NAME}' created."
fi

# ---------------------------------------------------------------------------
# Step 9: Run migrations
# ---------------------------------------------------------------------------
info "Running database migrations..."
$DOCKER compose -f docker-compose.yml -f docker-compose.local.yml run --rm backend alembic upgrade head
success "Migrations applied."

# ---------------------------------------------------------------------------
# Step 10: Done
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN} Project '${APP_NAME}' is ready!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo -e "  App:          ${CYAN}https://${DOMAIN}:4443${NC}"
echo -e "  API docs:     ${CYAN}https://${DOMAIN}:4443/api/v1/docs${NC}"
echo -e "  Keycloak:     ${CYAN}https://${DOMAIN}:4443/auth/admin${NC}  (realm: ${APP_NAME})"
echo -e "  pgAdmin:      ${CYAN}https://${DOMAIN}:4443/pgadmin${NC}"
echo ""
echo -e "  Next step:    ${YELLOW}./run.sh dev${NC}"
echo ""
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x project-setup.sh
```

- [ ] **Step 3: Verify bash syntax**

```bash
bash -n project-setup.sh
```

Expected: no output, exit code 0.

- [ ] **Step 4: Commit**

```bash
git add project-setup.sh
git commit -m "feat: add project-setup.sh bootstrapper"
```

---

## Task 10: Update README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Find the existing Quick Start section**

```bash
grep -n "Quick Start\|quick start\|Getting Started\|getting started" README.md | head -5
```

Note the line number returned.

- [ ] **Step 2: Add the multi-project workflow section**

Insert the following block immediately after the existing Quick Start section (or before any "Development" heading if no Quick Start exists):

```markdown
## Multi-Project Workflow

This template is designed so one set of shared infrastructure (Traefik, Keycloak, PostgreSQL, pgAdmin) serves multiple projects on the same machine. Each project runs its own frontend and backend and gets its own subdomain, Postgres database, and Keycloak realm.

### How projects are identified

| Variable | Purpose | Example |
|----------|---------|---------|
| `APP_NAME` | Unique Traefik router prefix — must differ across projects | `myapp` |
| `DOMAIN` | Subdomain for this project | `myapp.localhost` |
| `POSTGRES_DB` | Dedicated database on the shared Postgres | `myapp` |
| `KEYCLOAK_REALM` | Dedicated realm on the shared Keycloak | `myapp` |

`*.localhost` resolves automatically on most systems — no `/etc/hosts` changes needed. If it does not resolve on your system, add `127.0.0.1 myapp.localhost` to `/etc/hosts`.

### Starting a new project from this template

```bash
# 1. Copy the template
cp -r pwa-ionic-python-template my-new-project
cd my-new-project

# 2. Bootstrap (creates .env, Postgres DB, Keycloak realm, runs migrations)
./project-setup.sh --name my-new-project --domain my-new-project.localhost

# 3. Start the app (infra starts automatically if not already running)
./run.sh dev
```

### Infra commands

```bash
./run.sh infra:up          # Start Traefik, Keycloak, Postgres, pgAdmin (detached)
./run.sh infra:down        # Stop shared infra
./run.sh infra:logs        # Tail infra logs
./run.sh infra:status      # Show running infra containers
```

### App commands

```bash
./run.sh dev               # Start frontend + backend with hot reload (auto-starts infra)
./run.sh stop              # Stop frontend + backend only — infra keeps running
./run.sh infra:down        # Stop infra (affects all projects on this machine)
```

### Running multiple projects simultaneously

Each project has its own `.env` with a unique `APP_NAME` and `DOMAIN`. Start each project's app layer in a separate terminal:

```bash
# Terminal 1 — project A
cd ~/projects/app-a && ./run.sh dev

# Terminal 2 — project B (infra already running, starts app-b services only)
cd ~/projects/app-b && ./run.sh dev
```

Both projects share Traefik, Keycloak, Postgres, and pgAdmin. Traefik auto-discovers each app via Docker labels and routes `app-a.localhost` and `app-b.localhost` independently.
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add multi-project workflow section to README"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| `docker-compose.infra.yml` with all infra services | Task 1 |
| `docker-compose.infra.local.yml` with local port bindings | Task 2 |
| `docker-compose.infra.prod.yml` with prod settings | Task 3 |
| App compose with external networks + `APP_NAME` labels | Task 4 |
| Local app overrides only | Task 5 |
| Prod app overrides only | Task 6 |
| `APP_NAME` in `.env.example` | Task 7 |
| `infra:up/down/logs/status` commands in `run.sh` | Task 8 |
| `ensure_infra` called by dev/prod/db/shell | Task 8 |
| `stop` only stops app, not infra | Task 8 |
| `project-setup.sh` interactive + flag-based | Task 9 |
| `--non-interactive` mode | Task 9 |
| `--force` flag for `.env` overwrite | Task 9 |
| Name/domain validation | Task 9 |
| `.env` generation with all substitutions | Task 9 |
| TLS cert generation | Task 9 |
| Postgres DB creation (idempotent) | Task 9 |
| Keycloak realm creation via partial-export API | Task 9 |
| Migrations | Task 9 |
| Success block with URLs | Task 9 |
| README multi-project section | Task 10 |
