#!/usr/bin/env bash
# Create/update the app Secret in the cluster from .env.local.
# Secrets never go into git or the Helm chart; the chart only references the
# Secret by name (values.yaml: existingSecret).
#
# Only the keys the app needs in this environment are copied (least privilege):
# AWS keys are left out because AI generation is disabled here, and the VAPID
# private key is left out so test inquiries do not push to the owner's phone.
#
#   scripts/devops/create-app-secret.sh [namespace]
set -euo pipefail
cd "$(dirname "$0")/../.."

NS="${1:-vigneshwara}"
NAME="vigneshwara-web-secrets"
ENV_FILE="${ENV_FILE:-.env.local}"
KEYS=(
  SUPABASE_SERVICE_ROLE_KEY
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  BREVO_API_KEY BREVO_FROM_EMAIL BREVO_FROM_NAME INQUIRY_NOTIFICATION_EMAIL
)

get() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- | sed -E 's/^"(.*)"$/\1/; s/[[:space:]]+#.*$//'; }

# Keep the existing metrics token so Prometheus does not lose access on update.
METRICS_TOKEN="$(kubectl -n "$NS" get secret "$NAME" -o jsonpath='{.data.METRICS_TOKEN}' 2>/dev/null | base64 -d || true)"
[ -n "$METRICS_TOKEN" ] || METRICS_TOKEN="$(openssl rand -hex 24)"

# Values go through a private temp file, not command-line arguments, so they
# never show up in `ps` output or shell history.
tmp="$(mktemp)"; chmod 600 "$tmp"; trap 'rm -f "$tmp"' EXIT
echo "METRICS_TOKEN=$METRICS_TOKEN" > "$tmp"
for k in "${KEYS[@]}"; do
  v="$(get "$k")"
  [ -n "$v" ] || { echo "warning: $k is empty in $ENV_FILE" >&2; continue; }
  printf '%s=%s\n' "$k" "$v" >> "$tmp"
done

kubectl get ns "$NS" >/dev/null 2>&1 || kubectl create ns "$NS"
kubectl -n "$NS" create secret generic "$NAME" --from-env-file="$tmp" --dry-run=client -o yaml \
  | kubectl apply -f - >/dev/null
echo "secret/$NAME applied in namespace $NS ($(wc -l < "$tmp") keys)"
