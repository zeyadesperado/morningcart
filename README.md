# MorningCart

The office breakfast run, settled fairly: one person orders for the team, everyone picks from a real menu, and at close the bill — items plus a fixed delivery fee split equally across submitters — comes out to the exact piaster.

## Architecture

An npm-workspaces monorepo of three packages:

| Package | What it is | Notes |
| --- | --- | --- |
| `shared` (`@morningcart/shared`) | Domain types + the money/close/split logic | Built to `dist`. **This is the server's authority** — `closeSession`, `deliverySplit`, and `money`/`egp` live here, so `/api` and `/web` compute identically and money never drifts. |
| `api` (`@morningcart/api`) | Fastify + Prisma + Postgres (ESM, run via `tsx`) | Authoritative store; imports the close/split logic from `shared`. |
| `web` (`@morningcart/web`) | Vite + React SPA | In production it sits behind nginx, which reverse-proxies `/api/` to the api service so the auth cookie is same-origin. |

Money is integer **piasters** (1 EGP = 100) everywhere, formatted only at the edge — that's what keeps an equal delivery split exact (remainders go to the first N submitters, summing back to the penny).

## Quick start (Docker)

```bash
docker compose up --build
```

Then open the web app at **http://localhost:8080**.

The stack is `db` (Postgres 16) → `api` (migrates, seeds when `SEED_ON_BOOT=true`, then serves on :4000) → `web` (nginx on :8080, proxying `/api/`). Only the web port is published; everything else talks over the compose network.

## Local dev (without Docker)

Needs a running Postgres. Point `api/.env` `DATABASE_URL` at it (see `api/.env.example`), then:

```bash
npm install            # all workspaces
npm run build:shared   # api & web import the built shared package
npm run db:generate    # prisma generate
npm run db:migrate     # prisma migrate deploy
npm run db:seed        # seed restaurants, menus, and demo sessions
npm run dev:api        # Fastify on :4000
npm run dev:web        # Vite dev server (in another terminal)
```

## Verify

```bash
npm run test:shared    # exact-sum property tests — splits always reconcile to the piaster
npm run typecheck      # builds shared, then type-checks all three workspaces
```

## Identity

Auth is a deliberate seam: today it's **pick-your-name**, stored in a signed `mc_user` cookie. To move to SSO, swap the body of `currentUser`/`setUser` in `api/src/auth.ts` for OIDC — no route handler changes.

## Non-goals

- **No payments.** A per-order `paid` boolean is the entire money surface; no gateways, no balances.
- **No timers.** Sessions are opened and closed by hand, never on a schedule.
- **No AI aggregation.** The close-time roll-up is plain deterministic arithmetic from `shared`.
