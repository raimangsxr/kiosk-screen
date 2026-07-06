# Kiosk Screen Frontend

Angular frontend for the kiosk display and management workflows.

## Setup

```sh
npm install
npm start
```

The Angular app expects the backend API under `/api`.

## PWA

Production builds include a service worker and web app manifest. Install the app from the browser (Add to Home Screen / Install app) for a standalone kiosk or admin experience.

The service worker is disabled during `ng serve` development. Test PWA behavior with a production build (`npm run build`) served behind nginx or any static file server with the API proxied under `/api`.

Cached offline:
- App shell (JS, CSS, icons)
- Kiosk display state and branding (network-first, fallback when offline)
- Media files under `/api/media/**` (cache-first for smoother playback)

Runtime behavior:
- A bottom banner prompts operators to reload when a new service worker version is ready (checked hourly).
- The browser tab icon, iOS home-screen icon, and document title follow the configured event branding when an organizer logo is available.

## Tests

```sh
npm test           # headless, single run
npm run test:watch # headed Chrome with autoWatch (TDD)
npm run test:ci    # headless + code coverage
```
