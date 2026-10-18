# Operations: what healthy means, alerts and runbooks

## What "healthy" means

| Signal | Healthy | Source |
|---|---|---|
| Availability SLO | ≥ 99.5% of requests through the ingress are not 5xx (30-day window, error budget 0.5% ≈ 3.6 h/month) | `nginx_ingress_controller_requests` |
| Latency SLO | p95 < 1 s | `nginx_ingress_controller_request_duration_seconds` |
| User journey | every submitted inquiry is saved (`result="saved"`), no `result="error"` | `app_inquiries_total` |
| Capacity | ≥ 2 ready pods, no restarts | kube-state-metrics |
| Dependency | Supabase p95 < 1 s, `/api/ready?deps=1` returns 200 | `app_dependency_request_duration_seconds` |
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
| `HighLatencyP95` | p95 > 1 s for 10 min | warning |
| `InquiriesFailing` | any `result="error"` inquiry in 10 min | critical |
| `NoReadyPods` | 0 available replicas for 1 min | critical |
| `PodRestarting` | > 2 restarts in 15 min | warning |
| `SupabaseSlow` | Supabase p95 > 1 s for 10 min | warning |

The burn-rate alert uses two windows so a short spike does not page, but a
sustained problem pages within minutes.

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

1. Jaeger: sort traces by duration; is time spent in Supabase spans or in render?
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

### Supabase slow

Outside the cluster. Check the Supabase dashboard/status. Catalog pages keep
working from cache; inquiries may fail, so tell the owner to watch WhatsApp.

## Rolling back a release

Every deployment is a commit made by CI: `Deploy <sha> to local cluster`.

```bash
git log --oneline -- deploy/helm/vigneshwara-web/values-local.yaml
git revert <deploy-commit>      # puts the previous image tag back
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
