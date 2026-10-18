# Submission - Advanced DevOps final project

| | |
|---|---|
| Name | Ruthwik Chikoti |
| Student ID | 10111 |
| Project | Vigneshwara Novelties - storefront and inquiry site for a jewellery shop |
| Repository | https://github.com/ruthwikchikoti/vigneshwaranovelties |
| Baseline commit | [`267cc62`](https://github.com/ruthwikchikoti/vigneshwaranovelties/commit/267cc62e226b49403aef96cc0022fb1eb2cedb04) (tag `baseline`) |
| Pull request | [#6](https://github.com/ruthwikchikoti/vigneshwaranovelties/pull/6) `devops/final-project` → `main` |
| Final commit | the `Deploy <sha> to local cluster` commit at the head of PR #6; the exact hash is stated in the PR description |

## The application

Next.js 15 (App Router, TypeScript) site in English and Telugu. Customers browse
the catalogue and send inquiries; the owner manages products, offers and
inquiries in `/admin`. Data, auth and photos are in Supabase, images are served
through ImageKit, inquiry emails go through Brevo.

## What existed at the baseline

- Deployed to Vercel through its Git integration (no pipeline of our own)
- ESLint (with 8 existing errors, so it was disabled during builds), `tsc`
  typecheck, Vitest unit tests, all run by hand
- `scripts/check-env.ts` to check environment variables
- `.env*` files ignored by git

No Dockerfile, no CI pipeline, no Kubernetes manifests, no health endpoints,
no metrics/logs/tracing setup, no security scanning.

## What this PR adds

See the PR description and [docs/](.) for detail.

- **App:** health / readiness / version / metrics endpoints, JSON logs with
  trace ids, OpenTelemetry tracing, Node.js runtime for all routes, lint fixed
- **Container:** multi-stage, non-root, read-only-root-FS image; build secret
  not stored in layers; tagged by commit SHA
- **Kubernetes (Helm chart):** Deployment, Service, Ingress, ConfigMap,
  probes, resources, HPA, PDB, NetworkPolicy, ServiceMonitor, PrometheusRule,
  post-deploy smoke test
- **CI/CD:** GitHub Actions (lint, typecheck, tests, gitleaks, npm audit,
  Trivy config + image scans, Helm schema validation, container smoke test,
  push to GHCR), approval gate, GitOps promotion, Argo CD sync
- **Release control:** rolling update with no capacity loss, git-revert
  rollback, drift detection and self-heal, version traceable end to end,
  feature flag for AI generation
- **Observability:** Prometheus, Grafana dashboard, SLOs, burn-rate alerts,
  Loki logs, Jaeger traces, runbooks
- **Security:** secrets outside git, least-privilege CI tokens, SHA-pinned
  actions, Pod Security `restricted`, NetworkPolicy, no SA token, metrics auth,
  Argo CD project whitelist, image signing and SBOM, digest pinning,
  branch rulesets, Dependabot (active after merge)

## Run instructions

[docs/RUNNING.md](RUNNING.md)

## Evidence

[docs/EVIDENCE.md](EVIDENCE.md): pipeline run and image for a commit, the
deployed version, an inquiry followed through metrics, logs and a trace, the
dashboard and SLO values, and drift, bad-release and pod-failure drills.
