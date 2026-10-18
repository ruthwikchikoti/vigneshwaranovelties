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
**Tradeoff:** a dependency outside my control. Mitigated by keeping pods ready
when Supabase is down (see probes below), by metrics and alerts on every
Supabase query (`SupabaseErrors`, `SupabaseSlow`), and by the smoke test, which
checks Supabase through `/api/ready?deps=1` and fails if the catalogue page has
no products.

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
site instead of taking it down.

What "degrades" means was checked with an outage drill (EVIDENCE.md): pods
stayed ready and pages already in the cache kept working, inquiries failed
with 500, uncached pages first hung until the query timed out and then showed
an empty catalogue with status 200, because the
existing data layer falls back to empty results instead of throwing. A 200
with no products is invisible to the 5xx SLO, so every failed query is now
counted and logged and `SupabaseErrors` alerts on it.
**Would change next:** make catalogue queries throw during background
revalidation, so Next.js keeps serving the last good page instead of caching
an empty one.

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
  without a new image. The ConfigMap checksum annotation restarts the pods on
  a change, and `/api/version` reports the flags each pod is running with.
  The toggle was drilled (EVIDENCE.md). Turning it on here would only show the
  admin UI: the AWS credentials are deliberately not in this cluster.
**Bad release recovery:** if new pods crash or fail readiness, the rollout
stalls and the old pods keep serving (users see nothing). Argo CD marks the
app Degraded after `progressDeadlineSeconds: 180`. Rollback = `git revert` of
the "Deploy <sha>" commit; Argo CD syncs the previous tag back.
If the release is *running but wrong* (pods healthy, behaviour broken), the
rollout succeeds, so only monitoring catches it (burn-rate alert, smoke test
content checks); the same revert applies. Both cases were drilled: a broken
tag, and a `git revert` of a healthy CI deploy commit (EVIDENCE.md §5).

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
**Gap:** Argo CD itself and the observability stack are installed once by
`bootstrap-cluster.sh` with Helm, so drift in *them* is not detected. The next
step is an "app of apps": an Argo CD Application per platform component,
including Argo CD managing its own config.

## 6. Where the approval sits

**Choice:** the `promote` job uses the GitHub environment `local-cluster` with
a required reviewer. Lint, tests, scans, build and push run automatically; a
human approves before the new tag is committed (= before it is deployed).
**Why:** everything before that point is reversible and cheap. Changing what
users see is the step worth a human look. Pull requests never reach this job.
**How it is enforced:** admins cannot bypass the environment review, the
promote job only deploys an image whose Sigstore signature from this workflow
verifies, and repository rulesets block force-pushes and deletion of the
release branch and require a PR with green CI for `main`.
**Known gaps (single maintainer):** I am the only reviewer, so I approve my
own releases (`prevent_self_review` would lock me out). Anyone with push access
could still edit `image.tag` by hand; the two rollback drill commits did
exactly that on purpose. A rollback that points back to an image that was
already approved and is already running is allowed to skip CI, because waiting
for a build during an incident is the wrong tradeoff. With a team, deploy
config would live in a separate repo where only the CI bot can push.
**Would change if:** there was a staging environment with good automated
tests. Then staging would deploy automatically and only production would need
approval.

## 7. Helm chart with per-environment values

**Choice:** one chart, `values.yaml` for defaults, `values-local.yaml` for this
environment. A future `values-prod.yaml` would only hold differences.
**Why:** no copied YAML per environment that drifts apart; the chart validates
input (`image.tag` is required, so an untraceable deploy fails at render time).
What would differ in a production values file (`values-prod.yaml`, not
created because there is no second cluster):

| Setting | local (minikube) | production |
|---|---|---|
| `ingress.host` / TLS | `vigneshwara.local`, HTTP | real domain, TLS from cert-manager |
| Supabase | the production project (shared) | its own project; a separate staging project for local |
| replicas / HPA | 2-5 on one node | 3-10, spread over zones |
| `NEXT_PUBLIC_SITE_URL` | `http://vigneshwara.local` | `https://vigneshwaranovelties.com` |
| secrets | script from `.env.local` | External Secrets Operator from a vault |
| `AI_GENERATION_ENABLED` | `"false"` | `"true"` with AWS credentials |
| alert receiver | none | email / WhatsApp webhook |

**Alternative:** Kustomize (used in my earlier project). Fine for small
patches, but templating loops (ConfigMap from a map, conditional monitoring
objects) are clumsier. Argo CD supports both.

