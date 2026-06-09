# MorningCart 🌅

Internal **group breakfast ordering** for one office. Each weekday a shared session
opens against a fixed, price-stable menu; everyone taps their order; when most are in,
**anyone** presses *Close & aggregate* and the app produces one pasteable vendor order,
per-person totals (items + a fair delivery split), and a paid/unpaid checklist. No
payments, no timer, no coordinator role — just breakfast, sorted.

## Architecture

A small monorepo:

| Path | What | Stack |
|---|---|---|
| `api/` | JSON API + persistence | **Django + Django Ninja**, PostgreSQL, gunicorn |
| `web/` | Mobile-first SPA | React + Vite + Tailwind + TanStack Query |
| `shared/` | Domain types + money logic for the **web** | TypeScript (tsup build, fast-check property tests) |

**The money is the crown jewel.** The delivery-split + aggregation logic is the server's
authority and lives in `api/breakfast/domain.py` — pure Python, no Django deps, with its
own `hypothesis` property tests. The web has a parallel TypeScript implementation in
`shared/`. **Both are property-tested to the same invariant:**
`Σ(per-person totals) == itemsGrandTotal + deliveryFee`, exact to the piaster. Money is
carried as integer piasters everywhere (1 EGP = 100); formatted only at the UI edge.

Identity is a pick-your-name **signed cookie** (`api/breakfast/auth.py`) — a thin seam to
swap for SSO/OIDC later. The web reverse-proxies `/api` (nginx in prod, Vite proxy in dev)
so the cookie is always same-origin.

## Quick start (Docker)

```bash
COOKIE_SECRET=$(openssl rand -hex 32) docker compose up --build
# → web at http://localhost:8080   (api is internal, reverse-proxied at /api)
```

`db` is Postgres; `api` runs migrations and seeds demo data on boot (`SEED_ON_BOOT=true`);
`web` is nginx serving the built SPA and proxying `/api/` to the api service.

## Local dev (without Docker)

Needs a local Postgres. From `api/`:

```bash
python -m venv .venv && .venv/bin/pip install -r requirements.txt
export DATABASE_URL="postgresql://user@localhost/morningcart"   # your DB
export COOKIE_SECRET="$(openssl rand -hex 32)"
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed
.venv/bin/python manage.py runserver 4000   # or: gunicorn morningcart.wsgi --bind 0.0.0.0:4000
```

From the repo root, for the web (proxies `/api` → `localhost:4000`):

```bash
npm install && npm run build:shared && npm run dev:web   # → http://localhost:5173
```

## Verify

```bash
# server money invariant (hypothesis property tests, no DB needed)
cd api && .venv/bin/python -m unittest breakfast.tests.test_domain -v

# web money invariant (fast-check) + typecheck
npm run test:shared && npm run typecheck
```

## Non-goals (deliberately not built)

No payment/checkout/card UI (paid is a boolean toggle); no countdown/auto-lock/scheduler
(close is a manual, soft, any-user action); no AI/free-text aggregation (fixed structured
menu); no notifications service, real-time sockets, multi-office, or per-user order hiding.

---

This repo also carries the product trail that produced it: `PRD-breakfast-ordering.md`,
`MVP-SPEC.md`, `UI-DESIGN-PROMPT-v2.md`, and `BUILD-PROMPT.md`.
