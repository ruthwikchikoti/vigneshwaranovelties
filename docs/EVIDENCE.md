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
== product page
200
== inquiry API rejects invalid input (no data written)
smoke test passed
```

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
Alertmanager). Every panel query returns data.

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

## 7. Problems found while verifying (fixed in `9f0acd6` and `b9b945a`)

Bringing the stack up and checking each signal exposed problems that a
config review alone would have missed:

| Problem | Cause | Fix |
|---|---|---|
| No ingress request metrics, so the SLO panels were empty | The minikube ingress addon starts the controller with metrics turned off and does not declare port 10254 | Bootstrap patches in `--enable-metrics=true`; the PodMonitor rewrites the scrape address to `:10254` |
| Log lines arrived as Docker JSON, with no `level` label | minikube's docker runtime writes Docker-format logs, not CRI-format | Promtail `docker: {}` stage; the app selector uses the `app` label |
| Grafana could not query Jaeger (404) | Jaeger 2.21 removed the `/api/services` API that Grafana still uses | Pinned Jaeger 2.20.0 (tested 2.10 to 2.21 locally) |
| CPU and memory panels were empty | With cri-dockerd, cAdvisor has no `container` label | Panels select by pod name |
| 5xx ratio returned no data when there were no errors | `sum()` over no series is empty, not 0 | `or vector(0)` |
| Each sync failed and retried for about a minute after a rollout | The built-in Argo CD HPA health check reports Degraded until new pods have CPU metrics | Custom HPA health check: Progressing instead of Degraded |
