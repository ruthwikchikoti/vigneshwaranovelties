# Decisions and tradeoffs

Short records of the main choices, what else was considered, and when I would
choose differently.

## 1. Deployment, not StatefulSet

**Choice:** a `Deployment` with 2-5 replicas.
**Why:** the app keeps no state. Products, inquiries, admin users and photos are
in Supabase; the only writable paths in the pod are disposable caches.
Any pod can serve any request, so pods need no stable identity or own volume.
**Alternatives:** StatefulSet (needed only if each replica owned data, e.g. if
Postgres ran in the cluster). DaemonSet (one per node, wrong shape for a web app).
**Would change if:** the database moved into the cluster. Then Postgres would be
a StatefulSet with a PVC (or an operator like CloudNativePG) and the web app
would stay a Deployment.

## 2. Supabase stays external

**Choice:** the cluster runs only the stateless app; Supabase remains managed.
**Why:** it is the existing production database, it gives backups, auth and
storage for free, and running Postgres on a laptop cluster adds risk without
helping the shop.
**Tradeoff:** a dependency outside my control. Mitigated by keeping catalog
pages servable from cache when Supabase is down (see probes below), by a
dependency latency metric and alert, and by the `?deps=1` readiness check in
the smoke test.

## 3. Probes: liveness does not check dependencies, readiness does not check Supabase

| Probe | Endpoint | Checks | Why |
|---|---|---|---|
| startup | `/api/health` | process answers | Gives Next.js up to 60 s to start before liveness kicks in |
| liveness | `/api/health` | process answers | Restart only if *this pod* is broken. Restarting cannot fix Supabase |
| readiness | `/api/ready` | required config present | A pod without secrets would fail every inquiry |
| smoke test / monitoring | `/api/ready?deps=1` | + Supabase query | Detects dependency problems without taking pods out of service |

The common mistake is putting the database check in readiness. During a
Supabase outage every pod would turn unready at the same moment and the
ingress would return 503 for everything, including product pages that were
still in the ISR cache. Keeping it out means a Supabase outage degrades the
site (inquiries fail and alert) instead of taking it down.

## 4. Release strategy: rolling update, `maxUnavailable: 0`

**Choice:** rolling update, one extra pod at a time, never below desired count.
A new pod only receives traffic after readiness passes, and old pods are only
removed after that. `preStop: sleep 5` lets the ingress stop routing to a pod
before it shuts down, so in-flight requests are not cut.
**Alternatives considered:**
- *Blue-green:* instant switch and instant rollback, but needs double capacity
  and a second Service/selector flip. Worth it if a release had to be switched
  atomically (e.g. incompatible API between frontend and backend).
- *Canary (Argo Rollouts / weighted ingress):* best when traffic is high enough
  that 5% of users gives a meaningful error signal. For a small shop, 5% of
  traffic is a handful of requests, too few to judge a release.
- *Feature flags:* used for the risky feature. `AI_GENERATION_ENABLED` is
  `"false"` in this environment; it can be enabled in `values-local.yaml`
  without a new image.
**Bad release recovery:** if new pods crash or fail readiness, the rollout
stalls and the old pods keep serving (users see nothing). Argo CD marks the
app Degraded after `progressDeadlineSeconds: 180`. Rollback = `git revert` of
the "Deploy <sha>" commit; Argo CD syncs the previous tag back.
If the release is *running but wrong* (e.g. errors on one page), the SLO burn
alert fires and the same revert applies.

## 5. GitOps with Argo CD (pull) instead of pushing from CI

**Choice:** CI builds and pushes the image, then commits the new tag to
`values-local.yaml`. Argo CD in the cluster polls git and applies it.
**Why:**
- *Drift:* Argo CD compares the cluster with git every 60 s. A manual
  `kubectl edit` shows as OutOfSync and `selfHeal` reverts it. A push-based
  pipeline only knows what it applied last time.
  Caveat found in testing: only fields that git defines are compared, so a
  field added by hand (e.g. an extra env var) is not reverted. RBAC that keeps
  people from writing to the namespace closes that gap.
- *Traceability:* every deployment is a commit (`Deploy abc1234 to local
  cluster`). `git log deploy/helm/vigneshwara-web/values-local.yaml` is the
  release history.
- *Security:* no inbound access to the cluster and no kubeconfig in GitHub.
  My earlier project used a self-hosted runner on my laptop; on a public repo
  that means GitHub-triggered code runs on my machine.
- *Rollback:* `git revert` instead of remembering which command was run.
**Tradeoffs:** one more component to run and understand; up to ~60 s delay
between the tag commit and the sync (GitHub cannot send a webhook to a laptop);
CI writes commits to the branch.
**Would change if:** there were several clusters/environments. I would keep
GitOps but add Argo CD Image Updater or a separate config repo so app commits
and deploy commits are not mixed.

