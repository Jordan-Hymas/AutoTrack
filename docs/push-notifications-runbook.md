# AutoTrack Push Notifications Runbook

## Script Location
- Repository script path: `Scripts/autotrack-push-guard.sh`
- Recommended VPS install path: `/usr/local/bin/autotrack-push-guard`

Install/update on VPS:

```bash
cd /opt/autotrack/app
sudo install -m 0755 Scripts/autotrack-push-guard.sh /usr/local/bin/autotrack-push-guard
```

## What This Script Does
- Validates required env vars from `.env.production`
- Maintains sweep systemd units (`autotrack-sweep.service` and `autotrack-sweep.timer`)
- Can wipe/rehydrate push DB state safely
- Can prune stale subscriptions automatically (`VapidPkHashMismatch`, `404`, `410`)
- Can run direct push tests and sweep tests
- Can print runtime/systemd health in one command

## Required Files and Defaults
- App directory: `/opt/autotrack/app`
- Env file: `/opt/autotrack/app/.env.production`
- DB file: `/opt/autotrack/app/.data/autotrack.sqlite`
- Local API base: `http://127.0.0.1:4001`

Required env vars in `.env.production`:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `AUTOTRACK_CRON_SECRET`

## How to Run the Script
Show command help:

```bash
sudo /usr/local/bin/autotrack-push-guard --help
```

Run full reset (safe baseline reset):

```bash
sudo /usr/local/bin/autotrack-push-guard reset
```

Show health/status:

```bash
sudo /usr/local/bin/autotrack-push-guard status
```

Direct push test to all subscriptions:

```bash
sudo /usr/local/bin/autotrack-push-guard test
```

Run one real sweep:

```bash
sudo /usr/local/bin/autotrack-push-guard sweep
```

Run full diagnostic sequence:

```bash
sudo /usr/local/bin/autotrack-push-guard doctor
```

Rebuild/repair sweep units only:

```bash
sudo /usr/local/bin/autotrack-push-guard units
```

Run prune only:

```bash
sudo /usr/local/bin/autotrack-push-guard prune
```

## Auto-Prune Behavior
- Default: auto-prune is enabled for `status`, `test`, `sweep`, and `doctor`
- Disable for one run:

```bash
sudo /usr/local/bin/autotrack-push-guard --no-auto-prune status
```

- Force enable for one run:

```bash
sudo /usr/local/bin/autotrack-push-guard --auto-prune doctor
```

## Recovery Flow (When Notifications Break)
1. Run reset:

```bash
sudo /usr/local/bin/autotrack-push-guard reset
```

2. On iPhone:
- Remove app from Home Screen
- Clear Safari Website Data for `your-domain.example`
- Re-add app to Home Screen
- Open app and enable Push Alerts

3. Validate subscription count:

```bash
curl -s https://your-domain.example/api/push/subscribe
```

4. Validate direct send:

```bash
sudo /usr/local/bin/autotrack-push-guard test
```

5. Validate sweep:

```bash
sudo /usr/local/bin/autotrack-push-guard sweep
```

## Interpreting Results
- `ready:true` + `count:0`
  - Backend is fine, no connected device subscription exists yet.
- `VapidPkHashMismatch`
  - Subscription was created under a different VAPID key. Re-subscribe device and run prune/reset.
- Sweep `sentCount:0` + `failedCount:0`
  - No due/overdue item was eligible at that moment.
- Sweep `failedCount > 0`
  - Delivery failing for one or more endpoints. Run `prune`, then re-test.

## Guard Rails Checklist
- Keep `.env.production` readable by root only (`chmod 600`)
- Keep sweep timer enabled:

```bash
sudo systemctl status autotrack-sweep.timer --no-pager
```

- Ensure app service is healthy:

```bash
sudo systemctl status autotrack.service --no-pager
```

- Use local sweep URL (127.0.0.1:4001) in systemd service to avoid proxy 502 issues.

## Security Note
- If VAPID private key or cron secret are exposed, rotate both and re-subscribe devices.
