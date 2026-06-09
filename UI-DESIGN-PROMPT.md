# ROLE & OBJECTIVE

You are a senior product designer and frontend engineer with a strong, opinionated visual point of view — the kind who ships interfaces that feel authored by a human with taste, not assembled from a default component library. Design and build the complete frontend for **MorningCart**, an internal mobile-first PWA for daily group breakfast ordering at a company. Deliver a runnable, navigable, high-fidelity prototype: every screen and every state below must exist and be reachable. This is a build, not a moodboard.

The single most important art-direction instruction: **escape the generic "AI-generated SaaS" look.** If the result could be mistaken for a default Tailwind starter, a Vercel template, or any of the ten thousand purple-gradient dashboards, you have failed. Have a point of view and commit to it.

---

# PRODUCT IN ONE BREATH

MorningCart replaces the morning WhatsApp/Slack/phone scramble where one rotating volunteer manually collects everyone's order, does per-person arithmetic by hand, and chases payments. Each weekday, one shared **OrderSession** opens for an (office, vendor, date) against a price-frozen, admin-curated menu. Each person edits **exactly one Order** (an upsert — editing replaces, never appends; duplicates are structurally impossible), watches a live subtotal, and submits before a hard **Cutoff**. At Cutoff the session **auto-locks** and the app deterministically produces two artifacts: a clean, pasteable **Aggregate** for the vendor and a per-person **Tally** computed to the cent. Anyone allowlisted presses **Place** (the order is sent out-of-band — there is no vendor integration). Money owed is tracked on a transparent, track-only **Ledger**, settled socially.

## Non-negotiable product truths (internalize these or the design fails)
1. **The mission is to DELETE the "breakfast coordinator" role, not to tool it.** Sessions run on schedule; aggregation and per-person math are automatic. The only human action left in a perfect run is pressing "Place." If your UI implies a human is doing logistics, math, or chasing people, you've missed the point.
2. **The median experience is a sub-15-second, tap-and-done morning ritual.** Speed and calm beat features. Optimize relentlessly for the passive majority who touch almost nothing most days.
3. **It tracks money; it never MOVES money.** There is NO checkout, NO card UI, NO wallet, NO "pay now," NO payment processor. "Mark Paid" is a timestamped social *claim*, not a transaction. Build no UI that implies funds move through the app.
4. **It is internal tooling among colleagues who trust each other** — warm, not corporate; quietly confident, not flashy. Settlement is impersonal and never confrontational. Never render money in a way that makes it awkward between colleagues.

---

# PERSONAS — DESIGN FOR THE PASSIVE MEDIAN FIRST (priority order)

When personas conflict, **Mariam wins.**

1. **Mariam "The Usual" — THE primary user.** Software engineer; orders a near-identical breakfast most mornings; one hand, in the hallway, ~9:05am. Wants to be **done in seconds with near-zero attention**. ~90% of days she touches nothing but a confirm. She is why "≤2 taps to add an item" is law. **The hero screen lives or dies on her ritual being brutally fast.**
2. **Tarek "The Reluctant Coordinator."** Rotates into the coordinator role episodically — intense for 15 minutes, then dormant for weeks, so he **re-learns it every time**. Ideal day: open the session, let it auto-aggregate, **press one button — "Place" — and touch nothing else.** Near-zero learning curve.
3. **Karim "The Settle-Up Skeptic."** Slow payer; settles in weekly/monthly batches. Cares about **one thing: an accurate running balance he can trust**, glanced at occasionally, with no public shaming. Lives in the balance view, not the daily detail.
4. **Salma "The Operator" — admin/buyer.** Office manager; curates vendors, menus, prices, the recurring schedule. Power user, low frequency, high stakes, mostly on a laptop, behind the morning rush. Her surface may be lower-fidelity/utilitarian — but still calm, legible, and part of the same system.

---

# CORE OBJECTS & LIFECYCLE (use these terms exactly)

