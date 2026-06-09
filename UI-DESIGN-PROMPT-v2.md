# MorningCart UI Design Prompt — Hand This to Claude

## ROLE & PRIME OBJECTIVE

You are a principal product designer and senior frontend engineer. Design and build the UI for **MorningCart**, a thin internal web app (opens as a link on a phone — not installed) that a rotating, untrained coordinator uses to run **daily group breakfast ordering** for one office.

**Your single most important instruction: ESCAPE the generic "AI-generated SaaS" look.** This must feel like a hand-crafted, opinionated tool with a distinct point of view — a calm, warm "morning ritual," not a template. If the result could be mistaken for any other AI demo, you have failed.

### FORBIDDEN ANTI-PATTERNS (do not produce any of these)
- Purple/violet gradients (or any "AI gradient" hero glow).
- A centered marketing hero with a big headline + subhead + two pill buttons.
- Lifeless, evenly-spaced card grids used as the default layout.
- Inter-on-white blandness (default font on flat white, no texture, no character).
- Food-delivery app energy: glossy dish photography, "Add to cart," promo banners, upsell/cross-sell.
- **Any checkout, payment, or card-entry UI.** There is no money movement in this product — none.

---

## PRODUCT CONTEXT

MorningCart solves exactly ONE pain: **manual aggregation** — rolling everyone's individual breakfast picks into one clean order for the vendor. That is the whole point. It is NOT about lost orders, NOT about payments, NOT about cost math.

The order goes to a vendor two ways at once: pasted into WhatsApp **and** read aloud over the phone. So the aggregated output must be a **single artifact** that is both copy-pasteable and clean to read aloud.

No LLM, no parsing, no real-time sockets. The menu is a fixed, structured list, so rollup is exact arithmetic. Stack is deliberately boring; this task is the **UI prototype**.

**Why an app, not a shared spreadsheet:** rotating coordination means nobody owns building or resetting a sheet daily. The app **auto-resets to a fresh session each day** and auto-aggregates, so any first-timer runs breakfast in seconds — that daily-fresh "Start breakfast" empty state is a deliberate, designed moment, not an afterthought.

### Office profile (drives every decision)
- 10–25 people order on a typical morning.
- **Coordination ROTATES** — whoever's free runs it; nobody owns it. The tool must be **ZERO-LEARNING**: a first-timer runs breakfast in seconds. Any user can do every coordinator action.
- 1–2 **fixed** vendors with stable menus & prices.
- **One person fronts the cash** each day and collects it back later.
- Orders vary day to day → "save my usual"/favorites is low value; **fast tap-to-add** matters more than memory.
- **SOFT cutoff** — there is NO hard deadline. The current coordinator manually closes "when most have ordered."
- Small, trusting group → **everyone's orders are visible**, not hidden.

---

## THE HERO: MENU COMPOSER (keep this central)

The signature interaction is composing your order from a fixed menu:
- **Tap-to-add** items from a FIXED menu (no search-first, no free text).
- **Quantity stepper** per item (− / value / +), with ≥44px targets.
- Optional **per-item note** (e.g. "no sugar", "no oil").
- Optional **"for <Name>"** line on an item, for the common order-on-behalf case.
- A **persistent LIVE running subtotal** that updates instantly as items change — always visible in the thumb zone.
- **One order per person, editable until close.**

---

## NEW SIGNATURE ELEMENT (replaces the old countdown timer)

There is **no countdown, no timer, no auto-lock** — the cutoff is soft. Do **not** design any timer, deadline, or "locked by time" element.

Instead, the emotional centerpiece is built from the live, social truth of this build:
1. **The live open roster** — a warm, alive "**14 in**" presence indicator showing who's in and their orders openly, growing as people join. This is the heartbeat of an open session.
2. **The "Close → clean order appears" reveal** — when the coordinator taps **Close & aggregate**, a messy pile of individual picks instantly resolves into ONE tidy vendor order. Make this transition feel **satisfying and earned** — the payoff moment of the whole app.

Lean into both. They carry the personality the old timer used to.

---

## THE CLOSE & AGGREGATE FLOW

