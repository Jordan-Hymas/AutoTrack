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

## Quick iPhone HTTPS Test (Temporary)

Use this for notification testing only. It does not affect VPS deployment.

```bash
npm run dev:https
```

- This starts the app and opens a temporary HTTPS tunnel.
- Copy the HTTPS URL shown in terminal and open it on iPhone Safari.
- Add to Home Screen, open from Home Screen, then test notifications in app Settings.

## Build

```bash
npm run build
npm run start
```
