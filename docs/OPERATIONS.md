# Operations: what healthy means, alerts and runbooks

## What "healthy" means

| Signal | Healthy | Source |
|---|---|---|
| Availability SLO | ≥ 99.5% of requests through the ingress are not 5xx (30-day window, error budget 0.5% ≈ 3.6 h/month) | `nginx_ingress_controller_requests` |
| Latency SLO | ≥ 95% of requests answered in under 1 s (30 min window) | `nginx_ingress_controller_request_duration_seconds` (`le="1.0"` bucket) |
| User journey | every submitted inquiry is saved (`result="saved"`), no `result="error"`, and the owner is notified | `app_inquiries_total`, `app_notifications_total` |
| Capacity | ≥ 2 ready pods, no restarts | kube-state-metrics |
| Dependency | no failed Supabase queries, p95 < 1 s, `/api/ready?deps=1` returns 200 | `app_dependency_request_duration_seconds` |
| Catalogue | the shop page lists products (checked by the smoke test after every deploy) | smoke-test Job |
| Version | `/api/version` returns the tag in `values-local.yaml`, Argo CD `Synced` + `Healthy` | app, Argo CD |

Why these SLOs: customers mostly browse on phones over mobile data, so a page
that errors or takes several seconds is a lost customer. The inquiry is the
only "conversion" the site has, so it gets its own check rather than being
averaged into overall availability.

Grafana dashboard **"Vigneshwara Web - Service Health"** shows all of these on
one page, plus error logs from Loki.

## Alerts (PrometheusRule in the Helm chart)

| Alert | Fires when | Severity |
|---|---|---|
| `HighErrorBudgetBurn` | 5xx ratio > 7.2% over both 5 m and 1 h (14.4x burn rate) | critical |
| `HighLatency` | < 95% of requests under 1 s over 30 min (with ≥ 50 requests), for 10 min | warning |
| `InquiriesFailing` | any `result="error"` inquiry in 10 min | critical |
| `NoReadyPods` | 0 available replicas for 1 min | critical |
| `PodRestarting` | > 2 restarts in 15 min | warning |
| `SupabaseErrors` | any failed Supabase query in 10 min (pages render without products, still 200) | critical |
| `NotificationsFailing` | any owner email that Brevo did not accept in 30 min | warning |
| `SupabaseSlow` | Supabase p95 > 1 s for 10 min | warning |

The burn-rate alert uses two windows so a short spike does not alert, but a
sustained problem alerts within minutes. Each alert carries a `runbook_url`
pointing at the matching section below.

Alerts show in Prometheus, Alertmanager and Grafana; locally they are not
sent anywhere (no receiver configured, see DECISIONS.md §9).

## Runbooks

General first steps:

```bash
kubectl -n vigneshwara get pods,deploy,hpa
curl -s http://vigneshwara.local/api/version
curl -s "http://vigneshwara.local/api/ready?deps=1"
kubectl -n argocd get application vigneshwara-web
```

### High error rate

1. Dashboard: which status codes, since when? Does it line up with a version
   change (Running version panel / `git log values-local.yaml`)?
2. Loki: `{namespace="vigneshwara", level="error"}`; open the `trace_id` of a
   failing request in Jaeger to see which span failed (Supabase, Brevo, render).
3. If it started with a release: **roll back** (below). If Supabase spans are
   failing: see *Supabase slow*.
4. Verify recovery: 5xx ratio back under 0.5% on the dashboard, alert resolves.

### High latency

1. Jaeger: sort traces by duration; is time spent in Supabase spans, the
   Brevo email call (inquiries wait for it, ~1 s) or render?
2. CPU per pod panel near the limit? HPA at max (`kubectl get hpa`)? Raise
   `autoscaling.maxReplicas` or the CPU limit in `values-local.yaml`.

### Inquiries failing