- **OrderSession** — one per (office, vendor, date); hard `cutoff_at`. Status: **open → locked → placed → delivered/reconciled**, plus terminal **cancelled**. A derived **closing-soon** urgency state exists while open and near cutoff.
- **Order** — exactly ONE per person (upsert; editing replaces, never appends). Cancellable before lock.
- **OrderItem** — menu item × quantity (1–10) + optional free-text note ("no sugar," "oat milk"). Price snapshotted at order time.
- **MenuItem** — name, price (frozen at session open), availability; grouped by **MenuCategory** (e.g., "Hot Drinks," "Sandwiches").
- **Aggregate** — coordinator-only, generated at lock: every item rolled up by total quantity with notes preserved (e.g., "Latte ×4 — 2× oat milk, 1× no sugar"), grouped by category, plus grand total, as ONE pasteable text block.
- **Tally** — per-person breakdown at lock: itemized lines + subtotal + equal fee share + total. Σ(per-person totals) === grand total exactly. "Show the math," never a black box. An optional `delivery_fee` splits equally per submitting head; the remainder cent is assigned deterministically (to the session creator) and shown, never silently dropped.
- **Ledger / Payment / Balance** — per-person running balance across sessions. Two-step settlement: **Mark Paid** (payer self-claim, timestamped) → **Confirm** or **Waive** (coordinator). No one is ever blocked from ordering over an unpaid balance.
- **Vendor** — external; never logs in; has phone, optional `min_order_total`, notes.
- **Sender allowlist** — anyone allowlisted can press Place (kill-switch against the coordinator being a single point of failure).

**Authz:** members never see others' itemized orders; the Aggregate, the full Tally, and the grand total are coordinator-only.

---

# ART DIRECTION — THE CENTER OF GRAVITY (be opinionated)

**Desired feeling:** fast, calm, warm, quietly confident — a *pleasant morning ritual* that mostly gets out of the way. It should feel like a good cup of coffee in early light, not an enterprise dashboard and not a flashy food-delivery app. The dominant emotion on the hero screen is **relief and ease** — "oh good, it's handled" — not stimulation or appetite.

**Commit to a governing concept, then let it discipline a hundred small decisions.** Decide what MorningCart "feels like" as if it were a place or object (a quiet café before the rush, a warm kitchen, a chalkboard menu, a folded morning newspaper). State your choice in one or two sentences and let it genuinely shape type, color, texture, motion, and copy voice — not as a tagline pasted on top.

Make real, defensible decisions in each area:
- **Color** — a palette with real temperature and personality rooted in morning warmth (warm off-whites/creams, ink-not-pure-black text, a single confident accent that *means* something — e.g., "the action" or "time running out"). Earn contrast; avoid muddy mid-greys. Genuinely usable in bright morning light on a phone. A coherent low-light/dark variant for the early hour is welcome.
- **Typography** — your strongest personality lever; use it boldly. A distinctive display/heading face paired with a highly legible UI/body face, on a real type scale. **Money and time are the emotional anchors** — give the running subtotal, grand total, and countdown large, confident, crafted numerals.
- **A signature element carried across screens** — e.g., a distinctive treatment of the countdown-to-cutoff, the live subtotal, and the session-status indicator. The countdown must create *gentle, humane momentum*, never bomb-timer anxiety.
- **Motion** — fast, optimistic, sub-150ms feedback on taps; gentle transitions; satisfying-but-restrained feedback for the load-bearing moments (add item, subtotal change, submit, lock). Never bouncy, gamified, or attention-seeking. Respect `prefers-reduced-motion`.
- **Texture & detail** — depth via restraint: purposeful spacing, hairlines, soft warm shadows, rhythm. A few coherent, well-chosen details (a grain, a paper edge, a considered empty-state illustration, a distinctive icon stance) over heavy borders or busy cards.
- **Copy voice** — warm, human, brief, quietly witty where it earns it; like a considerate colleague, never corporate, never cute-to-annoying. All money/settlement copy is impersonal and dignified.

