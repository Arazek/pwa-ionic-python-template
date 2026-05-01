#!/usr/bin/env bash
set -euo pipefail

COMPOSE_BASE="-f docker-compose.yml"
COMPOSE_LOCAL="${COMPOSE_BASE} -f docker-compose.local.yml"
COMPOSE_PROD="${COMPOSE_BASE} -f docker-compose.prod.yml"

INFRA_BASE="--project-name pwa-infra -f docker-compose.infra.yml"
INFRA_LOCAL="${INFRA_BASE} -f docker-compose.infra.local.yml"
INFRA_PROD="${INFRA_BASE} -f docker-compose.infra.prod.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${CYAN}[run]${NC} $*"; }
success() { echo -e "${GREEN}[run]${NC} $*"; }
warn()    { echo -e "${YELLOW}[run]${NC} $*"; }
error()   { echo -e "${RED}[run]${NC} $*" >&2; exit 1; }

require_env() {
  if [ ! -f .env ]; then
    error ".env file not found. Copy .env.example to .env and fill in the values."
  fi
}

require_tool() {
  command -v "$1" &>/dev/null || error "$1 is required but not installed."
}

infra_is_running() {
  $DOCKER ps --filter "name=pwa-infra-traefik-1" --filter "status=running" --format "{{.Names}}" 2>/dev/null | grep -q "pwa-infra-traefik-1"
}

ensure_infra() {
  if ! infra_is_running; then
    warn "Shared infra is not running. Starting it now..."
    cmd_infra_up
  fi
}

# Use sudo for docker if the current user lacks permission
if docker info &>/dev/null 2>&1; then
  DOCKER="docker"
else
  warn "Docker requires sudo — prompting for password..."
  DOCKER="sudo docker"
fi

# ---------------------------------------------------------------------------
# TLS — generate self-signed cert for local dev
# ---------------------------------------------------------------------------
cmd_certs() {
  require_tool openssl
  mkdir -p infra/traefik/certs
  if [ -f infra/traefik/certs/local.crt ]; then
    warn "Certs already exist at infra/traefik/certs/. Delete them to regenerate."
    return
  fi
  info "Generating self-signed certificate for localhost..."
  openssl req -x509 -newkey rsa:4096 -nodes \
    -keyout infra/traefik/certs/local.key \
    -out infra/traefik/certs/local.crt \
    -days 365 \
    -subj "/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
  success "Certificates generated."
}

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

# ---------------------------------------------------------------------------
# Dev
# ---------------------------------------------------------------------------
cmd_dev() {
  require_env
  require_tool docker
  $DOCKER info &>/dev/null || error "Docker daemon is not running. Start it with: sudo systemctl start docker"
  ensure_infra
  info "Starting app services in dev mode..."
  $DOCKER compose ${COMPOSE_LOCAL} up --build "$@"
}

# ---------------------------------------------------------------------------
# Prod
# ---------------------------------------------------------------------------
cmd_prod() {
  require_env
  require_tool docker
  $DOCKER info &>/dev/null || error "Docker daemon is not running. Start it with: sudo systemctl start docker"
  ensure_infra
  info "Starting app services in prod mode..."
  $DOCKER compose ${COMPOSE_PROD} up -d --build "$@"
  success "Services started. Run './run.sh logs' to follow output."
}

# ---------------------------------------------------------------------------
# Stop
# ---------------------------------------------------------------------------
cmd_stop() {
  info "Stopping app services (frontend + backend)..."
  info "Infra keeps running. Use './run.sh infra:down' to stop it."
  $DOCKER compose ${COMPOSE_BASE} down "$@"
}

# ---------------------------------------------------------------------------
# Restart
# ---------------------------------------------------------------------------
cmd_restart() {
  cmd_stop
  cmd_dev
}

# ---------------------------------------------------------------------------
# Logs
# ---------------------------------------------------------------------------
cmd_logs() {
  local svc="${1:-}"
  $DOCKER compose ${COMPOSE_BASE} logs -f ${svc}
}

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
cmd_build() {
  require_env
  $DOCKER compose ${COMPOSE_BASE} build "$@"
}

# ---------------------------------------------------------------------------
# DB: run Alembic migrations
# ---------------------------------------------------------------------------
cmd_db_migrate() {
  require_env
  ensure_infra
  info "Running Alembic migrations..."
  $DOCKER compose ${COMPOSE_LOCAL} run --rm backend alembic upgrade head
  success "Migrations applied."
}