A **manual "Close & aggregate" button** is available to **ANY user** (rotating coordination, zero-learning — no owner, no permissions gate). Tapping it instantly produces **THREE outputs**:

**(a) The vendor order — the #1-pain killer.**
- Every item rolled up by **total quantity**, grouped, with notes preserved (e.g. `Foul ×12 — 2× no oil`).
- ONE block that is BOTH copy-pasteable (WhatsApp) AND clean to read aloud (phone).
- A prominent **Copy** button (with copied-confirmation state).

**(b) Per-person totals — transparent, never a black box.**
- Each person: **(their items) + (their auto delivery share) = total.**
- Show the breakdown inline, e.g. `Ahmed — 18.00 items + 2.00 delivery = 20.00`.

**(c) A paid / unpaid CHECKLIST — the ENTIRE payment feature.**
- A simple tickable list the person who fronted the cash uses to check people off as they repay.
- **NO ledger. NO mark-paid→confirm. NO waive. NO running balances. NO settlement workflow.** Just paid/unpaid toggles.

---

## DELIVERY-FEE RULE (computed automatically — coordinator types nothing at close)

- The delivery fee is a **fixed property of each restaurant**, set once in setup (e.g. A = 30, B = 25).
- On close: **per-person delivery share = (restaurant delivery fee) ÷ (number of people who ORDERED)**.
- **Denominator = number of submitters** (people who placed an order). On-behalf items add to the submitter's bill but do **NOT** add a delivery head.
- **The MVP counts submitters only.** A stricter "count each fed person" variant (giving every on-behalf person their own delivery head) is an **explicitly DEFERRED option — do NOT implement it.** On-behalf lines never increase the denominator.
- Per-person total = (sum of their item prices) + (their delivery share).
- **REMAINDER RULE:** when the fee doesn't divide evenly, distribute the leftover smallest-units one-by-one across people so the shares **sum to the fee EXACTLY** — no over/undercharge.
- Always shown **transparently**, never hidden.
- Worked examples to honor:
  - Fee 30, 15 ordered → +2.00 each. (15 × 2.00 = 30.00.)
  - Fee 30, 12 ordered → +2.50 each. (12 × 2.50 = 30.00.)
  - Fee 30, 14 ordered → 30 ÷ 14 = 2.142… → **ten people pay 2.14 and four pay 2.15** → (10 × 2.14) + (4 × 2.15) = 21.40 + 8.60 = **exactly 30.00**.

---

## SCREENS & STATES (enumerate and build every one)

For **every** screen, also implement: **loading**, **empty**, **error / offline → retry**, and the **closed / read-only** state.
**EXPLICITLY EXCLUDED everywhere:** no timer/countdown states, no "locked-by-time" states, no settlement-workflow states.

### Screen 1 — Order Composer (HERO)
- Fixed menu, tap-to-add, quantity stepper, per-item note, optional "for <Name>" line, persistent live subtotal in thumb zone.
- States: default/active editing; your-order-summary; loading menu; empty (no items configured); error/offline → retry; **closed → read-only** (your submitted order shown, not editable).

### Screen 2 — Live Session / Roster + Close
- "**14 in**" presence indicator; everyone's orders shown openly; prominent **Close & aggregate** button available to any user.
- States: active session with roster; loading; **nobody ordered yet** (roster empty, Close disabled or warns); error/offline → retry; closed → read-only.

### Screen 3 — After Close: Result
- Three stacked outputs: **(a)** vendor order block + Copy button; **(b)** per-person totals with items + delivery split shown transparently; **(c)** paid/unpaid checklist.
- States: result rendered; copy-success confirmation; loading aggregate; error/offline → retry; this screen IS the closed/read-only end state (no re-opening workflow, no settlement states).

### Screen 4 — Setup / Admin (light)
- Per restaurant: **name**, **fixed delivery fee**, **item list (name + price)**. That is the entire admin — no categories, no scheduling, no vendor CRUD beyond this (1–2 fixed restaurants only). Editable by anyone, rarely touched.
- States: view/edit restaurant; add/edit/remove item rows; loading; empty (no restaurant yet); save error/offline → retry.