## FORBIDDEN anti-patterns (do NOT produce)
- The default AI/SaaS look: generic purple/indigo/blue gradients, a centered marketing hero with a big headline, lifeless equal-weight card grids, Inter-on-white-with-a-blue-button blandness, geometric-sans-for-everything, glassmorphism for its own sake, neon dark-mode dashboards.
- Consumer food-delivery energy: hero food photography, "Add to cart" vibes, upsells/cross-sells, "you might also like," ratings, streaks, badges, confetti spam, emoji-as-icons.
- Any checkout, payment, card-entry, or "pay now" UI of any kind.

Constraint on art direction: it must never fight legibility, tap-speed, or accessibility. Warmth comes from type, color, copy, and spacing — not clutter or slow ornament.

---

# SCREENS & STATES TO BUILD (priority order — this is the spec)

Build each screen AND every enumerated state, all reachable via a top-level dev menu / state-switcher (do not bury states in hard-to-reach flows). For every screen, also implement its **loading (skeleton)**, **empty**, and **error/offline-retry** states even where not separately listed. Annotate each screen with the persona + journey it serves and the one key design decision you made for them.

**Spend your best energy on Screen 1. Better to ship fewer screens at hero quality than all screens at template quality.**

### Screen 1 — TODAY / Order Composer (THE HERO)
The open session: header with vendor name, session status, and the **live countdown to Cutoff**; a short, scannable curated menu grouped by category; tap-to-add with a quantity stepper (1–10) and optional per-item free-text note; a persistent, always-visible **live running subtotal**; and a single, large, thumb-zone submit. Include a clearly-labeled **"repeat my usual"** affordance (a planned one-tap shortcut; in MVP the fast path is re-pick from the menu, so the menu itself must be frictionless). Subtotal and countdown never scroll out of view.
**States:** a. open/composing · b. item added (optimistic, instant local feedback before server confirm) · c. fat-finger guard (confirm dialog when a single line qty > 5) · d. submitting (optimistic, non-blocking, never premature success) · e. **submit failed/offline — explicit "Not submitted — retry," draft preserved, NEVER a false success** · f. submitted/confirmed (calm, "locked in," "you can still edit until Cutoff") · g. closing-soon (heightened-but-calm urgency + gentle nudge; warn before the trap) · h. item marked sold-out mid-session (affected line shows "swap or drop").

### Screen 2 — Submitted & Locked / Post-Cutoff states
Your order summary, your **per-person tally** (itemized lines + subtotal + fee share + total), and the status badge as it advances.
**States:** a. submitted, still open (editable, "edit until Cutoff") · b. locked (read-only "Order closed / sent to coordinator"; finalized tally to the cent) · c. placed ("Order placed — on its way" + your amount due; settlement entry point appears) · d. delivered · e. **too late** (arrived after Cutoff — read-only "Ordering closed — ping the coordinator"; no silent accept, no dead end; explain what to do) · f. post-delivery "not received" adjustment (item dropped from tally, amount due reduced, noted as the only post-place money edit).

### Screen 3 — Coordinator View (Tarek: touch nothing but Place)
Coordinator-only. The auto-aggregated **pasteable vendor order** with a prominent **Copy**; a **live grand-total preview** while open (labeled non-final until lock); a vendor `min_order_total` indicator; a **delivery-fee** input; the per-person breakdown; and the single, unmissable **Place order** action. Legitimate in-flight actions are few: set fee, mark item sold-out, close early — then Place. Nothing implies manual math or manual chasing.
**States:** a. open, orders trickling in (grand total climbing; below/at/above vendor minimum indicated) · b. locked — Aggregate frozen & ready to copy (the pasteable block is the star; Place is primary) · c. below vendor minimum at lock (non-blocking warning; Sender decides) · d. placed (settlement board becomes the focus) · e. copy success (clear "copied" feedback).

### Screen 4 — Settlement / Balances (Karim's home; impersonal by design)
A personal **running balance** front and center ("this period you owe the pool $X" / "you're square"), built for batch settling; a per-session settlement list; the **Mark Paid** self-claim and (coordinator) **Confirm** / **Waive** controls. Tone is neutral and pool-oriented; nudges are impersonal; never confrontational. No "pay now," no money movement.
**States:** a. unpaid balance (neutral, not alarming) · b. marked paid (timestamped, awaiting confirm) · c. confirmed (square) · d. waived (shown plainly) · e. square/zero (calm "all settled" empty state) · f. coordinator settlement board (payers + status by icon+text, Confirm/Waive, no arbitration UI) · g. period view (weekly/monthly batch summary for Karim).

