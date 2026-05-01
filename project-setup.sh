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