### Screen 5 — Empty / Edge
- **No session yet → big, inviting "Start breakfast"** (pick restaurant only if there are 2). This is the **daily auto-reset fresh-session** entry point.
- **Nobody ordered yet** in an open session.
- **Closed session = read-only** recap.
- States: each of the above, plus loading and error/offline → retry.

---

## ART DIRECTION (opinionated)

- **Mood:** fast, calm, warm — a **morning ritual**. Distinctive and memorable; a clear visual point of view (consider a warm, earthy/sunrise-leaning palette, real type personality, subtle texture or motif — NOT flat Inter-on-white).
- **Mobile-first & phone-perfect:** designed for a phone held one-handed. **Primary actions live in the thumb zone.** Generous tap targets.
- **Speed feel:** instant, low-friction, no ceremony. Tap-and-done.
- **Motion:** use it meaningfully — most of all on the Close reveal (messy picks → one tidy order). Calm, not flashy. Respect `prefers-reduced-motion`.
- **No payment/checkout UI. No dark patterns, no upsells, no gamification, no notifications nagging.**

### Accessibility — WCAG 2.1 AA as ACCEPTANCE CRITERIA (not optional)
- Color contrast meets AA.
- Interactive targets **≥44px**.
- Full **keyboard** operability with **visible focus** states.
- Proper **screen-reader labels** (steppers, toggles, Copy button, roster count, totals).
- **Status conveyed by icon + text, never color alone** (e.g. paid/unpaid).

---

## DELIVERABLE / OUTPUT SPEC

Produce a **runnable React + TypeScript + Tailwind** prototype:

1. **Design-token layer FIRST.** Define color, type scale, spacing, radius, elevation, and motion tokens before building components; all components consume tokens (no hard-coded magic values).
2. **A dev STATE-SWITCHER** (visible control panel) that can reach **every screen AND every state** listed above — including all loading / empty / error-offline / closed-read-only states. This is how the work is reviewed.
3. **Components** built mobile-first from the tokens.
4. **Realistic Egyptian-breakfast SEED DATA:**
   - Menu items with prices, e.g. **foul, ta'ameya (falafel), fries sandwich, cheese sandwich, tea, Turkish coffee** (plus a few more), each with a price.
   - **~15 colleague names.**
   - **One mid-flow OPEN session** (people already in, varied orders, some with notes, at least one "for <Name>" on-behalf line — and that on-behalf line must NOT add a delivery head).
   - **One CLOSED session** whose per-person totals **including the delivery split sum EXACTLY to (items grand total + delivery fee)** — verify the arithmetic, including the remainder rule (leftover smallest-units distributed one-by-one).
   - A few people already marked **paid**, others **unpaid**.
5. **A short DESIGN RATIONALE** (a few paragraphs): the chosen visual direction, how it escapes the generic SaaS look, the new signature element, and the key mobile/accessibility decisions.
6. **A SELF-CHECK list** the build must pass:
   - **Mariam-style speed check:** a returning colleague can open the link, tap their items, and be done in **≤15 seconds**.
   - **Rotating-coordinator check:** a first-timer can close & aggregate with **one obvious button**, no training, no permissions.
   - **Money-discipline check:** there is **NO checkout/payment UI**, and per-person totals (items + delivery split) **sum EXACTLY** to (items grand total + delivery fee), with the delivery denominator = number of submitters (on-behalf lines never add a head).
   - **Accessibility check:** AA contrast, ≥44px targets, keyboard + visible focus, SR labels, status by icon + text not color alone.
   - **Anti-pattern check:** none of the FORBIDDEN items are present; no timer/countdown anywhere; payment is a paid/unpaid checklist only.

---

## GUARDRAILS (do not add anything the spec cut)

Do **NOT** build: auto-lock / countdown / scheduler; ledger / mark-paid→confirm / waive / balances / settlement; AI or free-text aggregation; vendor-management CRUD, menu categories, or session scheduling; "save my usual"/favorites; notifications, real-time/SSE/websockets, audit log, multi-office, or role-based hiding of others' orders; and do NOT add per-fed-person delivery heads (the "count each fed person" split variant is deferred, not MVP — denominator is submitters only).

Build **only** what is specified above — and make it feel like a warm, fast, unmistakably hand-crafted morning ritual.
