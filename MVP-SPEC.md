# MorningCart — MVP Specification

**Problem:** Every morning someone on the team manually rolls 10–25 individual breakfast orders into one clean vendor order — the slow, error-prone part nobody wants. MorningCart makes that aggregation one tap.

**Design driver — zero-learning:** Coordination rotates and nobody owns it, so the tool must be assumable by anyone instantly. A first-timer must be able to run breakfast in seconds with no training. This is the real meaning of "delete the coordinator," and it governs every decision below.

**Office profile (from interviewing the team):** 10–25 order on a typical morning. Coordination **rotates** (whoever's free runs it; nobody owns it). 1–2 fixed vendors with stable menus/prices. One person fronts the cash and collects it back later. Orders vary day to day. **Soft cutoff** — no hard deadline; the runner closes "when most have ordered." Vendor order goes out by WhatsApp **and** read aloud over the phone. **The #1 pain is manual aggregation** — not lost orders, not payment, not cost math.

## The product in 3 lines
1. A link (not an installed app) anyone opens on a phone to start and run breakfast.
2. Everyone taps items off a fixed menu; a live open roster shows who's in.
3. Any runner taps **Close & aggregate** → one clean vendor order + per-person totals + a paid/unpaid checklist.

## One-time setup (anyone, ~30 min, edited rarely)
Per restaurant — that is the entire admin (no categories, no scheduling, no vendor CRUD):

| Field | Example |
|---|---|
| Name | "Restaurant A" |
| Delivery fee (fixed) | 30 |
| Item list | name + price, e.g. Foul 8.00, Falafel 6.00, Tea 3.00 |

## The daily loop
1. Anyone taps **Start breakfast** → pick the restaurant (if there are 2). No schedule, no timer.
2. Each person taps menu items (quantity stepper + optional note like "no sugar"). A line can be tagged **for `<Name>`** (order-on-behalf, common). **One order per person, editable until close.**
3. **Live open roster:** "14 in" plus everyone's orders shown openly — small trusting group; visibility catches mistakes.
4. Any user taps **Close & aggregate** → instantly produces three outputs:
   - **a. The vendor order** — every item rolled up by total quantity, grouped, notes preserved (e.g. `Foul ×12 — 2× no oil`). ONE block that copy-pastes to WhatsApp **and** reads cleanly aloud. **This is the #1-pain killer.**
   - **b. Per-person totals** — each person: their items + their delivery share.
   - **c. Paid / unpaid checklist** — the person who fronted ticks people off as they repay. This is the entire payment feature.

## The delivery fee rule (computed automatically — runner types nothing at close)
- Delivery fee is a **fixed property of each restaurant**, set once in setup.
- **Per-person delivery share = restaurant delivery fee ÷ number of people who ordered.**
- **Per-person total = sum of their item prices + delivery share.**
- **Remainder rule:** when it doesn't divide evenly, distribute the leftover smallest-units one-by-one across people so shares sum to the fee **exactly** (no over/under-charge).
- **Transparent, never a black box:** e.g. `Ahmed — 18.00 items + 2.00 delivery = 20.00`.
- **Denominator = number of people who placed an order (submitters).** On-behalf items add to the submitter's bill but do **not** add a delivery head.

| Fee | # ordered | Per-person delivery |
|---|---|---|
| 30 | 15 | +2.00 each |
| 30 | 12 | +2.50 each |
| 30 | 14 | 30÷14 = 2.142… → **ten pay 2.14, four pay 2.15** (sums to exactly 30.00) |

## Minimal data model

| Entity | Key fields | Relationships |
|---|---|---|
| **Restaurant** | id, name, delivery_fee | has many MenuItem |
| **MenuItem** | id, restaurant_id, name, price | belongs to Restaurant |
| **Session** | id, restaurant_id, started_by, status (open/closed), created_at | belongs to Restaurant; has many Order |
| **Order** | id, session_id, person_name, **paid** (bool flag — no separate ledger) | belongs to Session; has many OrderLine |
| **OrderLine** | id, order_id, menu_item_id, qty, **note**, **for_name** (nullable) | belongs to Order |

**Close-time computation (plain terms):**
- **Aggregate rollup:** across all OrderLines in the session, sum `qty` per `menu_item_id`; group by item; list distinct notes with counts → the vendor block.
- **Delivery share:** `fee ÷ count(Orders)`; round each share down to the smallest unit, then hand out the leftover units one at a time until shares sum to `fee` exactly.
- **Per-person total:** for each Order, `sum(line.qty × menu_item.price) + that person's delivery share`.

## REST endpoint sketch
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/restaurants` | list restaurants + menus (setup + start) |
| `POST` | `/sessions` | start breakfast (pick restaurant) |
| `GET` | `/sessions/{id}` | live roster + all open orders (poll/refresh) |
| `POST` | `/sessions/{id}/orders` | upsert my order (lines, notes, for_name) |
| `POST` | `/sessions/{id}/close` | compute + return the 3 outputs |
| `PATCH` | `/orders/{id}` | toggle `paid` flag |

(Setup CRUD on `/restaurants` + `/menu-items` is the only extra, edited rarely.)

## Not in MVP (each killed by an interview answer)
- **Auto-lock / countdown / scheduler / cron** — soft cutoff, manual Close.
- **Ledger / mark-paid→confirm / waive / running balances / settlement** — payment isn't the pain; a paid/unpaid checkbox covers "one person fronts."
- **AI / free-text aggregation / LLM parsing** — stable structured menu makes exact tap-to-add rollup trivial.
- **Vendor CRUD / menu categories / session scheduling** — 1–2 fixed vendors, one flat editable list.
- **"Save my usual" / favorites** — orders vary daily.
- **Notifications / real-time / SSE / websockets / audit log / multi-office / hiding others' orders** — 10–25 trusting people; drop the link in WhatsApp/Slack and refresh.

## Why an app, not a spreadsheet
Rotating coordination means nobody owns building/resetting a sheet or writing the roll-up formula daily — the app auto-resets and auto-aggregates so any first-timer runs breakfast in seconds.

## Effort + stack
**Effort:** 3–5 days, one engineer.
**Stack (deliberately boring, ~25 internal users, no real-time):** one small web app (server-rendered or a thin SPA) + a simple relational DB (SQLite/Postgres). **Polling/refresh, not sockets.** Identity = "pick your name" for MVP; company SSO optional.

## Deferred decisions
- **Stricter delivery denominator:** count each *fed* person (including on-behalf) instead of only submitters — a real option, deferred, not MVP.
- Company SSO vs. "pick your name."
- Second vendor handling if more than 1–2 vendors ever appear.