# ---------------------------------------------------------------------------
# DB: create new Alembic revision
# ---------------------------------------------------------------------------
cmd_db_revision() {
  local msg="${1:-}"
  [ -z "$msg" ] && error "Usage: ./run.sh db:revision \"your message\""
  require_env
  ensure_infra
  info "Creating Alembic revision: ${msg}"
  $DOCKER compose ${COMPOSE_LOCAL} run --rm backend alembic revision --autogenerate -m "${msg}"
}

# ---------------------------------------------------------------------------
# DB: reset app database (dev only — destructive)
# ---------------------------------------------------------------------------
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

# ---------------------------------------------------------------------------
# Frontend: Capacitor sync
# ---------------------------------------------------------------------------
cmd_frontend_sync() {
  require_tool node
  info "Building Angular app and syncing Capacitor..."
  cd frontend
  npm run build
  npx cap sync
  cd ..
  success "Capacitor sync complete."
}

# ---------------------------------------------------------------------------
# Storybook
# ---------------------------------------------------------------------------
cmd_storybook() {
  require_env
  info "Starting Storybook at http://localhost:6006 ..."
  $DOCKER compose ${COMPOSE_LOCAL} up --build storybook
}

# ---------------------------------------------------------------------------
# Keycloak: create a dev user
# ---------------------------------------------------------------------------
cmd_keycloak_user() {
  local username="${1:-testuser}"
  local password="${2:-testpass123}"
  local email="${3:-${username}@example.com}"
  require_env
  info "Creating Keycloak dev user '${username}' in realm 'pwa'..."
  $DOCKER compose ${COMPOSE_BASE} exec keycloak \
    /opt/keycloak/bin/kcadm.sh config credentials \
      --server http://localhost:8080/auth \
      --realm master \
      --user "${KEYCLOAK_ADMIN:-admin}" \
      --password "${KEYCLOAK_ADMIN_PASSWORD:-devpassword123}"
  $DOCKER compose ${COMPOSE_BASE} exec keycloak \
    /opt/keycloak/bin/kcadm.sh create users \
      -r pwa \
      -s username="${username}" \
      -s email="${email}" \
      -s enabled=true
  $DOCKER compose ${COMPOSE_BASE} exec keycloak \
    /opt/keycloak/bin/kcadm.sh set-password \
      -r pwa \
      --username "${username}" \
      --new-password "${password}" \
      --temporary=false
  $DOCKER compose ${COMPOSE_BASE} exec keycloak \
    /opt/keycloak/bin/kcadm.sh add-roles \
      -r pwa \
      --uusername "${username}" \
      --rolename user
  success "User '${username}' created. Password: ${password}"
}

# ---------------------------------------------------------------------------
# Keycloak: export realm config
# ---------------------------------------------------------------------------
cmd_keycloak_export() {
  require_env
  info "Exporting Keycloak realm 'pwa'..."
  $DOCKER compose ${COMPOSE_BASE} exec keycloak \
    /opt/keycloak/bin/kc.sh export \
    --realm pwa \
    --file /tmp/realm-export.json \
    --users realm_file
  $DOCKER compose ${COMPOSE_BASE} cp keycloak:/tmp/realm-export.json ./infra/keycloak/realm-export.json
  success "Realm exported to infra/keycloak/realm-export.json"
}

# ---------------------------------------------------------------------------
# Shell into a service
# ---------------------------------------------------------------------------
cmd_shell() {
  local svc="${1:-backend}"
  ensure_infra
  $DOCKER compose ${COMPOSE_LOCAL} exec "${svc}" /bin/bash
}

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------
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

# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------
CMD="${1:-help}"
shift || true

case "$CMD" in
  infra:up)         cmd_infra_up ;;
  infra:down)       cmd_infra_down "$@" ;;
  infra:logs)       cmd_infra_logs "$@" ;;
  infra:status)     cmd_infra_status ;;
  dev)              cmd_dev "$@" ;;
  prod)             cmd_prod "$@" ;;
  stop)             cmd_stop "$@" ;;
  restart)          cmd_restart ;;
  logs)             cmd_logs "$@" ;;
  build)            cmd_build "$@" ;;
  certs)            cmd_certs ;;
  db:migrate)       cmd_db_migrate ;;
  db:revision)      cmd_db_revision "$@" ;;
  db:reset)         cmd_db_reset ;;
  frontend:sync)    cmd_frontend_sync ;;
  storybook)        cmd_storybook ;;
  keycloak:user)    cmd_keycloak_user "$@" ;;
  keycloak:export)  cmd_keycloak_export ;;
  shell)            cmd_shell "$@" ;;
  help|--help|-h)   cmd_help ;;
  *)                error "Unknown command: ${CMD}. Run './run.sh help' for usage." ;;
esac
