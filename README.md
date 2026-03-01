# AutoTrack

Mobile-first vehicle mileage and maintenance tracker built with Next.js, React, and Radix UI.

## Features

- Progressive Web App setup (manifest + service worker scaffold)
- Multiple family vehicles with maintenance tracking
- Odometer updates and maintenance history
- Light/dark theme support with system toggle
- Mobile-style bottom tab navigation

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run start
```

## Background Push Setup (Required For Closed-Phone Alerts)

AutoTrack now supports backend Web Push delivery. This is what allows reminders to fire while the PWA is closed and the phone is locked.

1. Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

2. Configure env vars (example):

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
AUTOTRACK_CRON_SECRET=choose-a-random-secret
```

3. Ensure a scheduler hits the sweep endpoint (for example once per minute):

```bash
curl -X POST http://127.0.0.1:3000/api/push/sweep -H "x-autotrack-cron-secret: <AUTOTRACK_CRON_SECRET>"
```

If the scheduler is not running, closed-app notifications cannot be guaranteed.
