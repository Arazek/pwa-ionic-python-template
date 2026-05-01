# Infra Split + Project Setup Design

**Date:** 2026-04-29
**Status:** Approved

## Goal

Split shared infrastructure (Traefik, Keycloak, PostgreSQL, pgAdmin) from the application layer (frontend + backend) so that one infra instance can serve multiple projects on the same machine. Add a `project-setup.sh` bootstrapper that configures a new project end-to-end (Postgres DB, Keycloak realm, migrations).

---

## Routing Strategy

Single domain per project using **subdomains**: `myapp.localhost`, `otherapp.localhost`.

- `*.localhost` resolves automatically on most modern systems — no `/etc/hosts` editing required per project.
- Apps have zero knowledge of their hostname — no `--base-href`, no `root_path`, no code changes.
- Maps directly to production (`app1.company.com`, `app2.company.com`).
- `APP_NAME` in `.env` is used only to keep Traefik router names unique across projects (e.g., `myapp-backend`, `myapp-frontend`). `DOMAIN` controls the actual hostname.

---

## File Structure Changes

### New files (infra compose)

```
docker-compose.infra.yml         — Traefik, Keycloak, Postgres, pgAdmin, socket-proxy
docker-compose.infra.local.yml   — local port bindings (4443, 8080), debug flags
docker-compose.infra.prod.yml    — prod resource limits, Let's Encrypt ports
```

The infra stack always runs under `--project-name pwa-infra`, making container names predictable (`pwa-infra-traefik-1`, `pwa-infra-postgres-1`, etc.) regardless of the directory it is started from.

Networks (`proxy`, `internal`, `socket-proxy`) and volumes (`postgres_data`, `pgadmin_data`, `traefik_acme`) are defined in the infra compose.

### Modified files (app layer)

```
docker-compose.yml       — backend + frontend only; networks declared as external: true
docker-compose.local.yml — hot reload overrides for backend/frontend only
docker-compose.prod.yml  — resource limits for backend/frontend only
.env.example             — add APP_NAME=myapp
```

### New script

```
project-setup.sh         — new project bootstrapper (interactive + flag-based)
```

### Updated documentation

```
README.md                — new section covering infra commands, project-setup.sh usage, multi-project workflow
```

---

## run.sh Changes

### New commands

| Command | Description |
|---------|-------------|
| `infra:up` | Start infra detached; generates TLS certs first if missing |
| `infra:down [args]` | Stop infra services |
| `infra:logs [svc]` | Tail infra logs |
| `infra:status` | Show running infra containers |

### New internal function: `ensure_infra`

Checks whether `pwa-infra-traefik-1` is running via `docker ps`. If not, calls `cmd_infra_up` automatically. Called by: `dev`, `prod`, `db:migrate`, `db:revision`, `db:reset`, `shell`.

### `stop` behaviour

`stop` only tears down app services (frontend + backend). Infra continues running so other projects on the same machine are unaffected. Use `infra:down` to explicitly stop infra.

### Compose variable names

```bash
INFRA_COMPOSE="-f docker-compose.infra.yml --project-name pwa-infra"
INFRA_COMPOSE_LOCAL="${INFRA_COMPOSE} -f docker-compose.infra.local.yml"
INFRA_COMPOSE_PROD="${INFRA_COMPOSE} -f docker-compose.infra.prod.yml"
```

---

## project-setup.sh

### Interface

```bash
./project-setup.sh                          # interactive, prompts for name + domain
./project-setup.sh --name myapp             # domain defaults to myapp.localhost
./project-setup.sh --name myapp --domain myapp.localhost
./project-setup.sh --name myapp --domain myapp.localhost --non-interactive
```

`--non-interactive` causes the script to fail with a clear error message rather than prompt for any missing value.

Default for `--name`: basename of the current directory.
Default for `--domain`: `<name>.localhost`.

### Validation

- Name: lowercase alphanumeric + hyphens only, no spaces, max 40 chars.
- Domain: basic format check (no protocol prefix, no trailing slash).
- Refuses to run if `.env` already exists (unless `--force` is passed), to avoid overwriting a configured project.

### Steps

1. **Parse flags / prompt** — collect `APP_NAME` and `DOMAIN`.
2. **Write `.env`** — copy `.env.example`, substitute `APP_NAME`, `DOMAIN`, `POSTGRES_DB` (= APP_NAME), `KEYCLOAK_REALM` (= APP_NAME), generate `SECRET_KEY` via `openssl rand -hex 32`.
3. **Generate TLS certs** — if `infra/traefik/certs/local.crt` does not exist.
4. **Start infra** — `ensure_infra` (starts if not running, does not restart if already up).
5. **Wait for Postgres** — poll `pg_isready` inside `pwa-infra-postgres-1`, 30 s timeout.
6. **Create Postgres database** — check `pg_database` for existence, create only if absent: `SELECT 1 FROM pg_database WHERE datname='$APP_NAME'`; if no row, `CREATE DATABASE $APP_NAME OWNER $POSTGRES_USER`.
7. **Wait for Keycloak** — poll `GET /auth/health/ready` on the Keycloak container, 60 s timeout.
8. **Create Keycloak realm** —
   a. Authenticate `kcadm` against master realm using `$KEYCLOAK_ADMIN` / `$KEYCLOAK_ADMIN_PASSWORD`.
   b. Check if realm `$APP_NAME` already exists — skip if yes (idempotent).
   c. Export the running `pwa` realm fully (including clients and roles) via `kc.sh export --realm pwa --file /tmp/pwa-realm-export.json --users skip` inside the container (same approach already used by `run.sh keycloak:export`).
   d. `docker cp` the file out, run two `sed` passes: replace realm name `pwa` → `$APP_NAME`, replace redirect URI hostnames with `$DOMAIN`.
   e. `docker cp` modified JSON back into the container.
   f. Import via `kcadm create realms -f /tmp/<APP_NAME>-realm.json`.
9. **Run migrations** — `docker compose -f docker-compose.yml -f docker-compose.local.yml run --rm backend alembic upgrade head`.
10. **Print success block** — app URL, Keycloak admin URL, pgAdmin URL, suggested next step (`./run.sh dev`).

### Why export `pwa` rather than a static template

The exported realm always reflects the current state of `infra/keycloak/realm-export.json`, including any client customisations made after initial setup. No template drift.

---

## README.md Updates

A new **"Multi-project workflow"** section is added covering:

- How to start shared infra (`./run.sh infra:up`)
- How to bootstrap a new project (`./project-setup.sh`)
- How to run the app (`./run.sh dev`)
- How to stop without killing infra (`./run.sh stop`)
- How to stop infra (`./run.sh infra:down`)
- The `APP_NAME` / `DOMAIN` / `KEYCLOAK_REALM` / `POSTGRES_DB` relationship
- Note on `*.localhost` subdomain resolution

---

## Constraints and Edge Cases

- **Infra started by project A**: if project A's directory is deleted, infra keeps running (Docker manages it). Any project can call `infra:down` to stop it.
- **Realm already exists**: step 8b skips creation silently. Re-running setup is safe.
- **Database already exists**: the `pg_database` existence check makes the step idempotent.
- **`.env` already exists**: script aborts unless `--force` is passed.
- **Keycloak startup time**: Keycloak can take 30–60 s on first boot. The poll loop handles this with a clear "waiting for Keycloak..." progress indicator.
