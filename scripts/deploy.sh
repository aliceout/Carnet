#!/usr/bin/env bash
# Deploy script — pull GHCR + up -d. Idempotent, pas de wipe.
#
# Invoqué par le webhook handler du VPS après un workflow GHA `Docker build`
# vert sur main. Le hook s'occupe de cloner / pull le repo dans $DEPLOY_DIR ;
# ce script se contente de :
#   1. sourcer les creds Infisical (auth Machine Identity Universal Auth)
#   2. login Infisical → token
#   3. export les secrets app → .env (chmod 600 avant écriture)
#   4. créer les bind mounts data
#   5. docker compose pull && up -d
#   6. attendre que tous les containers soient healthy
#
# DEPLOY_DIR est résolu depuis l'emplacement du script — le hook l'invoque
# via /var/www/carnet/scripts/deploy.sh, ça résout à /var/www/carnet.
# En dev local, ça résout à la racine du repo.
#
# CREDS_FILE par défaut : $HOME/.config/infisical/carnet.env (écrit par
# l'install.sh côté vps-install). Override via env si besoin.

set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CREDS_FILE="${CREDS_FILE:-$HOME/.config/infisical/carnet.env}"

[[ -s "$CREDS_FILE" ]] || {
  echo "ERR creds Infisical absents : $CREDS_FILE" >&2
  exit 1
}

# 1. Charge les creds bootstrap (INFISICAL_API_URL, _PROJECT_ID, _CLIENT_ID,
#    _CLIENT_SECRET, _ENV). Le `set -a` exporte tout ce qui est défini.
set -a
# shellcheck source=/dev/null
source "$CREDS_FILE"
set +a

: "${INFISICAL_API_URL:?INFISICAL_API_URL manquant dans $CREDS_FILE}"
: "${INFISICAL_PROJECT_ID:?INFISICAL_PROJECT_ID manquant dans $CREDS_FILE}"
: "${INFISICAL_CLIENT_ID:?INFISICAL_CLIENT_ID manquant dans $CREDS_FILE}"
: "${INFISICAL_CLIENT_SECRET:?INFISICAL_CLIENT_SECRET manquant dans $CREDS_FILE}"
INFISICAL_ENV="${INFISICAL_ENV:-prod}"

# 2. Login Infisical self-hosted → token éphémère.
TOKEN=$(infisical login --method=universal-auth \
  --domain="$INFISICAL_API_URL" \
  --client-id="$INFISICAL_CLIENT_ID" \
  --client-secret="$INFISICAL_CLIENT_SECRET" \
  --plain --silent)

# 3. Export tous les secrets app vers .env racine. Chmod AVANT d'écrire pour
#    qu'aucun process tiers ne puisse lire le fichier en 644 même brièvement.
#
#    Le projet Infisical Carnet a ses secrets organisés en 4 sous-dossiers
#    (payload/, postgres/, smtp/, web/) — `--path=/` ne recurse pas, on
#    itère explicitement. `set -euo pipefail` au top fait aborter le
#    script si l'un des fetch foire (.env partiel = silent broken deploy).
ENV_FILE="$DEPLOY_DIR/.env"
: > "$ENV_FILE"
chmod 600 "$ENV_FILE"

for subpath in payload postgres smtp web; do
  echo "[deploy] fetching /$subpath"
  infisical export \
    --domain="$INFISICAL_API_URL" \
    --projectId="$INFISICAL_PROJECT_ID" \
    --env="$INFISICAL_ENV" \
    --path="/$subpath" \
    --format=dotenv \
    --token="$TOKEN" >> "$ENV_FILE"
done

# Sanity check — si l'un de ces 2 secrets est absent, le deploy partirait
# en vrille (Postgres refuse la connexion / Payload refuse de booter).
grep -q '^POSTGRES_PASSWORD=' "$ENV_FILE" || {
  echo "ERR: POSTGRES_PASSWORD manquant dans $ENV_FILE" >&2
  exit 1
}
grep -q '^PAYLOAD_SECRET=' "$ENV_FILE" || {
  echo "ERR: PAYLOAD_SECRET manquant dans $ENV_FILE" >&2
  exit 1
}

# 4. Bind mounts data (Postgres + médias Payload). DATA_DIR est exporté
#    pour que `docker compose` puisse l'interpoler dans compose.yml.
export DATA_DIR="${DATA_DIR:-$HOME/data/carnet}"
mkdir -p "$DATA_DIR/postgres" "$DATA_DIR/payload-media"

# 5. Pull les images GHCR + restart propre.
#    `down` (sans -v !) avant `up -d` libère les ports et nettoie
#    le network proprement. Sinon un docker-proxy zombie d'un deploy
#    précédent qui a crashé peut tenir le port et bloquer le `up`
#    avec "port is already allocated". L'absence de -v est cruciale :
#    -v wiperait les bind mounts (data Postgres, payload-media).
#    Tradeoff : ~2-5s de downtime entre down et up.
cd "$DEPLOY_DIR"
docker compose pull
docker compose down
docker compose up -d

# 6. Attente healthy — chaque container a son healthcheck défini dans
#    compose.yml, on les sonde via `docker inspect`. Timeout 90s.
expected="carnet-db carnet-payload carnet-site"
deadline=$(( $(date +%s) + 90 ))
echo "Waiting for services to become healthy..."
while [ "$(date +%s)" -lt "$deadline" ]; do
  all_healthy=true
  for c in $expected; do
    status=$(docker inspect -f '{{.State.Health.Status}}' "$c" 2>/dev/null || echo missing)
    if [ "$status" != "healthy" ]; then
      all_healthy=false
      break
    fi
  done
  if [ "$all_healthy" = true ]; then
    echo "[carnet-deploy] OK ($(date -Iseconds))"
    docker compose ps
    exit 0
  fi
  sleep 3
done

echo "[carnet-deploy] timeout — services pas healthy à temps :" >&2
docker compose ps >&2
exit 1
