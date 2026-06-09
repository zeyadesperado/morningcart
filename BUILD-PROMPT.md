# BUILD PROMPT — MorningCart (full-stack)

> Paste this into your coding agent (e.g. Claude Code) **from inside the repo that contains the `morningcart/` prototype**. It builds the backend and wires the existing frontend to it. Hand it the three reference files named below.

---

## ROLE & OBJECTIVE

You are a senior full-stack engineer. Ship **MorningCart** — an internal tool for daily group breakfast ordering — from a design-complete frontend prototype to a **deployable, multi-user application** with a real backend and persistence. Target: a working internal deployment one office can use tomorrow morning. Scope is deliberately small (~3–5 focused days). Favour boring, reliable, well-tested choices over cleverness.

**You are NOT starting from zero.** A polished, reviewed, accessibility-hardened **frontend already exists** in `./morningcart/` (React 18 + TypeScript + Vite + Tailwind, Framer Motion). It currently runs on in-memory mock data driven by a dev "States" navigator. **Keep its design, components, and UX exactly as they are** — your frontend job is to replace the in-memory store with a real API, add identity, and make it multi-user. Treat it as the visual/interaction source of truth.

Reference files in this repo (read them first):
- `MVP-SPEC.md` — the authoritative product spec (scope, data model, endpoint sketch, the delivery-fee rule).
- `morningcart/src/lib/aggregate.ts` and `morningcart/src/lib/money.ts` — the **exact** aggregation + delivery-split + money logic. This is canonical; port it to the backend, do not reinvent it.
- `morningcart/src/types.ts` and `morningcart/src/data/seed.ts` — the domain types and realistic seed data.
- `UI-DESIGN-PROMPT-v2.md` — the design contract, if you need to fill any UI gap.

---

## WHAT MORNINGCART IS (one breath)

Each morning, one shared **Session** opens for a fixed restaurant. Everyone taps items off a fixed, price-stable menu (one order per person, editable). When most are in, **anyone** taps **Close & aggregate** — the app produces one pasteable vendor order, per-person totals (items + a fair delivery share), and a paid/unpaid checklist. The buyer sends the order out-of-band (WhatsApp/phone) and collects the cash. Office profile: 10–25 people, rotating coordinator, 1–2 fixed vendors, soft cutoff (no timer).

---

## NON-NEGOTIABLES (carry these into every layer; they are the product)

