# Frontend

This directory now contains the live Next.js frontend for the Garmin dashboard.

Current structure:
- `app/layout.tsx` root layout
- `app/page.tsx` dashboard page
- `app/activities/page.tsx` activity list page
- `app/activities/[id]/page.tsx` activity detail page
- `app/status/sync/page.tsx` sync status page
- `app/globals.css` shared styles
- `components/app-shell.tsx` shared top-level shell with primary navigation
- `components/charts/` SVG-based chart components for activity detail views
- `components/maps/` Leaflet-based route map components
- `components/page-shell.tsx` shared page header/content wrapper
- `components/ui/` shared UI primitives in the `shadcn/ui` style
- `lib/api.ts` shared API client utilities and frontend response types
- `lib/formatting.ts` shared frontend display helpers
- `lib/ui.ts` shared Tailwind-oriented class utilities and display helpers
- `package.json` with the Next.js runtime, Tailwind CSS v4 pipeline, Playwright scripts, and Radix UI dependencies
- `Dockerfile` for the frontend container runtime

Current state:
- the home page now functions as the first real dashboard view
- the activity list page now consumes the backend list endpoint with server-rendered filters and pagination
- the activity detail page now consumes the backend detail endpoint for summary, laps, and record stream samples
- the sync status page now exposes persisted checkpoint and run-status information
- pace, heart rate, and elevation charts are now rendered on the activity detail page
- a Leaflet route map is now rendered on the activity detail page when usable GPS samples exist
- stored Garmin record coordinates are now normalized so the route map can render correctly for imported activities
- shared API utilities are now in place for activities, activity detail, daily metrics, and analytics trends
- Tailwind CSS v4 now handles the primary layout and spacing system
- shared cards, buttons, tabs, tables, and dialogs now come from the local `components/ui` primitive layer built in the `shadcn/ui` style on top of Radix
- a shared responsive app shell now provides the primary header/navigation/content structure across dashboard, activities, activity detail, and sync status pages
- shared typography and spacing tokens in `lib/ui.ts` now keep page titles, section headings, card padding, labels, and summary values on the same visual rhythm
- local verification can now use either Docker or the host Node/npm toolchain
- the frontend is currently pinned to `next@15.5.13`, and the local build/audit check is clean
- the charted activity detail flow has now been verified locally in the browser
- dashboard, activity list, and activity detail pages have all now been verified locally in the browser
- the route map has now also been verified locally in the browser
