# Running on Kubernetes (local minikube)

## Prerequisites

| Tool | Version used | Notes |
|---|---|---|
| Docker | 29.x | minikube driver |
| minikube | 1.37+ (Kubernetes v1.34) | |
| kubectl | 1.34 | |
| Helm | 3.16 | |
| openssl, git, bash | any | used by the scripts |
| Machine | 6 CPU / 9 GB RAM free for minikube | full observability stack included |

Access needed:
- a `.env.local` with the Supabase / Brevo values (see `.env.example`); never committed
- push access to the GitHub repo (for the GitOps flow) and permission to approve the `local-cluster` environment

## 1. Start the cluster

Calico is needed because the default minikube network plugin does not
enforce NetworkPolicies.

```bash
minikube start --driver=docker --cpus=6 --memory=9216 --cni=calico \
  --addons=ingress,metrics-server
```

## 2. Bootstrap (one time, ~10 minutes)

```bash
scripts/devops/bootstrap-cluster.sh
```

This installs, with pinned chart versions:
- kube-prometheus-stack (Prometheus, Alertmanager, Grafana) in `monitoring`
- Loki, Promtail and Jaeger in `observability`
- Argo CD in `argocd`
- the app Secret `vigneshwara-web-secrets` from `.env.local`
- the Argo CD `AppProject` and `Application`

Argo CD then deploys the chart from the `devops/final-project` branch with the
image tag in `deploy/helm/vigneshwara-web/values-local.yaml`.

Add the hosts entry the script prints, for example:

```
192.168.49.2 vigneshwara.local grafana.vigneshwara.local jaeger.vigneshwara.local argocd.vigneshwara.local
```

## 3. Check it works

```bash
kubectl -n argocd get application vigneshwara-web     # Synced, Healthy
kubectl -n vigneshwara get pods                        # 2/2 Running, Ready
curl -s http://vigneshwara.local/api/version           # running commit
curl -s "http://vigneshwara.local/api/ready?deps=1"    # ready, Supabase ok
open http://vigneshwara.local                          # storefront
```

Logins:
```bash
# Grafana (user admin)
kubectl -n monitoring get secret grafana-admin -o jsonpath='{.data.admin-password}' | base64 -d
# Argo CD (user admin)
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d
```

## 4. Deploying a change (the normal flow)

1. Commit and push to `devops/final-project` (or `main`).
2. GitHub Actions runs: lint, typecheck, tests → gitleaks, npm audit, Trivy
   config → Helm lint + schema check → image build → container smoke test →
   Trivy image scan → push `ghcr.io/ruthwikchikoti/vigneshwara-web:<sha>`.
3. The **Promote** job waits for approval (GitHub → Actions → the run →
   *Review deployments* → `local-cluster` → Approve).
4. It commits `Deploy <sha> to local cluster`, changing `image.tag`.
5. Argo CD notices within ~60 s, renders the chart and does a rolling update.
6. The PostSync smoke-test Job checks the new version, readiness with Supabase,
   the home and shop pages, and the inquiry API. Argo CD shows the sync as
   succeeded only if it passes.
7. Verify: `curl http://vigneshwara.local/api/version` shows the new `<sha>`.

PRs run steps 2 (without pushing the image) and never deploy.

## 5. Without Argo CD (manual / debugging)

The same chart works with plain Helm:

```bash
scripts/devops/docker-build.sh vigneshwara-web:dev
minikube image load vigneshwara-web:dev
helm upgrade --install vigneshwara-web deploy/helm/vigneshwara-web -n vigneshwara \
  -f deploy/helm/vigneshwara-web/values-local.yaml \
  --set image.repository=vigneshwara-web --set image.tag=dev --atomic --timeout 5m
```

(Pause Argo CD auto-sync first, otherwise it puts the git version back.)

## 6. Rollback

See [OPERATIONS.md](OPERATIONS.md#rolling-back-a-release): `git revert` the
deploy commit and push.

## 7. Clean up

```bash
kubectl -n argocd delete application vigneshwara-web
minikube delete
```

## Known limitations

- **Single node.** Two replicas protect against a pod failure, not a node
  failure. Topology spread is set but has nothing to spread across.
- **Local only.** The ingress is plain HTTP on `*.vigneshwara.local`; no TLS,
  no public DNS. Production traffic still goes to Vercel; this cluster is the
  DevOps environment for the course.
- **Same Supabase as production.** Test inquiries land in the real database
  (delete them in `/admin`). A separate Supabase project would isolate this.
- **Argo CD polls git** (60 s) because GitHub cannot send a webhook to a laptop.
- **Per-pod ISR cache.** An admin edit refreshes other pods only after the
  cache TTL (60 s data, 10 min pages).
- **Secrets** are created from `.env.local` by a script rather than managed
  declaratively (Sealed Secrets / External Secrets would be the next step).
- **Jaeger pinned to 2.20.** 2.21 removed the query API that Grafana's Jaeger
  data source uses.
- **minikube specifics.** The bootstrap script turns on ingress-nginx request
  metrics (off in the addon) and Promtail parses Docker-format logs; on a
  containerd cluster use the `cri: {}` stage instead.
- **Traces in memory.** Jaeger keeps traces only until it restarts; Loki keeps
  72 h of logs; Prometheus 3 days.
- **Alertmanager has no receiver** configured (no Slack/email); alerts are
  visible in Prometheus/Alertmanager UI and Grafana.
- AI image generation is disabled in this environment (feature flag) and its
  AWS credentials are not deployed.