### Screen 5 — Session Status / Lifecycle Surfaces
The shared status indicator (open → closing-soon → locked → placed → delivered, plus cancelled) rendered consistently everywhere it appears, plus notification-style confirmations for: session opened, deadline approaching, session closed / order sent. Demonstrate your signature status treatment across these.

### Screen 6 — Admin (Salma) — may be LOWER-FIDELITY / utilitarian
Vendor management (name, phone, min_order_total, active toggle, notes); menu/category/price management with a sold-out/availability toggle; recurring-session scheduling (office timezone, default cutoff time, weekday schedule). Calm, dense, functional; coherent with the design system. Must clearly communicate the **price-freeze rule** (a price edit affects the NEXT session, never an in-flight one).

### Screen 7 — Edge & Empty States (first-class; build as their own demonstrable views)
a. no session today ("No breakfast session yet" + a low-ceremony "open one" — opening must not feel like a coordinator job) · b. zero orders at Cutoff (auto-cancelled, everyone notified, no order sent) · c. exactly one order/solo (sent, with gentle "vendor minimum may not be met" warning) · d. cancelled session (orders voided, clear explanation) · e. vendor no-show / not-received (entry point to the post-delivery adjustment) · f. global offline / flaky-wifi banner (app-wide optimistic/retry posture).

---

# COMPONENT INVENTORY (build as a small, consistent system)

- **CountdownToCutoff** — calm / closing-soon / locked. Large, legible, your signature treatment; never a stress-inducing bomb timer.
- **SessionStatusBadge** — open / closing-soon / locked / placed / delivered / cancelled. **Convey status with icon + text/shape, never color alone.**
- **MenuItemRow** — default / added (with stepper + qty) / has-note / sold-out. ≤2 taps to add.
- **QuantityStepper** — 1–10, large tap targets, with the >5 fat-finger confirm.
- **RunningSubtotal** — persistent, live, animates calmly on change; large confident numerals.
- **OrderLine / TallyLine** — itemized money line, "show the math."
- **AggregateBlock** — the pasteable vendor text, with Copy + copied confirmation.
- **PaymentRow** — unpaid / marked-paid / confirmed / waived (icon + text each).
- **BalanceCard** — neutral running balance.
- **Notification / Toast** — session opened / deadline approaching / closed-and-sent; plus optimistic-failure "retry."
- **OfflineRetryBanner / SkeletonLoaders** — perceived-fast load on flaky wifi.

---

# RESPONSIVE BEHAVIOR

- **Phone-perfect is the bar** (one-handed, thumb-reachable primary actions, the AM hallway use case). Primary submit/Place actions sit in the thumb zone. Test at 360px width; no horizontal scroll at any breakpoint.
- **Tablet/desktop:** coordinator and admin surfaces (Screens 3 & 6) and the settlement board (Screen 4f/g) gracefully use the extra width (e.g., Aggregate and per-person breakdown side-by-side; denser admin tables). The member ordering flow (Screens 1–2, 4) stays a focused single column even on wide screens — do not stretch it into a sparse desktop layout.

---

# HARD CONSTRAINTS & NON-GOALS

- **No payment/checkout/card/wallet UI of any kind. No "pay now." No money movement.** Settlement is track-only and social; "Mark Paid" reads clearly as a claim, not a transaction.
- **No dark patterns, no upsells, no gamified manipulation, no fake/artificial urgency.** Urgency exists only as honest countdown information.
- **Accessibility — WCAG 2.1 AA as acceptance criteria, not aspiration:** text contrast ≥ 4.5:1 (≥ 3:1 large), tap targets ≥ 44×44px, full keyboard operability, visible focus, screen-reader labels on all controls and status; **status conveyed by icon + text, never color alone**; and **no time-trap** that punishes a slow user without a clear prior warning and a graceful "too late, here's what to do" path.
- **Perceived speed on flaky office wifi:** optimistic UI everywhere, skeletons over spinners, explicit recoverable retry on failure, never a false success.
- **One order per person is structurally guaranteed** — never design "duplicate"/"add another order" affordances; editing replaces the single order.
- Land between a flashy consumer app and a sterile enterprise CRUD tool: distinctive, warm, calm, trustworthy.

