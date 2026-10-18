# Evidence

Everything below was captured from the running minikube cluster and GitHub
on 18 Oct 2026 (times in UTC). No secrets are shown. Commands are in
[RUNNING.md](RUNNING.md) and [OPERATIONS.md](OPERATIONS.md), so each check can
be repeated.

## 1. Pipeline run tied to a commit

Commit [`37e1f27`](https://github.com/ruthwikchikoti/vigneshwaranovelties/commit/37e1f27)
("Upgrade Next.js to 15.5.28 and pin patched transitive deps"),
run [39095389407](https://github.com/ruthwikchikoti/vigneshwaranovelties/actions/runs/39095389407):

| Job | Result | Time |
|---|---|---|
| Lint, typecheck, unit tests | success | 03:56:55 to 03:57:29 |
| Secret, dependency and config scans (gitleaks, npm audit, Trivy config) | success | 03:56:54 to 03:57:13 |
| Validate Helm chart (lint + kubeconform) | success | 03:56:54 to 03:56:59 |
| Build, scan and push image (container smoke test, Trivy image scan) | success | 03:57:31 to 04:01:31 |
| Promote to local cluster (GitOps), **manual approval** | success | 05:35:25 to 05:35:30 |

Image: `ghcr.io/ruthwikchikoti/vigneshwara-web:37e1f27`,
digest `sha256:673de4bc53cdd2824f4bf126328cc86b2356cfa86fad9e8d5a93daa2303a03bd`.

The promote job created commit `f1f2cb6 Deploy 37e1f27 to local cluster`,
which changes only `image.tag` in `values-local.yaml`.

**The security gate blocked a release.** The run before it,
[39095149771](https://github.com/ruthwikchikoti/vigneshwaranovelties/actions/runs/39095149771)
on `b2b7e54`, failed at `npm audit --audit-level=critical`. The cause was a
critical Next.js advisory (RCE, plus cache poisoning on self-hosted servers)
in the version the project was using. Nothing was built or deployed. Commit
`37e1f27` upgraded Next.js and pinned patched transitive dependencies, and
`npm audit` now reports 0 vulnerabilities.

## 2. Deployed version

```
$ kubectl -n argocd get application vigneshwara-web
sync=Synced  health=Healthy  revision=f1f2cb6 (later 9f0acd6, 97c6777)

$ kubectl -n vigneshwara get pods,jobs,ingress
pod/vigneshwara-web-6987c646f9-nlm9q   1/1  Running    0
pod/vigneshwara-web-6987c646f9-xpkns   1/1  Running    0
pod/vigneshwara-web-smoke-test-9s6pw   0/1  Completed  0
job.batch/vigneshwara-web-smoke-test   Complete  1/1  14s
ingress.networking.k8s.io/vigneshwara-web  nginx  vigneshwara.local  192.168.49.2  80

$ curl -s http://vigneshwara.local/api/version     # 4 requests, both pods answer
{"service":"vigneshwara-web","version":"37e1f27","commit":"37e1f272c0d5e4258cbff572c712bc40eeb72477","builtAt":"2026-10-18T03:57:35Z","pod":"vigneshwara-web-6987c646f9-nlm9q"}
{"service":"vigneshwara-web","version":"37e1f27","commit":"37e1f272c0d5e4258cbff572c712bc40eeb72477","builtAt":"2026-10-18T03:57:35Z","pod":"vigneshwara-web-6987c646f9-xpkns"}
```

The PostSync smoke test that Argo CD runs after every sync:

```
== version (expect 37e1f27)
{"service":"vigneshwara-web","version":"37e1f27",...,"pod":"vigneshwara-web-6987c646f9-xpkns"}
== readiness incl. Supabase
{"status":"ready","missingConfig":[],"dependencies":[{"name":"supabase","ok":true,"latencyMs":1070}]}
== storefront home page
200
== shop page (labelled "product page" in this older smoke test; it is the catalogue listing)
200
== inquiry API rejects invalid input (no data written)
smoke test passed
```

### Later deployments

The same flow ran again for `e0a1c4f`, run
[39102801381](https://github.com/ruthwikchikoti/vigneshwaranovelties/actions/runs/39102801381):
checks 06:19:55 to 06:20:32, image built, scanned and pushed by 06:23:16
(`sha256:6dea4c07844a9207ce38c9a2fa4b0e20bec1a12129853c0fd12148210dade7d7`),
approved and promoted at 06:27:37 (`dbc4f1d Deploy e0a1c4f to local cluster`).
Argo CD synced it with no retries, the smoke test passed, and both pods return
`"version":"e0a1c4f"` from `/api/version`.

After the review fixes, `2c6f218` went through the hardened pipeline, run
[39109961347](https://github.com/ruthwikchikoti/vigneshwaranovelties/actions/runs/39109961347):
fixable HIGH/CRITICAL scan, push (tag not overwritten), CycloneDX SBOM, keyless
cosign signature, approval, signature verified by the promote job, then
`e1fef39 Deploy 2c6f218 to local cluster`. The pod runs
`ghcr.io/ruthwikchikoti/vigneshwara-web:2c6f218@sha256:d395339453463c79cfb86bbf8f3c3d5a6091fda097317e293c2ddccb1aa3c457`
and the new smoke test reports `8 product links`.

The final commit of the PR is deployed the same way; its hash is in the PR
description.

The same SHA can be followed from the commit to the image tag, the pod label
`app.kubernetes.io/version`, `/api/version`, the `app_build_info{version="37e1f27"}`
metric, and the `version` field in every log line and trace.

## 3. A successful user request, end to end

A test inquiry was sent through the ingress at 05:44 and replayed with the
same idempotency key:

```
POST /api/inquiry  -> 200 {"ok":true,"email":{"sent":false,...}}
POST /api/inquiry (same idempotency_key) -> 200 {"ok":true,"duplicate":true}
```

The same request in each signal:

- **Metrics:** `sum by (result) (app_inquiries_total)` showed
  `{"invalid":"1","saved":"1","duplicate":"1"}`. The `invalid` count is the
  smoke test's deliberate bad request.
- **Logs (Loki):** query `{namespace="vigneshwara", level="info"} |= "inquiry saved"` returned
  ```json
  {"ts":"2026-10-18T05:44:28.598Z","level":"info","msg":"inquiry saved","service":"vigneshwara-web","version":"37e1f27","trace_id":"c4314282ae117dfb5cff2c6d20f47ba4","span_id":"3a74de0d68e6eae9","source":"buy_now","items":1,"email":{"sent":false,...}}
  ```
- **Trace (Jaeger) `c4314282ae117dfb5cff2c6d20f47ba4`:** 6 spans, 1.7 s in total:
  ```
  POST /app/api/inquiry/route                                    1712ms
    executing api route (app) /app/api/inquiry/route             1705ms
      fetch POST https://<project>.supabase.co/rest/v1/inquiries  696ms
      fetch POST https://api.brevo.com/v3/smtp/email               995ms
  ```
  The trace shows where the time goes: the email call takes longer than the
  database insert.

The test rows were deleted from Supabase by id afterwards.

**Finding:** the owner's notification email was not sent, because Brevo
returned `401 API Key is not enabled`. The inquiry was still saved, which is
the intended behaviour. The log line and the `email.sent=false` field make the
problem visible. The Brevo key in use needs to be re-enabled; this was already
broken before this work and is not caused by it.

## 4. Dashboard, logs and SLOs

Grafana dashboard **"Vigneshwara Web - Service Health"** (`/d/vigneshwara-web`).
All four data sources passed their health check (Prometheus, Loki, Jaeger,
Alertmanager). At 06:05, 12 of the 14 panels then on the dashboard returned
data; "Supabase latency" was empty (the metric was only recorded by the
readiness check) and "Error logs" was empty because there were no errors.
Both were addressed after review: every Supabase query is now measured, and
the outage drill below filled both panels.

Prometheus at 06:05, after the drills below:

| Signal | Value | SLO |
|---|---|---|
| Availability (non-5xx, 1 h) | 1.0 (929 requests, all 200) | ≥ 99.5% |
| p95 latency (ingress, 5 m) | 0.157 s | < 1 s |
| Ready pods | 2 | ≥ 2 |
| Running version | `37e1f27` | matches git |
| Memory per pod | 82 MiB, 96 MiB | limit 512 MiB |
| Firing alerts for the app | none | |

Prometheus loaded all 6 alerts and 4 recording rules (`health=ok`). Scrape
targets: the app ServiceMonitor (two pods, bearer token) and the
ingress-nginx PodMonitor are both `up`.

## 5. Release control drills

### Drift: a manual change is reverted

```
05:52:56 before: image=ghcr.io/ruthwikchikoti/vigneshwara-web:37e1f27
05:52:57 kubectl set image ... web=ghcr.io/ruthwikchikoti/vigneshwara-web:8d672a7
05:52:57 argo=Synced/Progressing image=...:8d672a7
05:52:59 argo=Synced/Progressing image=...:37e1f27      <- reverted by Argo CD
05:53:32 argo=Synced/Healthy     image=...:37e1f27
```

Argo CD log:
`05:52:57 Updated sync status: Synced -> OutOfSync`, then
`Initiated automated sync to '9f0acd6...'`, then
`05:52:58 Updated sync status: OutOfSync -> Synced`.

Argo CD watches live objects, so self-heal ran within about 2 seconds. It
did not wait for the 60 s git poll.

What I learned: my first attempt added a new env var with `kubectl set env`,
and Argo CD did **not** revert it. Argo CD compares the fields that git
defines; a field git never set is not drift under apply semantics. Changes to
fields that git does own (image, replicas, existing env, resources) are
reverted. To stop extra fields being added by hand, the fix is RBAC (people
get no write access to the namespace), not GitOps itself.

### Bad release and rollback

Commit `b9b945a` set the image tag to `37e1f2x`, which does not exist (a typo
in a deploy).

Commit `b9b945a` also contained the Argo CD HPA health check
(`argocd.values.yaml`) by mistake. I left it in place instead of rewriting
pushed history. The rollback commit reverts only the tag.

| Time | Event |
|---|---|
| 05:54:10 | bad tag pushed |
| 05:55:42 | Argo CD synced it; the new pod is in `ImagePullBackOff`, and both old pods are still `Running` |
| 05:58:42 | Argo CD health `Degraded`; the Deployment shows `Available=True`, `Progressing=False ProgressDeadlineExceeded` |
| 05:58:57 | rollback pushed: `97c6777 Roll back to 37e1f27 after the bad tag drill` |
| 06:01:03 | Argo CD `Synced/Healthy`, smoke test passed |

A request every 0.5 s ran through the ingress for the whole drill:

```
requests: 785
    785 200 37e1f27
05:54:07 200 37e1f27 vigneshwara-web-6987c646f9-4svsm
06:01:09 200 37e1f27 vigneshwara-web-6987c646f9-s69cw
```

Users saw **no errors** during the bad release. With `maxUnavailable: 0`, the
old pods are removed only after new ones are ready, and the new ones never
became ready.

### Rollback of a healthy release with `git revert`

The documented procedure on a real CI deploy commit, with a request every
0.5 s through the ingress:

| Time | Event |
|---|---|
| 08:19:33 | `cf8b53b`: `git revert e1fef39` (the CI deploy of `2c6f218`) pushed |
| 08:20:19 | first answer from the previous version `673a9a6` |
| 08:20:38 | Argo CD `Synced/Healthy`, smoke test passed, pods on `673a9a6@sha256:ae158b5c...` |
| 08:20:49 | `c4e9261`: rollback reverted (roll forward) |
| 08:22:39 | all answers from `2c6f218` again; Argo CD Synced/Healthy, smoke test passed |

566 requests, **566 returned 200**; during each switch both versions answered
for a short time, as expected in a rolling update. Rollback took 65 s from push
to healthy, most of it the Argo CD poll.

### Supabase outage

Argo CD auto-sync paused, then the HTTPS egress rule removed from the app's
NetworkPolicy so the pods could not reach Supabase. No data was changed.

```
08:25:41 before: /shop products=8 ready=200 deps=200
08:25:42 OUTAGE START
08:25:51 /shop status=000 (client timeout 15 s)   home=200 ready=200 deps=not_ready
08:27:06 /shop status=200 products=8              (pod with a fresh cache)
08:27:28 /shop status=200 products=0              (other pod: empty catalogue, still 200)
08:29:00 both pods 1/1 Running, never restarted, never unready
08:29:12 POST /api/inquiry -> {"error":"db"} HTTP 500 in 10.5 s  (nothing saved)
08:29:22 Supabase queries (10 m): success 25, error 13.7
08:31:35 Loki: 23x "supabase query failed, serving empty result", 1x "inquiry insert failed"
08:31:55 alerts: SupabaseErrors=firing, SupabaseSlow=pending
08:31:55 OUTAGE END: auto-sync re-enabled, self-heal restored the NetworkPolicy in 4 s
08:32:00 deps=ready, /shop lists 8 products on every pod
```

What this confirmed and what it changed:
- Readiness without Supabase did its job: pods stayed in service and the
  home page kept working.
- Blocked connections hang rather than fail fast, so uncached pages first
  timed out, then rendered **empty with status 200**. The 5xx SLO saw only
  part of it; `SupabaseErrors` (added after review) is what caught it.
- `InquiriesFailing` did **not** fire: the `error` counter series appeared
  for the first time at 1, so `increase()` read 0. Fixed in the final commit
  by starting every inquiry and notification counter at 0.
- The alert rules sum over pods and so drop the `namespace` label; alerts are
  found by name.

### Feature flag

`AI_GENERATION_ENABLED` turned on by a commit, without a new image:

```
08:32:09 before: {"version":"2c6f218","features":{"aiGeneration":false}}
08:32:12 pushed adf42d3 "Turn on AI generation flag (feature flag drill)"
08:35:30 Argo CD Synced/Healthy at adf42d3 (ConfigMap changed, checksum
         annotation rolled the pods)
         {"version":"2c6f218","pod":"...-rqcvn","features":{"aiGeneration":true}}
         {"version":"2c6f218","pod":"...-z7zz9","features":{"aiGeneration":true}}
```

Same image, new pods with the new config. The final commit turns it off again.

### Pod failure

A pod was deleted at 06:01:22 while `/shop` was requested every 0.25 s:
120 of 120 requests returned 200. The ReplicaSet created a replacement, which
was Ready within 40 s.

## 6. Security checks on the running cluster

```
$ kubectl -n vigneshwara run priv-test --image=busybox:1.37 --privileged --dry-run=server
Error from server (Forbidden): pods "priv-test" is forbidden: violates PodSecurity
"restricted:latest": privileged (container "priv-test" must not set securityContext.privileged=true), ...

# from inside an app pod
grafana (internal)      blocked: AbortError      <- NetworkPolicy, private ranges denied
argocd (internal)       blocked: AbortError
supabase (public https) reachable 401            <- allowed egress (401 = no API key sent)
uid=1000(node) gid=1000(node)
touch: /app/x: Read-only file system
ls: /var/run/secrets/kubernetes.io: No such file or directory   <- no service account token

$ curl -s -o /dev/null -w '%{http_code}' http://vigneshwara.local/api/metrics
404                                              <- metrics need the bearer token
```

## 7. Problems found while verifying

Bringing the stack up and checking each signal exposed problems that a
config review alone would have missed:

| Problem | Cause | Fix |
|---|---|---|
| No ingress request metrics, so the SLO panels were empty | The minikube ingress addon starts the controller with metrics turned off and does not declare port 10254 | Bootstrap patches in `--enable-metrics=true`; the PodMonitor rewrites the scrape address to `:10254` |
| Log lines arrived as Docker JSON, with no `level` label (after the fix, lines written by the JSON logger get a `level`; at first only the inquiry route used it, so after review the email, push and data code were moved to it too) | minikube's docker runtime writes Docker-format logs, not CRI-format | Promtail `docker: {}` stage; the app selector uses the `app` label |
| Grafana could not query Jaeger (404) | Jaeger 2.21 removed the `/api/services` API that Grafana still uses | Pinned Jaeger 2.20.0 (tested 2.10 to 2.21 locally) |
| CPU and memory panels were empty | With cri-dockerd, cAdvisor has no `container` label | Panels select by pod name |
| 5xx ratio returned no data when there were no errors | `sum()` over no series is empty, not 0 | `or vector(0)` |
| Each sync failed and retried for about a minute after a rollout | The built-in Argo CD HPA health check reports Degraded until new pods have CPU metrics | Custom HPA health check: Progressing instead of Degraded |

After an independent review against the brief, further problems were fixed in
`a4c1a43`, `bf4d146`, `45c6fab` and `2c6f218`: failures that return 200 had no
signal (Supabase, owner email), probe requests filled Jaeger, p95 alerting was
noisy at low traffic, OpenSSL fixes were missing from the base image (now
gated on fixable HIGH), tags could be overwritten, images were unsigned, and
the approval could be bypassed by an admin.

Runs `39095716374` and `39101832046` show a cancelled promote step: they were
older commits superseded by a newer run before approval, so they were
cancelled rather than deploying an outdated build.

Dev-only packages (ESLint and Vitest tooling) still report 7 high and 2
moderate advisories; they are not in the image. Production dependencies: 0.
`braces` has no fixed release yet, and npm 10 fails with an internal error when
rewriting this lockfile with the other overrides, so they are left for
Dependabot after merge.
