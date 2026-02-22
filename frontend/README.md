# Turf Booking Frontend (Angular 19)

This is a fresh Angular 19 standalone workspace that replaces the old frontend. It talks directly to the Spring Boot backend that lives at `http://localhost:8080` through a dev proxy so CORS is transparently avoided.

## Getting started

1. Install dependencies (Node 22.x and npm 10+):
   ```bash
   cd frontend
   npm install
   ```
2. Run the Spring Boot API (`./mvnw spring-boot:run` from the repo root).
3. Start the Angular dev server with the built-in proxy that forwards `/api` and `/uploads` to the backend:
   ```bash
   npm run start
   ```
   The app is available at http://localhost:4200 and all API calls stay same-origin thanks to `proxy.conf.json`.

### Production build

```bash
npm run build
```
Outputs go to `dist/turf-booking/` and can be served by any static host (configure your reverse proxy to forward `/api` to the Spring Boot service).

### Tests

Karma + Jasmine are configured (see `karma.conf.js`). Run `npm test` to execute the default spec harness.

## Feature map

- **Authentication** – email/phone login, email registration, JWT storage, profile editing directly in the shell header.
- **Role-aware navigation** – dashboard, search, bookings accessible to everyone; manager and admin tools guarded by route guards.
- **Turf search** – filters by city, pincode, sport, amenity, min rating, max price, plus client-side sorting and summary chips.
- **Turf creation & photo uploads** – simple form that submits to `POST /api/turfs` and inline upload widget for media.
- **Live availability calendar** – polls `/api/bookings/slots/{turfId}` every 30 seconds, supports status filtering, live slot selection, booking with simulated card/UPI inputs, and refund-awareness.
- **Bookings center** – lists confirmed/cancelled slots, cancel button wires to refund rule (`/api/bookings/cancel`).
- **Support tickets** – raise and track tickets via `/api/support/tickets` and `/api/support/tickets/me`.
- **Notifications** – pulls `/api/notifications` plus client-side events (bookings, refunds, payouts, invites) and offers a dedicated notifications hub.
- **Reviews** – fetch and submit reviews per turf using `/api/reviews`.
- **Manager toolkit** – recurring slot builder (bulk calls to `/api/bookings/slots`), dynamic pricing rules, maintenance blocks, promo offers, invites, payout snapshots, and extension approvals connected to booking extension requests.
- **Admin moderation** – approve pending turfs through `/api/turfs/{id}/approve` and view audit log emitted by admin/manager actions.

## Configuration notes

- The Angular environment defaults to `apiUrl: '/api'`. Update `src/environments/*.ts` if you deploy behind a different path.
- `proxy.conf.json` is the single place where API + uploads endpoints are mapped. Adjust the `target` if your backend runs on another host/port.
- Session data is stored in `localStorage` under `tb.session`, while bookings are cached per user in `tb.bookings.<userId>` to let the dashboard work offline between refreshes.

## Next steps

- Add dedicated API endpoints for listing user bookings, invites, payouts, and audit logs so the temporary client-side stores can be swapped for backend truth.
- Wire profile editing to a backend route once it exists (currently it only updates local state).
- Consider enabling SSR or hydration if SEO for public turf listings becomes important.
