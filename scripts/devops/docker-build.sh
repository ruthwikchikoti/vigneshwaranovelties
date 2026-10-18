#!/usr/bin/env bash
# Build the container image locally with the same arguments CI uses.
# Public NEXT_PUBLIC_* values and the build-time secret are read from .env.local.
#
#   scripts/devops/docker-build.sh [image-name]
set -euo pipefail
cd "$(dirname "$0")/../.."

IMAGE="${1:-vigneshwara-web:local}"
ENV_FILE="${ENV_FILE:-.env.local}"
[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE" >&2; exit 1; }

get() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- | sed -E 's/^"(.*)"$/\1/; s/[[:space:]]+#.*$//'; }

SECRET_FILE="$(mktemp)"
trap 'rm -f "$SECRET_FILE"' EXIT
get SUPABASE_SERVICE_ROLE_KEY > "$SECRET_FILE"

SHA="$(git rev-parse --short HEAD)"
args=()
for k in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY NEXT_PUBLIC_IMAGEKIT_URL \
         NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_WHATSAPP_NUMBER NEXT_PUBLIC_OWNER_PHONE \
         NEXT_PUBLIC_OWNER_EMAIL NEXT_PUBLIC_VAPID_PUBLIC_KEY; do
  args+=(--build-arg "$k=$(get "$k")")
done

docker build "${args[@]}" \
  --secret id=supabase_service_role_key,src="$SECRET_FILE" \
  --build-arg APP_VERSION="$SHA" \
  --build-arg GIT_SHA="$(git rev-parse HEAD)" \
  --build-arg BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -t "$IMAGE" .