## 6. Where the approval sits

**Choice:** the `promote` job uses the GitHub environment `local-cluster` with
a required reviewer. Lint, tests, scans, build and push run automatically; a
human approves before the new tag is committed (= before it is deployed).
**Why:** everything before that point is reversible and cheap. Changing what
users see is the step worth a human look. Pull requests never reach this job.
**Would change if:** there was a staging environment with good automated
tests. Then staging would deploy automatically and only production would need
approval.

## 7. Helm chart with per-environment values

**Choice:** one chart, `values.yaml` for defaults, `values-local.yaml` for this
environment. A future `values-prod.yaml` would only hold differences.
**Why:** no copied YAML per environment that drifts apart; the chart validates
input (`image.tag` is required, so an untraceable deploy fails at render time).
**Alternative:** Kustomize (used in my earlier project). Fine for small
patches, but templating loops (ConfigMap from a map, conditional monitoring
objects) are clumsier. Argo CD supports both.

## 8. Image tag = git commit SHA

`ghcr.io/ruthwikchikoti/vigneshwara-web:<7-char SHA>`, never `latest`.
The same SHA appears in: the image OCI labels, pod label
`app.kubernetes.io/version`, `/api/version`, the `app_build_info` metric, and
every log line and trace (`service.version`). From any symptom I can get to the
exact commit and pipeline run. `IfNotPresent` pull policy is safe because tags
are never reused.

## 9. Observability choices

- **Request metrics from ingress-nginx**, not the app: it measures what users
  experience (including requests that never reached a pod) and needs no code.
- **App metrics** only for what the ingress cannot see: process health,
  inquiry outcomes (`saved`/`error`/`duplicate`/`invalid`/`spam`) and Supabase
  latency.
- **Traces** via OpenTelemetry (`@vercel/otel`) to Jaeger. Next.js already
  creates spans for requests, rendering and outgoing `fetch`, so Supabase and
  Brevo calls show up as child spans without manual instrumentation.
- **Logs** as JSON lines with `trace_id`; Promtail → Loki; Grafana links a log
  line to its trace.
- **Lighter alternatives:** Grafana Tempo instead of Jaeger (same idea, object
  storage backend); a managed stack (Grafana Cloud) in production so
  monitoring does not die with the cluster.

## 10. Security choices

| Control | Where | What it prevents |
|---|---|---|
| Secrets only in a K8s Secret created from `.env.local` | runtime | Credentials in git or in the Helm chart |
| BuildKit secret mount for the build | build | Service key baked into an image layer (image is public) |
| GitHub `permissions: contents: read` by default, per-job escalation | CI | A compromised step pushing code or packages |
| Actions pinned to commit SHAs | CI | A moved tag injecting code into the pipeline |
| gitleaks on full history | CI | Committed secrets |
| `npm audit` (critical) + Trivy image scan (fixable critical) | CI | Shipping known-exploitable dependencies (this caught a real Next.js RCE advisory) |
| Trivy config scan of Dockerfile and chart | CI | Insecure manifests (root, writable FS, missing limits) |
| Non-root, read-only root FS, drop ALL caps, seccomp | runtime | Privilege escalation, tampering with the app files |
| Pod Security Admission `restricted` on the namespace | runtime | Someone deploying a privileged pod there |
| `automountServiceAccountToken: false` | runtime | A compromised pod talking to the Kubernetes API |
| NetworkPolicy (Calico) | runtime | Lateral movement; only ingress/Prometheus in, only DNS/Jaeger/HTTPS out |
| `/api/metrics` needs a bearer token | runtime | Metrics readable through the public ingress |
| Argo CD AppProject whitelist | delivery | The app's git source creating cluster-wide or unexpected resources |

**Not done (would add for real production):** Sealed Secrets or External
Secrets Operator so secrets can live in git encrypted; image signing (cosign)
with admission verification; TLS on the ingress (cert-manager); SSO for Argo
CD and Grafana.

## 11. Edge → Node.js runtime

The baseline ran API routes on the edge runtime (left over from a Cloudflare
deployment). In a container, Next.js runs edge routes in a sandbox inside the
Node process where tracing and `process` metrics do not work. Switching to
Node.js made every route observable and is also what Vercel recommends now.

## 12. Resources and autoscaling

Requests `100m` / `256Mi`, limits `1 CPU` / `512Mi` (observed idle use is
~100 MiB, page rendering spikes CPU briefly). The HPA scales 2-5 pods at 70%
CPU. Two replicas minimum so a single pod restart or node drain (PDB
`minAvailable: 1`) does not cause downtime. On a single-node cluster this
protects against pod failure, not node failure.
