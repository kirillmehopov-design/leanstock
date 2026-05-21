
## Final frontend/business-event cleanup

- Added `PATCH /warehouses/:id` so Warehouse A/B can be edited from the frontend instead of only created/listed.
- Changed required email workflows to enqueue email via BullMQ and return `202` instead of sending inline.
- Low-stock alert now targets tenant MANAGER/OWNER recipients, matching the LeanStock final requirement for manager low-stock notification.
- Frontend now exposes product CRUD more clearly: create, read, update reorder rules, archive.
- Added a frontend low-stock email demo action that uses the real inventory flow to trigger the required low-stock alert.

# Changelog

All notable changes to LeanStock are documented here.

---

## [Defense Cleanup Patch] — 2026-05-13

### Fixed for repeat defense

- Removed manual tenant selection from the clean Postman collection. Protected tenant endpoints now work from the authenticated user's active membership, so the demo flow only needs `Content-Type` and `Authorization`.
- Updated `resolveTenant` to auto-resolve the active tenant from the logged-in user.
- Added `POST /api/v1/notifications/email`, which sends a real email to the `to` address provided in the Postman body.
- Added SMTP email provider support with Gmail App Password configuration: `EMAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.
- Added `src/controllers/notificationController.js`, `src/routes/notificationRoutes.js`, and `src/validators/notificationSchemas.js`.
- Cleaned the Postman collection into defense folders: RBAC users, warehouse/catalog/inventory, reservation/sale/transfer, notifications, RBAC checks, platform, token.
- Added demo requests for all RBAC roles from the blueprint: `OWNER`, `MANAGER`, `STAFF`, `AUDITOR`, and platform `SUPERADMIN`.
- Updated Swagger/OpenAPI by removing manual tenant parameters and adding the notifications endpoint.

---

## [Defense Patch] — 2026-05-13

### Fixed — Critical bugs

- **`errorHandler` signature** — Express requires exactly 4 parameters `(err, req, res, next)` for error-handling middleware. The previous 3-parameter signature caused Express to treat it as a regular middleware, so errors were passed through without being caught. Fixed by adding the `_next` parameter.

- **`StockTransfer.status` default** — The Prisma schema had `default(RECEIVED)` which created transfers already in a completed state. Blueprint specifies `REQUESTED` as the initial status. Fixed in schema and migration.

- **`BatchStatus` enum** — Blueprint specifies explicit `ACTIVE / DEPLETED / ARCHIVED` enum on `InventoryBatch`. Added to schema, migration `20260513000000_batch_status_enum`, and all service-layer queries now filter `status: 'ACTIVE'` explicitly.

### Added — Missing features

- **`reservationExpiryWorker.js`** — `expire_reservations` background job that runs every 60 seconds. Finds `ACTIVE` reservations past their `expiresAt`, releases reserved stock in a database transaction, updates status to `EXPIRED`, and writes an audit log. Registered in both `src/server.js` (single-process mode) and `src/workers/index.js` (separate worker process).

- **Sale confirmation email (business event #3)** — `buildSaleConfirmationEmail` builder added to `emailService.js`. `reservationService.confirmReservation` now enqueues a `sale-confirmation` job to the customer email after the sale is committed. Three named business emails are now fully wired: `low-stock-alert`, `transfer-approved`, `sale-confirmation`.

- **Required LeanStock email events** — `notificationService.js` uses named BullMQ jobs for low-stock alert, purchase order confirmation, and inventory transfer receipt.

### Changed

- `inventoryService.lowStockReport` — now returns results sorted by `shortage` descending (most urgent first). Added `shortage` field to each record.

- `inventoryService.receiveBatch` — now sends `low-stock-alert` email to tenant owners if total available stock after receiving is still at or below `product.reorderPoint`.

- `notificationService.js` — fully rewritten with named per-event functions. Backwards-compatible `notifyTenantOwners` kept for generic use.

- `emailWorker.js` — added `sale-confirmation` case to the job dispatcher.

- `jobController.getQueueStatus` — now includes `workers` section showing runtime status of all three workers (email, dead-stock, reservation-expiry).

- CI/CD `.github/workflows/ci.yml` — added all required env vars that were missing: `APP_BASE_URL`, `EMAIL_PROVIDER`, `EMAIL_FROM`, `RESEND_API_KEY`, `EMAIL_VERIFICATION_TOKEN_MINUTES`, `PASSWORD_RESET_TOKEN_MINUTES`, `EMAIL_QUEUE_ATTEMPTS`, `SUPERADMIN_SETUP_KEY`, and all dead-stock config vars.

### Added — Tests

- `tests/unit/reservationExpiry.test.js` — unit tests for reservation expiry date/status logic.

---

## [Final Pre-Defense] — 2026-05-08

### Added
- **Email Verification on Signup** — `POST /auth/register` now generates a secure random token, stores it on the `User` row, and enqueues a `verify-email` BullMQ job. The email contains both `GET /auth/verify-email?token=...` and a copyable verification token. The user must verify before login. Unverified users receive `403 EMAIL_NOT_VERIFIED`.
- **Password Reset via Email** — `POST /auth/request-password-reset` (rate-limited, always returns 200 to prevent enumeration) + `POST /auth/reset-password`. On successful reset, `tokenVersion` is incremented to invalidate all live access tokens and all refresh tokens are revoked.
- **BullMQ Email Queue** — `src/queues/emailQueue.js` — async email delivery via Redis-backed BullMQ queue. The API endpoint never blocks waiting for the SMTP/Resend HTTP call. Supports 3 retry attempts with exponential back-off.
- **BullMQ Dead-Stock Queue** — `src/queues/deadStockQueue.js` — dead-stock decay jobs are now enqueued into BullMQ instead of fired directly in `setInterval`, enabling retry, visibility and de-duplication.
- **Email Worker** — `src/jobs/emailWorker.js` — BullMQ `Worker` consuming the `email` queue. Dispatches to `emailService.sendEmail()` based on job name: `verify-email`, `password-reset`, `low-stock-alert`, `transfer-approved`.
- **Dead-Stock Worker (BullMQ)** — `src/jobs/deadStockWorker.js` — rewired to BullMQ `Worker` with a cron `setInterval` that enqueues jobs on a configurable schedule.
- **Standalone Worker Process** — `src/workers/index.js` — entry-point for a separate `npm run worker` process (used by the `worker` Docker service). Starts both email and dead-stock workers.
- **Job Routes** — `GET /jobs/status` (queue counts for observability) and `POST /jobs/dead-stock/trigger` (manual trigger for Postman demo).
- **Email Service** — `src/services/emailService.js` — supports `EMAIL_PROVIDER=mock` (console log) and `EMAIL_PROVIDER=resend` (Resend HTTP API). Includes builders for all 4 email types (verification, password reset, low-stock alert, transfer approved).
- **New environment variables** — `EMAIL_VERIFICATION_TOKEN_MINUTES`, `PASSWORD_RESET_TOKEN_MINUTES`, `APP_BASE_URL`, `EMAIL_PROVIDER`, `EMAIL_FROM`, `RESEND_API_KEY`, `EMAIL_QUEUE_ATTEMPTS`, `DEAD_STOCK_AGE_DAYS`, `DEAD_STOCK_DECAY_PERCENT`, `DEAD_STOCK_DECAY_INTERVAL_HOURS`.
- **Database migration** — `20260508000000_final_email_jobs` adds `emailVerified`, `emailVerifyToken`, `emailVerifyExpiresAt`, `passwordResetToken`, `passwordResetExpiresAt` to `User`.
- **Unit tests** — `tests/unit/emailService.test.js` (email builders), `tests/unit/authHelpers.test.js` (password hashing, token utilities).
- **Dockerfile fix** — added `python3 make g++` build tools so `argon2` native addon compiles successfully. Changed `./node_modules/.bin/prisma generate` → `npx prisma generate` for reliability.

### Changed
- `authService.register` — enqueues email verification job after transaction commits.
- `authService.login` — now blocks login with `403` if `emailVerified = false`.
- `src/server.js` — starts both email and dead-stock workers when `ENABLE_WORKER=true`.
- `package.json` — added `bullmq` dependency and `worker` script.
- `openapi.yaml` — added paths for `verify-email`, `request-password-reset`, `reset-password`, `jobs/status`, `jobs/dead-stock/trigger` and `Jobs` tag.
- `.env.example` — reflects all new environment variables.
- `docker-compose.yml` — `worker` service now runs `npm run worker`; all new env vars propagated.

### Architectural Decisions
- **Separate worker process** — the `worker` Docker service runs `src/workers/index.js` independently from the API. This prevents a worker crash from taking down the HTTP server and allows horizontal scaling of workers independently.
- **Email always async** — email is never sent inline in a request handler. The API enqueues a BullMQ job and returns immediately. The worker picks it up asynchronously. This keeps p99 latency unaffected by SMTP round-trips.
- **Password enumeration prevention** — `POST /auth/request-password-reset` always returns `200` regardless of whether the email exists.
- **Token invalidation on password reset** — incrementing `tokenVersion` immediately invalidates all outstanding JWT access tokens without requiring a token blacklist.

## 2026-05-12 - Blueprint alignment patch

This version aligns the implementation with the approved LeanStock blueprint and final pre-defense criteria:

- Added platform-level `SUPERADMIN` global role separate from tenant memberships.
- Added tenant lifecycle status: `ACTIVE` / `SUSPENDED`.
- Added platform endpoints for listing tenants, suspending tenants, reactivating tenants, and reading platform audit logs.
- Kept tenant roles from blueprint: `OWNER`, `MANAGER`, `STAFF`, `AUDITOR`.
- Added Supplier and Category workflows with tenant-scoped endpoints.
- Added Reservation workflow: create reservation, reserve stock, confirm reservation into sale, cancel reservation and release stock.
- Added Sales read endpoints.
- Added tenant audit log endpoint for Owner/Manager/Auditor.
- Updated OpenAPI contract and Postman collection to include all auth, business, admin, background-job, and audit endpoints.
- Added integration tests for blueprint-level catalog, reservation/sale, and platform super admin workflows.

## Strict blueprint workflow patch

- Added staged transfer workflow: `REQUESTED -> APPROVED -> IN_TRANSIT -> RECEIVED`, with stock mutation happening only at `RECEIVED` under Redis lock.
- Added OWNER-only tenant membership removal endpoint and frontend action.
- Added STAFF damaged/missing inventory issue report workflow with OWNER/MANAGER approve/reject before quantity changes.
- Added configurable tenant dead-stock policy: age days, discount percent, cooldown hours.
- Updated frontend, Postman, Swagger/OpenAPI and tests for the stricter LeanStock blueprint flow.
