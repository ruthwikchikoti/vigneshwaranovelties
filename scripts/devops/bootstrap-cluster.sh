#!/usr/bin/env bash
# One-time setup of a local cluster: observability stack, Argo CD, the app
# Secret and the Argo CD Application. After this, deployments happen through
# git (CI updates the image tag, Argo CD syncs it).
#
# Prerequisites: minikube started with
#   minikube start --cpus=6 --memory=9216 --cni=calico --addons=ingress,metrics-server
set -euo pipefail
cd "$(dirname "$0")/../.."

KPS_VERSION=92.10.1
LOKI_VERSION=7.3.0
PROMTAIL_VERSION=6.17.1
ARGOCD_VERSION=10.10.5

step() { printf '\n==> %s\n' "$*"; }

step "Helm repositories"
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts >/dev/null
helm repo add grafana https://grafana.github.io/helm-charts >/dev/null
helm repo add argo https://argoproj.github.io/argo-helm >/dev/null
helm repo update >/dev/null

step "Namespaces"
kubectl apply -f deploy/cluster/namespaces.yaml

step "Grafana admin secret"
if ! kubectl -n monitoring get secret grafana-admin >/dev/null 2>&1; then
  kubectl -n monitoring create secret generic grafana-admin \
    --from-literal=admin-user=admin \
    --from-literal=admin-password="$(openssl rand -base64 18)"
fi

step "Prometheus, Alertmanager, Grafana"
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --version "$KPS_VERSION" -n monitoring \
  -f deploy/observability/kube-prometheus-stack.values.yaml --wait --timeout 10m

step "Loki + Promtail (logs)"
helm upgrade --install loki grafana/loki --version "$LOKI_VERSION" -n observability \
  -f deploy/observability/loki.values.yaml --wait --timeout 10m
helm upgrade --install promtail grafana/promtail --version "$PROMTAIL_VERSION" -n observability \
  -f deploy/observability/promtail.values.yaml --wait

step "Jaeger (traces), ingress metrics, dashboards"
kubectl apply -f deploy/observability/jaeger.yaml
kubectl apply -f deploy/observability/ingress-nginx-podmonitor.yaml
# The minikube ingress addon starts the controller with request metrics off.
if ! kubectl -n ingress-nginx get deploy ingress-nginx-controller \
    -o jsonpath='{.spec.template.spec.containers[0].args}' | grep -q enable-metrics=true; then
  kubectl -n ingress-nginx patch deploy ingress-nginx-controller --type json \
    -p '[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--enable-metrics=true"}]'
  kubectl -n ingress-nginx rollout status deploy/ingress-nginx-controller --timeout=180s
fi
kubectl apply -f deploy/observability/grafana-dashboard.yaml

step "Argo CD"
helm upgrade --install argocd argo/argo-cd --version "$ARGOCD_VERSION" -n argocd \
  -f deploy/argocd/argocd.values.yaml --wait --timeout 10m

step "App secret"
scripts/devops/create-app-secret.sh vigneshwara

step "Argo CD project + application"
kubectl apply -f deploy/argocd/project.yaml
kubectl apply -f deploy/argocd/application.yaml

IP="$(minikube ip 2>/dev/null || echo 127.0.0.1)"
cat <<MSG

Done. Add to /etc/hosts:
  $IP vigneshwara.local grafana.vigneshwara.local jaeger.vigneshwara.local argocd.vigneshwara.local

Passwords:
  Grafana: kubectl -n monitoring get secret grafana-admin -o jsonpath='{.data.admin-password}' | base64 -d
  Argo CD: kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d
MSG