1. Loki: `{namespace="vigneshwara"} |= "inquiry insert failed"`.
2. `curl /api/ready?deps=1`: is Supabase reachable? Check Supabase status page.
3. Missing or rotated `SUPABASE_SERVICE_ROLE_KEY`? Recreate the Secret with
   `scripts/devops/create-app-secret.sh` and `kubectl -n vigneshwara rollout restart deploy/vigneshwara-web`.
4. Verify: submit a test inquiry; `app_inquiries_total{result="saved"}` increases.

### No ready pods

1. `kubectl -n vigneshwara describe pod <pod>`: image pull error? probe failing?
   OOMKilled? Missing Secret (`CreateContainerConfigError`)?
2. `curl /api/ready` from a pod lists `missingConfig`.
3. If caused by a new release: roll back.

### Pods restarting

`kubectl -n vigneshwara logs <pod> --previous` and `describe pod` (look for
`OOMKilled`, then raise the memory limit; or liveness failures).

### Supabase errors

Customers see pages with no products (status 200) and inquiries fail.

1. `curl -s "http://vigneshwara.local/api/ready?deps=1"`: does Supabase answer?
   Check status.supabase.com and the project dashboard (paused project? quota?).
2. Loki: `{namespace="vigneshwara", level="error"} |= "supabase"` for the error
   message (auth error = rotated key, timeout = network or Supabase).
3. If the key was rotated: recreate the Secret with
   `scripts/devops/create-app-secret.sh` and
   `kubectl -n vigneshwara rollout restart deploy/vigneshwara-web`.
4. Pages rendered empty during the outage stay cached for up to 10 minutes
   after recovery. To refresh at once: `kubectl -n vigneshwara rollout restart
   deploy/vigneshwara-web` (new pods start with an empty cache).
5. Verify: "Supabase query errors" panel back to 0, smoke test or
   `curl -s http://vigneshwara.local/shop | grep -c 'href="/product/'` > 0.

### Notifications failing

Inquiries are saved, but the owner gets no email.

1. Loki: `{namespace="vigneshwara"} |= "inquiry email"` shows Brevo's answer.
2. `401 API Key is not enabled` / `unauthorized`: the Brevo key was disabled
   or rotated. Re-enable it in Brevo, update `BREVO_API_KEY` in `.env.local`,
   run `scripts/devops/create-app-secret.sh` and restart the deployment.
3. Until fixed, tell the owner to check `/admin/inquiries` and WhatsApp.

### Supabase slow

Outside the cluster. Check the Supabase dashboard/status. Catalog pages keep
working from cache; inquiries may fail, so tell the owner to watch WhatsApp.

## Rolling back a release

Every new image is deployed by a commit made by CI after approval:
`Deploy <sha> to local cluster` (changes `image.tag` and `image.digest`).
A rollback is a revert of such a commit, made by a person. It skips CI and
approval on purpose: it only points back to an image that was already
scanned, signed, approved and run (see DECISIONS.md §6).

```bash
git log --oneline -- deploy/helm/vigneshwara-web/values-local.yaml
git revert <deploy-commit>      # puts the previous image tag and digest back
git push                        # Argo CD syncs within ~60 s
```

Emergency without waiting for git (Argo CD self-heal must be paused first or
it will undo the change):

```bash
kubectl -n argocd patch application vigneshwara-web --type merge \
  -p '{"spec":{"syncPolicy":{"automated":null}}}'
kubectl -n vigneshwara rollout undo deploy/vigneshwara-web
# afterwards: revert in git and re-enable automated sync
```

Verify a rollback: `/api/version` shows the previous SHA from every pod
(`for i in $(seq 10); do curl -s vigneshwara.local/api/version; echo; done`),
Argo CD Synced/Healthy, error rate back to normal.

## Useful URLs (after adding the hosts entry)

| What | URL |
|---|---|
| Storefront | http://vigneshwara.local |
| Grafana | http://grafana.vigneshwara.local |
| Jaeger | http://jaeger.vigneshwara.local |
| Argo CD | http://argocd.vigneshwara.local |
| Prometheus | `kubectl -n monitoring port-forward svc/kube-prometheus-stack-prometheus 9090` |
