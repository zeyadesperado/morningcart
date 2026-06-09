<div align="center">

# MorningCart 🌅

**Internal group-breakfast ordering for one office — built to delete the "breakfast coordinator" role, not tool it.**

`Django + Django Ninja` · `React + Vite + Tailwind` · `PostgreSQL` · `TypeScript` · `Python`

</div>

---

## Table of contents

- [What it is](#what-it-is)
- [Why it exists](#why-it-exists)
- [Features](#features)
- [How a morning works](#how-a-morning-works)
- [Architecture](#architecture)
- [The money invariant (the crown jewel)](#the-money-invariant-the-crown-jewel)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Data model](#data-model)
- [API reference](#api-reference)
- [Identity & security](#identity--security)
- [Getting started (Docker)](#getting-started-docker)
- [Local development](#local-development)
- [Testing & verification](#testing--verification)
- [Design decisions & non-goals](#design-decisions--non-goals)
- [Roadmap](#roadmap)
- [License](#license)

---

## What it is

Every weekday a team orders breakfast together. Today that means a scramble across WhatsApp,
Slack, phone, and hallway shouts; one rotating volunteer collects everyone's order, does the
per-person arithmetic by hand, and chases the money.

**MorningCart** replaces that with a 90-second ritual. Each weekday one shared **session**
opens for a restaurant against a fixed, price-stable menu. Everyone taps their order (one
order per person — editing replaces it, duplicates are structurally impossible). When most
people are in, **anyone** presses **Close & aggregate** and the app instantly produces:

1. **One pasteable vendor order** — every item rolled up by quantity with notes preserved
   (`Foul ×12 — 2× no oil`), ready to send on WhatsApp or read aloud over the phone.
2. **Per-person totals** — each person's items **plus a fair share of the fixed delivery
   fee**, shown transparently and computed to the exact piaster.
3. **A paid / unpaid checklist** — the only "payment" surface there is.

## Why it exists

The pain in group breakfast isn't the food — it's **coordination and arithmetic**. So
MorningCart optimizes for the passive majority (be done in seconds), makes the coordinator
role *assumable by anyone instantly* (it rotates; the tool is the expertise), and tracks
money without ever moving it. It is internal tooling for colleagues who trust each other:
warm, fast, and quietly correct — not a flashy food-delivery app, not a sterile CRUD tool.

## Features

- 📋 **Tap-to-order** from a fixed, structured menu (qty, per-item notes, order-on-behalf).
- 👥 **Live roster** — see who's in, everyone's orders visible (small trusting group).
- 🧮 **Automatic aggregation** — the rolled-up vendor order in one tap.
- 💸 **Fair delivery split** — fixed per restaurant, divided across submitters, exact to the piaster.
- ✅ **Paid/unpaid tracking** — a checklist, never a payment processor.
- 🔁 **One order per person** — DB-enforced upsert; no duplicates.
- 🗓️ **One open session per restaurant per day** — partial unique index + handler guard.
- 🛠️ **Light admin** — restaurants, menus, prices, delivery fees.
- 📱 **Mobile-first**, accessible (WCAG AA), warm "morning counter" design.

## How a morning works

```mermaid
flowchart LR
  A[Anyone starts<br/>a session] --> B[Everyone taps<br/>their order]
  B --> C[Live roster<br/>'14 in']
  C --> D[Anyone presses<br/>Close & aggregate]
  D --> E[Vendor order<br/>copy / read aloud]
  D --> F[Per-person totals<br/>items + delivery split]
  D --> G[Paid / unpaid<br/>checklist]
```

## Architecture

A small npm-workspace monorepo. The web reverse-proxies `/api` (Vite in dev, nginx in prod)
so the auth cookie is always same-origin.

```
Browser ──▶ web (React SPA, nginx)
                │  /api/*  (reverse proxy)
                ▼
            api (Django + Ninja, gunicorn) ──▶ PostgreSQL
```

| Path | Role | Stack |
|---|---|---|
| `api/` | JSON API + persistence + the money authority | **Django 5.2 + django-ninja**, psycopg, gunicorn |
| `web/` | Mobile-first single-page app | React 18 + Vite + Tailwind + TanStack Query + Framer Motion |
| `shared/` | Domain types + money logic **for the web** | TypeScript (tsup build, fast-check tests) |

## The money invariant (the crown jewel)

Money is carried as **integer piasters** everywhere (1 EGP = 100) and formatted only at the
UI edge, so nothing ever drifts. The delivery fee is split across submitters **exactly**:

```
delivery_split(fee, n):
    base = fee // n
    remainder = fee - base*n          # 0 .. n-1
    return [base + (1 if i < remainder else 0) for i in range(n)]   # sums to fee EXACTLY
```

Each person owes `their items (from snapshotted unit prices) + their delivery share`. The
guarantee the whole product rests on:

> **Σ(per-person totals) == itemsGrandTotal + deliveryFee**, to the piaster.

An order-on-behalf line (`forName`) adds items to the submitter's bill but **never adds a
delivery head**.

This logic is the **server's authority**, in pure Python at `api/breakfast/domain.py` (no
Django deps). The web has a parallel TypeScript implementation in `shared/`. **Both are
property-tested to the same invariant** — `hypothesis` on the server, `fast-check` on the web
(including a multi-thousand-run fuzz of the split). The dual implementation is a deliberate
trade-off of single-sourcing for letting a Python backend serve a TypeScript frontend.

## Tech stack

**Backend** — Django 5.2, [Django Ninja](https://django-ninja.dev/) (Pydantic-validated,
auto OpenAPI at `/api/docs`), PostgreSQL, gunicorn, signed-cookie identity, `hypothesis`
property tests.
**Frontend** — React 18, Vite, TypeScript, Tailwind CSS, TanStack Query (polling + optimistic
updates), Framer Motion.
**Infra** — Docker Compose (Postgres + api + nginx-served web), reverse-proxied same-origin.

## Project structure

```
.
├── api/                      # Django backend
│   ├── morningcart/          #   project (settings, urls, wsgi)
│   └── breakfast/            #   app
│       ├── models.py         #     Restaurant, MenuItem, Session, Order, OrderLine
│       ├── domain.py         #     pure money/aggregation logic (property-tested)
│       ├── api.py            #     all Ninja routes + schemas
│       ├── auth.py           #     signed-cookie identity seam
│       ├── data.py           #     seed data (menus, fixtures)
│       ├── tests/            #     hypothesis property tests
│       └── management/commands/seed.py
├── web/                      # React SPA
│   └── src/{api,components,screens,lib}
├── shared/                   # TS domain + money logic (web)  — fast-check tested
├── docker-compose.yml
└── package.json              # npm workspaces: shared, web
```

## Data model

Money fields are integer piasters.

| Model | Key fields | Notes |
|---|---|---|
| **Restaurant** | `name, arabic, delivery_fee, active` | has many MenuItem / Session |
| **MenuItem** | `restaurant, name, arabic, price, kind, available, sort_order` | `kind` ∈ plate/drink/extra (display only) |
| **Session** | `restaurant, started_by, status, service_date, closed_at` | partial unique: one **open** per restaurant per day |
| **Order** | `session, person, paid` | **unique (session, person)** → upsert |
| **OrderLine** | `order, menu_item, qty, note, for_name, unit_price` | `unit_price` snapshotted at add time |

Close results are **derived** (recomputed from orders), never stored as truth — only
`status`, `closed_at`, and the per-order `paid` flags persist.

## API reference

All under `/api`. Mutations and order/session reads require the identity cookie. JSON bodies;
errors return `{ "error": "..." }`. Interactive docs at `/api/docs`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | liveness |
| `GET` | `/auth/me` · `/colleagues` | current user · the name list |
| `POST` | `/auth/login` · `/auth/logout` | sign in (whitelisted name) · sign out |
| `GET` | `/restaurants` | restaurants + menus |
| `POST`/`PATCH` | `/restaurants[/{id}]` | create / edit restaurant (setup) |
| `POST`/`PATCH`/`DELETE` | `/restaurants/{id}/items[/{itemId}]` | menu items (setup) |
| `GET` | `/sessions/open?restaurantId=` | the current open session (404 if none) |
| `POST` | `/sessions` | start breakfast (one-open-per-day guard) |
| `GET` | `/sessions/{id}` | roster + all orders (poll target) |
| `PUT`/`DELETE` | `/sessions/{id}/order` | upsert / cancel my order |
| `POST` | `/sessions/{id}/close` | close & aggregate (any user, idempotent) |
| `GET` | `/sessions/{id}/result` | aggregate + per-person totals |
| `PATCH` | `/orders/{id}` | toggle `paid` |

## Identity & security

- **Pick-your-name** signed cookie (`django.core.signing`, `HttpOnly`, `SameSite=Strict`).
  Names are **whitelisted** against the colleague list server-side — no impersonation.
- A thin `current_user` / `set_user` **seam** in `breakfast/auth.py` — swap for OIDC/SSO
  without touching any route.
- Order/session reads and all mutations require the cookie; `/restaurants` and `/colleagues`
  stay public for the login screen.
- `COOKIE_SECRET` has **no baked-in default** in Docker — compose fails loudly if unset.
- The Django ORM is fully parameterized — no raw SQL, no injection surface.

## Getting started (Docker)

```bash
git clone https://github.com/zeyadesperado/morningcart && cd morningcart
COOKIE_SECRET=$(openssl rand -hex 32) docker compose up --build
# → web at http://localhost:8080   (api is internal, reverse-proxied at /api)
```

`db` is Postgres; `api` runs migrations and seeds demo data on boot (`SEED_ON_BOOT=true`);
`web` is nginx serving the built SPA and proxying `/api/`.

## Local development

Needs a local Postgres. **Backend** (from `api/`):

```bash
python -m venv .venv && .venv/bin/pip install -r requirements.txt
export DATABASE_URL="postgresql://user@localhost/morningcart"   # your DB
export COOKIE_SECRET="$(openssl rand -hex 32)"
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed
.venv/bin/python manage.py runserver 4000
```

**Frontend** (from repo root — proxies `/api` → `localhost:4000`):

```bash
npm install && npm run build:shared && npm run dev:web   # → http://localhost:5173
```

## Testing & verification

```bash
# server money invariant — hypothesis property tests, no DB needed
cd api && .venv/bin/python -m unittest breakfast.tests.test_domain -v

# web money invariant (fast-check) + full typecheck
npm run test:shared && npm run typecheck
```

The backend has been verified end-to-end against a real Postgres: full ordering flow plus
every guard (whitelisted login, auth-gated reads, empty-session close rejection,
one-open-session-per-day, upsert-replace) — with the close invariant holding on live data.

## Design decisions & non-goals

Deliberately **not** built, to keep the tool honest and small:

- ❌ **No payments** — no checkout, cards, wallet, or processor. `paid` is a boolean toggle.
- ❌ **No timer / auto-lock / scheduler** — closing is a manual, soft, any-user action.
- ❌ **No AI / free-text aggregation** — a fixed structured menu makes rollups exact.
- ❌ **No** notifications service, real-time sockets, multi-office, or per-user order hiding.

The product was scoped from a deeper PRD down to this MVP by interviewing the actual team —
the guiding principle throughout: *solve the real problem (coordination + arithmetic), build
nothing else.*

## Roadmap

Validated-need ideas for later: saved "usuals", scheduled auto-open, push reminders,
period balances for batch settlers, SSO, and multi-office.

## License

No license yet — add one (e.g. MIT) before reuse.