## 8. Image tag = git commit SHA

`ghcr.io/ruthwikchikoti/vigneshwara-web:<7-char SHA>`, never `latest`.
The same SHA appears in: the image OCI labels, pod label
`app.kubernetes.io/version`, `/api/version`, the `app_build_info` metric, and
every log line and trace (`service.version`). From any symptom I can get to the
exact commit and pipeline run. GHCR does not enforce immutable tags, so the
pipeline does: if the tag already exists it is not pushed again. CI also
records the digest, and the pod pulls `tag@digest`, so even a re-pushed tag
could not change what runs. That is why `IfNotPresent` is safe.

## 9. Observability choices

- **Request metrics from ingress-nginx**, not the app: it measures what users
  experience (including requests that never reached a pod) and needs no code.
- **App metrics** only for what the ingress cannot see: process health,
  inquiry outcomes (`saved`/`error`/`duplicate`/`invalid`/`spam`), owner
  notification outcomes (`app_notifications_total`), and latency and errors of
  every Supabase query. These catch failures that still return 200: an empty
  catalogue, or an inquiry saved but the owner never told.
- **Latency SLO as a ratio** (share of requests under 1 s, from the ingress
  histogram's `le="1.0"` bucket) rather than alerting on p95: at this shop's
  traffic, a few slow requests swing the p95 a lot. The alert also needs at
  least 50 requests in 30 minutes.
- **SLO window:** the SLO is defined over 30 days, but locally Prometheus keeps
  3 days (disk), so the dashboard's error budget uses the last 3 days. In
  production, long-window SLOs would come from a long-term store (Thanos/Mimir
  or Grafana Cloud).
- **Alert delivery:** alerts are visible in Prometheus, Alertmanager and
  Grafana but not sent anywhere (no receiver locally). In production the
  receiver would be email or a WhatsApp webhook to me, since the owner already
  lives on WhatsApp.
- **Traces** via OpenTelemetry (`@vercel/otel`) to Jaeger. Next.js already
  creates spans for requests, rendering and outgoing `fetch`, so Supabase and
  Brevo calls show up as child spans without manual instrumentation. A custom
  sampler drops traces for `/api/health`, `/api/ready` and `/api/metrics`
  (kubelet probes and Prometheus scrapes); otherwise they were almost every
  stored trace.
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
| `npm audit` (critical) + Trivy image scan (fixable high and critical) | CI | Shipping known-exploitable dependencies (this caught a real Next.js RCE advisory, and OpenSSL fixes missing from the base image) |
| Base image, gitleaks and curl images pinned by digest; kubeconform download checked against its SHA-256 | CI / build | A re-tagged upstream image or tampered download changing what we build or run |
| Image signed with cosign (keyless, Sigstore) plus a CycloneDX SBOM attestation; the promote job verifies the signature before deploying | CI / delivery | Deploying an image that this pipeline did not build |
| Deploy by digest (`tag@digest`), tags never overwritten | delivery | A re-pushed tag silently changing the running code |
| Dependabot (npm, actions, Docker digests) and vulnerability alerts | repo | Falling behind on security fixes (the config takes effect once merged to `main`) |
| Rulesets: no force-push or deletion; `main` only via PR with green CI; no admin bypass on the release approval | repo | Rewriting history or skipping the pipeline |
| Trivy config scan of Dockerfile and chart | CI | Insecure manifests (root, writable FS, missing limits) |
| Non-root, read-only root FS, drop ALL caps, seccomp | runtime | Privilege escalation, tampering with the app files |
| Pod Security Admission `restricted` on the namespace | runtime | Someone deploying a privileged pod there |
| `automountServiceAccountToken: false` | runtime | A compromised pod talking to the Kubernetes API |
| NetworkPolicy (Calico) | runtime | Lateral movement; only ingress/Prometheus in, only DNS/Jaeger/HTTPS out |
| `/api/metrics` needs a bearer token | runtime | Metrics readable through the public ingress |
| Argo CD AppProject whitelist | delivery | The app's git source creating cluster-wide or unexpected resources |

**Not done (would add for real production):** Sealed Secrets or External
Secrets Operator so secrets can live in git encrypted; signature verification
at admission (Kyverno or the Sigstore policy controller), so the cluster itself
refuses unsigned images rather than only the pipeline; TLS on the ingress
(cert-manager); SSO for Argo CD and Grafana; RBAC so that no person can write
to the app namespace directly.

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
