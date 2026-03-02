# AutoTrack Push Notifications VPS Runbook

## Overview
AutoTrack notifications are Web Push notifications sent from your VPS to iPhone PWA subscriptions.

Flow:
1. User opens AutoTrack from Home Screen and enables Push Alerts.
2. Service worker creates a push subscription.
3. App posts subscription to `/api/push/subscribe`.
4. VPS stores subscription in SQLite (`push_subscriptions`).
5. Sweep job calls `/api/push/sweep` every minute.
6. Sweep checks due/overdue maintenance and sends push notifications.
7. `notification_state` prevents duplicate sends for the same stage.

## Script Location
- Repo script path: `Scripts/autotrack-push-guard.sh`
- VPS installed script path: `/usr/local/bin/autotrack-push-guard`
- Runbook path (this file): `docs/push-notifications-vps-runbook.md`

Install/update script on VPS:

```bash
cd /opt/autotrack/app
sudo install -m 0755 Scripts/autotrack-push-guard.sh /usr/local/bin/autotrack-push-guard
sudo /usr/local/bin/autotrack-push-guard --help
```

## Required VPS Paths
- App dir: `/opt/autotrack/app`
- Env file: `/opt/autotrack/app/.env.production`
- DB file: `/opt/autotrack/app/.data/autotrack.sqlite`
- App service: `autotrack.service`
- Sweep service/timer: `autotrack-sweep.service`, `autotrack-sweep.timer`

## Required Env Vars
In `/opt/autotrack/app/.env.production`:

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@yourdomain.com
AUTOTRACK_CRON_SECRET=long-random-secret
```

## Guard Script Commands
Show help:

```bash
sudo /usr/local/bin/autotrack-push-guard --help
```

Reset push state and restart services:

```bash
sudo /usr/local/bin/autotrack-push-guard reset
```

Show runtime/systemd health:

```bash
sudo /usr/local/bin/autotrack-push-guard status
```

Prune stale subscriptions:

```bash
sudo /usr/local/bin/autotrack-push-guard prune
```

Send direct test push to all subscriptions:

```bash
sudo /usr/local/bin/autotrack-push-guard test
```

Run one real sweep:

```bash
sudo /usr/local/bin/autotrack-push-guard sweep
```

Run full diagnostic chain:

```bash
sudo /usr/local/bin/autotrack-push-guard doctor
```

Repair/reinstall sweep units:

```bash
sudo /usr/local/bin/autotrack-push-guard units
```

## Bypass App Logic: Send Test Notifications Directly from VPS
Use this when you want to validate push transport itself regardless of due dates.

```bash
sudo /usr/local/bin/autotrack-push-guard test
```

Expected:
- `sent` > 0 and `failed` = 0

If you get `VapidPkHashMismatch`, run:

```bash
sudo /usr/local/bin/autotrack-push-guard reset
```

Then re-subscribe devices from iPhone Home Screen app.

## API Checks
Local API (preferred on VPS):

```bash
curl -s http://127.0.0.1:4001/api/push/config
curl -s http://127.0.0.1:4001/api/push/subscribe
```

Public API:

```bash
curl -s https://your-domain.example/api/push/config
curl -s https://your-domain.example/api/push/subscribe
```

Manual sweep with secret:

```bash
sudo bash -lc 'set -a; . /opt/autotrack/app/.env.production; set +a; curl -s -X POST -H "x-autotrack-cron-secret: ${AUTOTRACK_CRON_SECRET}" "http://127.0.0.1:4001/api/push/sweep"'
```

## Systemd Health Checks
```bash
sudo systemctl status autotrack.service --no-pager
sudo systemctl status autotrack-sweep.timer --no-pager
sudo systemctl status autotrack-sweep.service -l --no-pager
sudo journalctl -u autotrack-sweep.service -n 200 --no-pager
```

## Common Issues and Meaning
- `ready:false` in `/api/push/config`: VAPID env vars not loaded in app service.
- `count:0` in `/api/push/subscribe`: no active device subscriptions yet.
- `VapidPkHashMismatch`: subscription created under a different VAPID key.
- Sweep `sentCount:0 failedCount:0`: no due/overdue event eligible right now.
- Sweep `failedCount>0`: endpoint delivery failures; prune stale entries.
- `Cannot find module 'web-push'`: script ran outside app context or VPS `node_modules` is missing. Run:

```bash
cd /opt/autotrack/app
npm ci
sudo install -m 0755 Scripts/autotrack-push-guard.sh /usr/local/bin/autotrack-push-guard
sudo /usr/local/bin/autotrack-push-guard status
```

## iPhone Resubscribe Procedure
1. Remove AutoTrack from Home Screen.
2. iPhone Settings -> Safari -> Advanced -> Website Data -> remove `your-domain.example`.
3. Reopen site in Safari and Add to Home Screen.
4. Open app from Home Screen and enable Push Alerts.
5. Run `sudo /usr/local/bin/autotrack-push-guard test`.

## Full Recovery Sequence
```bash
sudo /usr/local/bin/autotrack-push-guard reset
sudo /usr/local/bin/autotrack-push-guard doctor
```

Then perform iPhone resubscribe procedure above.

## Security
If VAPID private key or cron secret is exposed:
1. Rotate both.
2. Update `.env.production`.
3. Restart app service.
4. Run `reset`.
5. Re-subscribe all devices.
