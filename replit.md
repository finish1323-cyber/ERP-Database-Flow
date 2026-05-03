# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Internal ERP system for an Arabic-speaking organization.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite (Arabic RTL, Tajawal font)
- **UI**: shadcn/ui, Tailwind CSS, Lucide React, Framer Motion, Recharts

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── erp-app/            # React ERP frontend (RTL Arabic, served at /)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
│   └── src/seed.ts         # DB seed script: pnpm --filter @workspace/scripts run seed
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## ERP Modules

The ERP system covers 4 core departments (5th pending user input):

1. **المشتريات والموردين** (Purchasing & Suppliers) — `/purchasing`
   - Suppliers: `suppliers` table
   - Items: `items` table
   - Price Comparisons: `price_comparisons` table

2. **المخزن** (Warehouse & Logistics) — `/warehouse`
   - Inventory: `inventory` table (with low-stock alerts)
   - Stock Movements: `stock_movements` table

3. **التيليسيلز / CRM** — `/crm`
   - Customers: `customers` table (with delivery success rate)
   - Orders: `orders` + `order_items` tables

4. **المبيعات والفواتير** (Sales & Invoicing) — `/sales`
   - Invoices: `invoices` table

5. **Dashboard** — `/`
   - Summary stats cards at `/api/dashboard/stats`

## Authentication

All ERP routes (frontend and API) require sign-in. Auth is a simple shared **team password**.

- Login screen: shown by `artifacts/erp-app/src/pages/Login.tsx` whenever no session token is in `localStorage`.
- Backend auth lives in `artifacts/api-server/src/lib/auth.ts` (HMAC-signed session tokens, 7-day TTL) and `artifacts/api-server/src/middlewares/require-auth.ts`.
- Public API routes: `GET /api/healthz`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`. Everything else is gated behind `requireAuth`.
- Frontend wires `setAuthTokenGetter` so the generated React Query hooks send `Authorization: Bearer <token>`. A 401 response auto-clears the token and bounces back to the login screen.
- Sign-out lives in the sidebar (desktop + mobile) inside `AppLayout.tsx`.

### Required env vars

| Var | Purpose | Default |
| --- | --- | --- |
| `TEAM_PASSWORD` | Shared sign-in password. **Required** — when missing, every login attempt is rejected with HTTP 503 and the server logs an error. | (none) |
| `SESSION_SECRET` | HMAC key for session tokens. | Auto-generated per process if missing (sessions don't survive restart). |

## API Endpoints

All endpoints served under `/api`:
- `POST /api/auth/login` (public), `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/dashboard/stats`
- `GET|POST /api/suppliers`, `GET|PUT|DELETE /api/suppliers/:id`
- `GET|POST /api/items`, `GET|PUT|DELETE /api/items/:id`
- `GET|POST /api/price-comparisons`, `GET|PUT|DELETE /api/price-comparisons/:id`
- `GET|POST /api/inventory`, `GET|PUT|DELETE /api/inventory/:id`
- `GET|POST /api/stock-movements`, `GET|DELETE /api/stock-movements/:id`
- `GET|POST /api/customers`, `GET|PUT|DELETE /api/customers/:id`
- `GET|POST /api/orders`, `GET|PUT|DELETE /api/orders/:id`
- `GET|POST /api/invoices`, `GET|PUT|DELETE /api/invoices/:id`

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/erp-app` (`@workspace/erp-app`)

React + Vite ERP frontend. Arabic RTL. Tailwind + shadcn/ui.

- Entry: `src/main.tsx`
- App: `src/App.tsx` — routing via Wouter, all 5 pages
- Layout: `src/components/layout/AppLayout.tsx` — sidebar nav
- Pages: `src/pages/Dashboard.tsx`, `Purchasing.tsx`, `Warehouse.tsx`, `CRM.tsx`, `Sales.tsx`
- Uses `@workspace/api-client-react` for all data fetching

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server.

- Routes in `src/routes/` — one file per module
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — dev server

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- `src/schema/` — one file per table group
- `drizzle.config.ts` — Drizzle Kit config
- `pnpm --filter @workspace/db run push` — push schema to DB

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec + Orval codegen.

- `openapi.yaml` — source of truth for all API contracts
- Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `scripts` (`@workspace/scripts`)

- `pnpm --filter @workspace/scripts run seed` — seed database with sample data
