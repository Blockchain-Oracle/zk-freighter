#!/usr/bin/env bash
# One-shot Coolify provisioning for ZK Freighter — creates the Postgres
# databases and all six applications (nixpacks, shared repo, APP_NAME dispatch),
# sets their env vars, and wires domains. Idempotent-ish: it will error if an
# app name already exists; delete or skip as needed.
#
# Prereqs (install once, in Coolify's UI):
#   - An API token with write perms:  Keys & Tokens → API tokens
#   - A GitHub App source connected to Blockchain-Oracle/zk-freighter
#     (Sources → GitHub Apps) — needed for private-repo + auto-deploy
#   - Note your Server UUID, Project UUID, GitHub App UUID (Coolify UI)
#
# Then export these and run:  bash scripts/coolify-provision.sh
set -euo pipefail

: "${COOLIFY_URL:?export COOLIFY_URL=https://coolify.<host>}"
: "${COOLIFY_TOKEN:?export COOLIFY_TOKEN=<api-token>}"
: "${SERVER_UUID:?export SERVER_UUID=<server-uuid>}"
: "${PROJECT_UUID:?export PROJECT_UUID=<project-uuid>}"
: "${GITHUB_APP_UUID:?export GITHUB_APP_UUID=<github-app-uuid>}"
ENVIRONMENT="${ENVIRONMENT:-production}"
REPO="${REPO:-Blockchain-Oracle/zk-freighter}"
BRANCH="${BRANCH:-main}"
APEX="${APEX:-zkfreighter.app}"

cf() { coolify --context zkf "$@"; }

echo "▸ registering Coolify context 'zkf' → $COOLIFY_URL"
coolify context add zkf "$COOLIFY_URL" "$COOLIFY_TOKEN" --force >/dev/null
coolify context verify --context zkf

common=(--server-uuid "$SERVER_UUID" --project-uuid "$PROJECT_UUID"
        --environment-name "$ENVIRONMENT" --github-app-uuid "$GITHUB_APP_UUID"
        --git-repository "$REPO" --git-branch "$BRANCH"
        --build-pack nixpacks --base-directory /)

# ── Databases ────────────────────────────────────────────────────
echo "▸ creating Postgres databases (bootnode testnet + funding)"
cf database create postgresql --name zkf-bootnode-testnet-db \
  --server-uuid "$SERVER_UUID" --project-uuid "$PROJECT_UUID" \
  --environment-name "$ENVIRONMENT" --postgres-db bootnode --instant-deploy || true
cf database create postgresql --name zkf-funding-db \
  --server-uuid "$SERVER_UUID" --project-uuid "$PROJECT_UUID" \
  --environment-name "$ENVIRONMENT" --postgres-db funding --instant-deploy || true
echo "  ↳ copy each DB's internal connection URL (coolify database list) into"
echo "    the DATABASE_URL env of the bootnode / funding-api apps below."

# ── Apps ─────────────────────────────────────────────────────────
# create <uuid-capturing helper>
mk() { # mk <name> <domain> <port> <APP_NAME>
  local name="$1" domain="$2" port="$3" appname="$4"
  echo "▸ creating app: $name → https://$domain (:$port)"
  cf app create github "${common[@]}" \
    --name "$name" --domains "https://$domain" --ports-exposes "$port" \
    ${5:+--health-check-enabled --health-check-path "$5"} || true
}

mk zkf-landing        "$APEX"                     4174 "@zk-freighter/landing"
mk zkf-web            "app.$APEX"                  4173 "@zk-freighter/web"
mk zkf-docs           "docs.$APEX"                 3000 "@zk-freighter/docs"
mk zkf-funding-api    "api.$APEX"                  8787 "@zk-freighter/funding-api" /health
mk zkf-bootnode       "bootnode.$APEX"            8788 "@zk-freighter/bootnode"    /health
mk zkf-bootnode-main  "mainnet-bootnode.$APEX"    8788 "@zk-freighter/bootnode"    /health

echo
echo "✓ apps + databases created. NEXT:"
echo "  1. coolify --context zkf app list        # copy each app UUID"
echo "  2. set env per app (see docs/deploy/coolify.md 'env matrix'):"
echo "       coolify --context zkf app env sync <uuid> --file deploy/<service>.env"
echo "     — critically: APP_NAME, the VITE_ZKF_* build vars, DATABASE_URL,"
echo "       ZKF_TESTNET_FUNDER_SECRET, ZKF_BOOTNODE_NETWORK=mainnet (mainnet only)."
echo "  3. enable auto-deploy on each app (Coolify UI: Automatic Deployment),"
echo "     or trigger: coolify --context zkf deploy uuid <uuid> --force"
