# LeanStock Final Backend + Frontend Demo

LeanStock is a production-style multi-tenant inventory system for small retail chains. This repository follows the approved blueprint and the final defense requirements: Express.js, Prisma ORM, PostgreSQL 15, Redis/BullMQ workers, real email integration, Docker Compose, Swagger/OpenAPI, Postman collection and a functional frontend demo.

## Stack

- Backend: Express.js + Node.js 22
- ORM: Prisma, no raw SQL in application code
- Database: PostgreSQL 15
- Queue/cache/locks: Redis + BullMQ
- Validation: Zod + envalid
- Auth: JWT access token + rotating refresh token
- Email: SMTP/Gmail App Password or Resend, queued asynchronously through worker
- Frontend: static HTML/JS demo served by Nginx

## Required files

- `docker-compose.yml` - backend + frontend + postgres + redis + worker
- `.env.example` - full environment template
- `README.md` - setup and architecture guide
- `openapi.yaml` - API contract for Swagger
- `prisma/migrations/` - Prisma migration history
- `tests/` - unit and integration tests
- `frontend/` - functional demo UI consuming the backend API
- `CHECKLIST.txt` - self-verification checklist
- `DEPLOYED_URL.txt` - fill after DeployRocks deployment
- `VIDEO_LINK.txt` - fill after recording defense video

## Run locally

```bash
cp .env.example .env
# edit .env: real SMTP/Resend email is required outside automated tests

docker compose down -v --remove-orphans
docker compose up --build
```

URLs:

- Frontend demo: `http://localhost:8080`
- Backend API: `http://localhost:3000/api/v1`
- Swagger UI: `http://localhost:3000/docs`
- Health check: `http://localhost:3000/health`

## Real email setup

For defense and any local demo, use a real provider. The app refuses to boot with `EMAIL_PROVIDER=mock` outside automated tests. Gmail SMTP example:

```env
EMAIL_PROVIDER=smtp
EMAIL_FROM=LeanStock <your_email@gmail.com>
EMAIL_FROM_ADDRESS=your_email@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password_without_spaces
APP_BASE_URL=http://localhost:3000
```

`SMTP_PASS` is a Gmail App Password, not your normal Gmail password. Do not commit `.env`.

All email jobs are queued and then sent to the real provider by the worker, so the API does not block on email sending. Worker logs show the delivery result:

```bash
docker compose logs -f worker
```

## Main workflows

### Authentication

- Register tenant OWNER
- Real email verification
- Login
- Refresh token
- Logout
- Request password reset email
- Reset password with token
- SUPERADMIN registration with setup key

Unverified users are blocked from protected routes.

### RBAC roles

- `OWNER` - full tenant control
- `MANAGER` - operational inventory/product/purchase order control
- `STAFF` - receiving, reservation and transfer operations
- `AUDITOR` - read-only reports, sales, reservations and audit logs
- `SUPERADMIN` - platform-level tenant controls, not tenant inventory operations

Tenant is resolved from authenticated user membership. `X-Tenant-Id` is intentionally not used because it lets users attempt tenant switching from a header.

### LeanStock business features

- Multi-tenant warehouse management with create/list/update in the demo frontend
- Supplier and category management
- Product catalog CRUD with SKU, barcode, reorder point and reorder quantity
- Inventory batch receiving with cost, sale price, min sale price, received date and optional expiry date
- Inventory adjustment/reconciliation with audit log
- Reservation checkout flow with Redis lock and idempotency key
- Sale confirmation from reservation with customer receipt email
- Atomic inter-location transfer with Redis lock
- Low-stock report and low-stock alert email to tenant manager/owner recipients
- Dead-stock report and dead-stock decay worker
- Moving-average forecasting endpoint returning reorder suggestions
- Supplier purchase order workflow: create, list, get, confirm, cancel
- Purchase order confirmation email
- Audit logs
- Queue status endpoint
- Platform tenant list, metrics, suspend, reactivate, force password reset

## Important API groups

- `/auth/*` - registration, email verification, login, refresh, logout, password reset
- `/users/me` - current user
- `/memberships` - tenant members and role assignment
- `/warehouses` - tenant warehouses
- `/catalog/suppliers`, `/catalog/categories` - supplier/category records
- `/products` - full catalog CRUD
- `/inventory/batches`, `/inventory/adjustments` - inventory receiving and reconciliation
- `/reservations` - reservation checkout lifecycle
- `/sales` - completed sales
- `/transfers` - inter-location transfer
- `/purchase-orders` - supplier PO workflow
- `/reports/low-stock`, `/reports/dead-stock`, `/reports/forecast/reorder-suggestions`, `/reports/inventory-snapshot`
- `/audit-logs` - tenant audit logs
- `/jobs/status`, `/jobs/dead-stock/trigger` - queue visibility and job trigger
- `/notifications/email` - required real email endpoint for OWNER/MANAGER
- `/platform/*` - SUPERADMIN platform controls

## Postman

Import:

```text
postman/LeanStock_Defense_Clean.postman_collection.json
```

Use the collection order from top to bottom:

1. Register, verify and login OWNER
2. Register/verify MANAGER, STAFF, AUDITOR as account-only users, then OWNER assigns them to the main tenant
3. Register/verify/login SUPERADMIN
4. Create warehouses, supplier, category, product, inventory batch
5. Reservation, sale, transfer and purchase order flows
6. Reports, audit logs and jobs
7. Notifications
8. RBAC checks
9. Platform controls
10. Refresh/logout

## Frontend defense flow

Open `http://localhost:8080` and demonstrate:

1. Register owner
2. Receive real verification email, verify by clicking the link or copy the token into the frontend/Postman
3. Login
4. Create warehouse, supplier, category and product
5. Receive inventory
6. Create reservation and confirm it into a sale
7. Trigger a business email notification
8. Show reports and queue status
9. Logout

## Tests

```bash
docker compose exec api npm test
```

Tests cover auth, RBAC, transfer/inventory safety, email service, dead-stock logic and blueprint workflows.

## Deployment on DeployRocks

1. Push the full repository to GitHub, not ZIP-only.
2. Connect GitHub in `dashboard.deployrocks.com`.
3. Configure production environment variables from `.env.example`.
4. Use service hostnames in production values: `postgres` and `redis`, not `localhost`.
5. Deploy using `docker-compose.yml`.
6. Paste the generated URL into `DEPLOYED_URL.txt`.
7. Add the deployed frontend origin to `CORS_ORIGINS`.

## Security notes

- No plaintext passwords; Argon2 hashing is used.
- No hardcoded production secrets; `.env` is ignored.
- JWT secrets must be at least 32 characters.
- CORS wildcard is rejected in production.
- Auth endpoints have Redis token bucket rate limiting.
- Business endpoints reject wrong-role users with `403 Forbidden`.
- Tenant isolation is enforced through membership and `tenantId` filters.

### Strict LeanStock blueprint workflows

The final patch aligns the demo with the stricter LeanStock blueprint:

- Inter-location transfers are no longer one-click mutations. They follow `REQUESTED -> APPROVED -> IN_TRANSIT -> RECEIVED`; inventory is moved only on receipt, inside a Redis lock protected transaction.
- STAFF can report damaged or missing inventory through an issue report. OWNER/MANAGER must approve the report before stock quantity changes.
- OWNER can remove tenant users through the membership removal workflow.
- Dead-stock decay uses a tenant-level configurable policy: age days, discount percent and cooldown hours.

Required LeanStock business emails remain focused on the final specification: low-stock alert, purchase order confirmation and transfer receipt. Supplier/category creation is treated as normal CRUD plus audit log, not as a required email event.
