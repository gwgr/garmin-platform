# Frontend Scaffold

This directory now contains the initial Next.js frontend scaffold.

Current structure:
- `app/layout.tsx` root layout
- `app/page.tsx` dashboard page
- `app/activities/page.tsx` activity list page
- `app/activities/[id]/page.tsx` activity detail page
- `app/globals.css` shared styles
- `components/charts/` SVG-based chart components for activity detail views
- `components/maps/` Leaflet-based route map components
- `lib/api.ts` shared API client utilities and frontend response types
- `lib/formatting.ts` shared frontend display helpers
- `package.json` with the initial Next.js runtime and scripts
- `Dockerfile` for the frontend container runtime

Current state:
- the frontend foundation is scaffolded with the Next.js App Router
- the home page now functions as the first real dashboard view
- the activity list page now consumes the backend list endpoint with server-rendered filters and pagination
- the activity detail page now consumes the backend detail endpoint for summary, laps, and record stream samples
- pace, heart rate, and elevation charts are now rendered on the activity detail page
- a Leaflet route map is now rendered on the activity detail page when usable GPS samples exist
- stored Garmin record coordinates are now normalized so the route map can render correctly for imported activities
- shared API utilities are now in place for activities, activity detail, daily metrics, and analytics trends
- local verification can now use either Docker or the host Node/npm toolchain
- the frontend is currently pinned to `next@15.5.13`, and the local build/audit check is clean
- the charted activity detail flow has now been verified locally in the browser
- dashboard, activity list, and activity detail pages have all now been verified locally in the browser
- the route map has now also been verified locally in the browser