1. **No money movement, ever.** No checkout, cards, wallet, or payment processor. "Paid" is a boolean a human toggles. Tracking only.
2. **Manual, soft close by ANY authenticated user.** No countdown, auto-lock, scheduler, or cron. Closing is a button.
3. **Delivery fee is a fixed property of each restaurant**, split equally across the **number of people who ordered (submitters)**, with an **exact-sum remainder rule** (see below). An order-on-behalf line (`forName`) adds items to the submitter's bill but **never adds a delivery head**.
4. **Per-person total = their items + their delivery share**, shown transparently. `Σ(per-person totals) === items grand total + delivery fee`, to the piaster. This invariant must be enforced by automated tests.
5. **Fixed structured menu. No AI/free-text aggregation.** Rollup is deterministic arithmetic.
6. **Money is integer piasters** (1 EGP = 100) everywhere — DB columns, API payloads, domain logic. Format only at the UI edge.
7. **Everyone's orders are visible** to everyone in the session (small trusting group). No per-user hiding.
8. **Mobile-first; WCAG 2.1 AA** must be preserved (the prototype already passes — don't regress it).

**Do NOT build** (explicitly out of scope): ledger / mark-paid→confirm / waive / running balances / settlement workflow; notifications service / real-time sockets / SSE / audit log; multi-office; vendor categories or scheduling; "save my usual" / favourites; roles beyond "anyone can do anything." A simple paid/unpaid toggle is the entire payment surface.

---

## RECOMMENDED STACK (opinionated; swap only with reason)

Single repo, two apps + shared domain:

```
/web        ← the existing morningcart/ frontend (rename morningcart → web)
/api        ← new backend
/shared     ← domain types + the ported aggregate/money logic (imported by both)
```

- **Backend:** Node 18+, **TypeScript**, **Fastify**, **Zod** for request validation, **Prisma** ORM, **PostgreSQL** (SQLite is fine for first run / dev). REST API matching the spec.
- **Frontend:** keep Vite + React + TS + Tailwind. Add **TanStack Query (React Query)** for fetching, **polling**, and optimistic updates. Replace the in-memory `App.tsx` store + `__mcGo` dev hook with a typed API client. Keep all components/screens/design tokens unchanged.
- **Shared:** move `aggregate.ts`, `money.ts`, and the domain `types.ts` into `/shared` so the **same** close/split code runs on the server (authoritative) and types flow to the client. Add a typed fetch client (or generate one). *(If you prefer end-to-end type safety over REST, tRPC is an acceptable substitute — but keep the REST shapes from the spec as the contract.)*
- **Identity (MVP):** lightweight "**pick your name**" from a seeded colleague list, persisted in a signed httpOnly cookie. Structure it as a thin `getCurrentUser(req)` seam so company **SSO/OIDC** can replace it later without touching handlers. Do not build full auth.
- **Live updates:** **poll** the open session every 5–10s via React Query `refetchInterval`. No websockets.
- **Deploy:** Dockerfile for `/api`, `docker-compose.yml` (api + postgres), static-host the built `/web`. One small internal VM or Fly.io/Render. Include a `.env.example` and a README.

---

## DATA MODEL (Prisma; mirror `morningcart/src/types.ts`)

- **Restaurant**: `id, name, arabic?, deliveryFee (Int piasters), active`. Has many MenuItem.
- **MenuItem**: `id, restaurantId, name, arabic?, price (Int piasters), kind ('plate'|'drink'|'extra'), available`. Belongs to Restaurant.
- **Session**: `id, restaurantId, startedBy, status ('open'|'closed'), serviceDate, createdAt, closedAt?`. Has many Order. Add a guard so only **one open session per restaurant per serviceDate** exists.
- **Order**: `id, sessionId, person, paid (Bool, default false), createdAt`. **Unique (sessionId, person)** — this enforces one-order-per-person as an upsert. Has many OrderLine.
- **OrderLine**: `id, orderId, menuItemId, qty (1–10), note?, forName?, unitPrice (Int)`. **Snapshot `unitPrice` at add time** so a later price edit in Setup can't change an in-flight or historical bill.

Close-time computation is **derived, not stored as truth** (recompute from orders), except persist `status=closed`, `closedAt`, and the `paid` flags. Returning the close result re-runs the canonical functions in `/shared`.

---

## API (REST; flesh out the spec's sketch). Identity from the session cookie.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/restaurants` | list restaurants + menus (setup + start) |
| `POST`/`PATCH`/`DELETE` | `/api/restaurants[/:id]`, `/api/restaurants/:id/items[/:itemId]` | Setup CRUD (rarely used) |
| `GET` | `/api/sessions/open?restaurantId=` | the current open session (or 404) |
| `POST` | `/api/sessions` | start breakfast `{restaurantId}` (guard: one open/restaurant/day) |
| `GET` | `/api/sessions/:id` | roster + ALL orders (the poll target) |
| `PUT` | `/api/sessions/:id/order` | **upsert MY order** `{lines:[{menuItemId,qty,note?,forName?}]}` (idempotent) |
| `DELETE` | `/api/sessions/:id/order` | cancel my order (before close) |
| `POST` | `/api/sessions/:id/close` | close + return the computed result (any user; **idempotent** — re-closing returns stored result) |
| `GET` | `/api/sessions/:id/result` | aggregate + per-person totals + paid flags |
| `PATCH` | `/api/orders/:id` | toggle `{paid}` |

**Example — `GET /api/sessions/:id/result`:**
```json
{
  "sessionId": "s_123", "restaurant": { "name": "El Sobhy", "deliveryFee": 3000 },
  "status": "closed", "headcount": 11,
  "aggregate": [{ "itemId": "foul", "name": "Foul", "qty": 12, "notes": [{ "note": "no oil", "count": 2 }] }],
  "itemsGrandTotal": 18300, "deliveryFee": 3000, "grandTotal": 21300,
  "perPerson": [{ "person": "Mariam", "itemsTotal": 1100, "deliveryShare": 273, "total": 1373, "paid": true, "forNames": [] }]
}
```
All money is integer piasters. The client formats with the ported `money()`.

---

## THE DELIVERY SPLIT (port verbatim — do not re-derive)

```
deliverySplit(fee, n):           # fee, shares in integer piasters
  base = floor(fee / n)
  remainder = fee - base*n       # 0..n-1
  return [ base + (i < remainder ? 1 : 0) for i in 0..n-1 ]   # sums to fee EXACTLY
```
Per person: `itemsTotal = Σ(line.qty * line.unitPrice)`; `total = itemsTotal + deliveryShare`. Denominator `n = number of orders (submitters)`. `forName` lines contribute to `itemsTotal` only — never to `n`.

---

## BUILD ORDER (sequence your work; commit per step)

1. **Scaffold `/api`** (Fastify + Prisma + Postgres), `/shared`, and convert `morningcart/` → `/web`. Wire `/shared` into both `tsconfig`s.
2. **Move the domain into `/shared`** (`aggregate.ts`, `money.ts`, `types.ts`). **Write tests FIRST** (Vitest + `fast-check`): `deliverySplit` always sums to `fee` and shares differ by ≤1 (fuzz fee 0–6000 × n 1–30); `closeSession` over the seed CLOSED_SESSION reconciles `Σtotal === itemsGrandTotal + fee`; an on-behalf line adds items but not a head. These must pass before anything else.
3. **Prisma schema + migration + seed** (port `seed.ts`: 2 restaurants, the menus, sample sessions).
4. **Endpoints** with Zod validation and the `getCurrentUser` seam.
5. **Identity**: pick-your-name → signed cookie.
6. **Wire `/web`**: delete the in-memory store + `__mcGo` dev hook + States navigator (or keep navigator behind a dev flag); add a typed API client and TanStack Query. Map each screen to its endpoint. Keep the optimistic-submit + offline/retry UI that already exists (`States.tsx` `RetryBanner`).
7. **Polling** on the open session; optimistic order upsert with rollback on failure.
8. **Dockerfile + compose + README + `.env.example`**; deploy.

---

## DEFINITION OF DONE

- Two people on two devices order in the **same** session and both appear in the roster within ~10s (polling).
- **Any** authenticated user can Close; the result **persists** and re-loading the URL shows the same numbers.
- `Σ(per-person totals) === itemsGrandTotal + deliveryFee` exactly — enforced by passing property tests in CI. On-behalf adds items, not a delivery head (tested).
- No payment/checkout UI anywhere; `paid` is a toggle. None of the "Do NOT build" items exist.
- Mobile-first; WCAG AA preserved (run an axe check; no regressions vs. the prototype).
- `npm run typecheck`, lint, and `vitest` all green in CI; one-command local boot via `docker compose up`.

---

## QUALITY BAR

TypeScript strict everywhere. Validate every request body with Zod. The money/aggregation logic is the crown jewels — it lives in one place (`/shared`), is the server's authority, and is covered by unit + property tests. Don't gold-plate; build exactly the spec above, well-tested, and stop.

Start by reading `MVP-SPEC.md` and `morningcart/src/lib/aggregate.ts`, then propose the repo layout and the Prisma schema before writing endpoints.