---

# OUTPUT / DELIVERABLE SPEC

1. **A runnable React + TypeScript + Tailwind prototype** (single-page app; no real backend). Stub the data layer with realistic seeded mock data and simulate live updates and an artificial network-failure case so the optimistic-retry state is demonstrable. Load any chosen fonts.
2. **A top-level dev menu / state-switcher** that makes EVERY screen and EVERY enumerated state directly reachable for review.
3. **A centralized design-token layer first** (color names + hex + contrast notes, type scale, spacing, radii, shadow, motion timing) that proves a real system, then build screens and components against it consistently.
4. **The component inventory above**, with meaningful interactive states (default, active, disabled, loading/optimistic, error/retry, empty, locked/read-only).
5. **Realistic seed data** (believable colleague names, a real-feeling short breakfast menu with categories and prices, a session mid-window with several orders, a tally that actually sums to the grand total with the remainder cent shown, a few outstanding/settled balances). Never lorem ipsum.
6. **A short DESIGN RATIONALE** (a few tight paragraphs or a bulleted list, not an essay): the governing metaphor and how the "morning ritual" arc shows up; your color/type/motion decisions and WHY each is right for THIS product and Mariam specifically; the generic-AI-SaaS anti-patterns you deliberately avoided and what you did instead; one or two bold choices a timid designer wouldn't make, and the trade-off you accepted.
7. **Clean, componentized, readable code.** Comments only where intent isn't obvious.

---

# SELF-CHECK BEFORE YOU CALL IT DONE (verify each; fix any "no")

1. **Mariam test:** From landing on an open session, can a returning user add their usual and submit in ≤2 taps per item, feeling done in under ~15 seconds, with subtotal + countdown always visible?
2. **Tarek test:** Is "Place order" unmistakably the one primary action, with aggregation/math visibly automatic, the Aggregate one-tap copyable, and zero manual-math or manual-chasing UI?
3. **Karim test:** Is an accurate, neutral running balance readable in one glance, settleable in a batch, with "Mark Paid" as a private timestamped claim — and zero "you owe [named colleague]" framing and zero "pay now"?
4. **Money discipline:** Is there genuinely no checkout/card/wallet/payment-movement UI anywhere, and does Σ(per-person tally totals) === grand total in the mock data, with the remainder cent shown?
5. **State completeness:** Are loading, empty, optimistic, error/offline-retry, locked, placed, delivered, cancelled, too-late, zero-order, solo-order, sold-out, and not-received states all built and reachable?
6. **Accessibility:** Contrast, ≥44px targets, keyboard + focus, SR labels, status-by-icon+text — all verified, including in the closing-soon urgency state?
7. **Failure honesty:** Does a failed/offline submit show "Not submitted — retry" with the draft preserved (never a false success), and does the near-cutoff path warn before locking out?
8. **Art direction:** Does it look unmistakably like a warm, calm, confident morning ritual and clearly NOT generic AI SaaS? If you stripped the labels, would it still be recognizable as MorningCart? Name the one signature element you'd point to.
9. **Responsive:** Phone-perfect at 360px with thumb-zone primary actions; coordinator/admin/settlement use desktop width well; member flow stays a focused single column; no horizontal scroll anywhere.
10. **Tone:** Internal-colleague warmth throughout — no upsells, no dark patterns, no gamification, no manipulative urgency; all money copy impersonal and dignified.

Begin by committing to your art direction (governing metaphor, palette, type, signature element) in a few sentences. Then build the design-token layer and components, then the screens and all their states — leading with the TODAY / order composer. Make it distinctive, fast, calm, and correct.