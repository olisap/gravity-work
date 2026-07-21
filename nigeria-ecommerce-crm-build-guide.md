# Build Guide: Nigeria-Focused E-Commerce CRM

## 0. Purpose of This Document

This is a specification and build guide, not a code repository. It describes
**what** to build and **why**, so that implementation decisions (frameworks,
libraries, file structure) can be made by whoever/whatever is building it,
while staying true to the business logic described here. Treat every section
below as a requirement to satisfy, not a suggestion.

---

## 1. Product Context

This CRM is for a **single Nigerian merchant** running an ad-driven,
COD-heavy (cash-on-delivery) e-commerce business — typically acquiring
customers through Facebook/Instagram/TikTok ads that link to a landing page
with an embeddable order form. It is **not** a multi-tenant SaaS platform
(yet) and **not** a full shopping-cart storefront. The core workflow is:

```
Ad click → Embedded order form → Draft Order (if abandoned) or Pending Order
    → Confirmation call by staff → Awaiting/Cancelled
    → Dispatch → Scheduled
    → Delivered (this is the moment it becomes Revenue) or Cancelled/Returned
```

Two ideas from this workflow must shape the entire data model:

1. **An "Order" being created is not the same as "Revenue."** Revenue is
   only recognized when an order reaches `Delivered`. Dashboards must
   distinguish "Order Amount" (all orders) from "Revenue" (delivered orders
   only) at all times.
2. **Order status is a pipeline with a meaningful default state of Pending,**
   not "Paid/Unpaid." Since most orders are COD, payment status and
   fulfillment status are two separate concerns and should be modeled as
   two separate fields, not conflated into one status enum.

---

## 2. Core Modules

Build these as distinct modules/domains, even if they share one codebase and
database:

1. **Products & Product Categories**
2. **Inventory**
3. **Orders** (including Draft/Abandoned Orders)
4. **Forms** (embeddable order-capture forms)
5. **Notifications** (SMS + Email — receipts and abandonment reminders)
6. **Dashboard/Reporting**
7. **Users & Roles** (merchant, staff, possibly riders — see Section 8)

---

## 3. Data Model

### 3.1 Product Category
- `id`
- `name`
- `parent_category_id` (nullable — support nested categories, e.g. "Home >
  Kitchen > Lunch Boxes")
- `created_at`, `updated_at`

### 3.2 Product
- `id`
- `category_id`
- `name`
- `description`
- `base_price`
- `sku`
- `images[]`
- `has_variants` (boolean)
- `is_active` (boolean — allows disabling a product without deleting it, so
  historical orders still reference it correctly)
- `created_at`, `updated_at`

### 3.3 Product Variant (only if `has_variants = true`)
- `id`
- `product_id`
- `variant_name` (e.g. "Red / Large")
- `attributes` (structured, e.g. `{color: Red, size: Large}`)
- `price_override` (nullable — falls back to product `base_price` if null)
- `sku`
- `stock_quantity`

**Decision needed from stakeholder:** if variants are not needed for
launch, stock can be tracked directly on `Product` instead of on a separate
variant table. Do not build both paths — pick one based on merchant need
and keep the model simple.

### 3.4 Inventory / Stock Movement
Do not just store a single `stock_quantity` number that gets mutated in
place — that makes it impossible to audit discrepancies later. Instead:

- **Stock Item** (either `Product` or `Product Variant`): current
  `available_quantity` (a computed/cached field)
- **Stock Movement** ledger table, append-only:
  - `id`
  - `stock_item_id`
  - `movement_type` (`restock`, `sale`, `order_cancelled_release`,
    `manual_adjustment`, `return`)
  - `quantity_delta` (positive or negative)
  - `related_order_id` (nullable)
  - `note`
  - `created_by_user_id`
  - `created_at`

`available_quantity` is derived by summing movements (or maintained as a
cached counter that is validated/reconciled against the ledger
periodically). This ledger is what lets the merchant later answer "why did
my stock go from 50 to 12" without guessing.

**Stock reservation rule:** when an order moves to `Pending`, do **not**
deduct stock yet (many pending orders get cancelled after the confirmation
call). Deduct stock only when an order reaches `Scheduled` or `Delivered`
(pick one consistently — recommend deducting at `Scheduled`, since that's
when the item physically leaves for dispatch, and reversing/restoring stock
if a scheduled order is later cancelled/returned).

### 3.5 Order
- `id`
- `order_number` (human-readable, sequential or prefixed, e.g. `OLI-10234`)
- `customer_name`
- `customer_phone` (required — this is the primary contact channel)
- `customer_email` (optional)
- `delivery_address`
- `state`/`region` (Nigerian states — needed for delivery-fee logic and
  regional reporting, matches the "Nigeria" filter seen in the reference
  dashboard)
- `items[]` (each: `product_id`, `variant_id` nullable, `quantity`,
  `unit_price_at_time_of_order` — always snapshot price at order time, never
  read live product price for historical orders)
- `subtotal`
- `delivery_fee`
- `total_amount`
- `status`: enum — `Draft` (abandoned form), `Pending`, `Awaiting`,
  `Scheduled`, `Delivered`, `Cancelled`
- `payment_method`: enum — `COD`, `Paid Online` (leave room for this even if
  online payment isn't in launch scope)
- `payment_status`: enum — `Unpaid`, `Paid`, `Refunded` (kept separate from
  fulfillment `status`, per Section 1)
- `source`: where the order came from (`form:<form_id>`, `manual`, etc.) —
  needed for attributing orders back to specific ad campaigns/forms
- `assigned_staff_id` (nullable — who is handling confirmation/dispatch)
- `confirmation_call_notes` (free text — staff log confirmation attempts
  here)
- `resume_token` (unique, only relevant while status = `Draft` — used for
  abandonment reminder links, see Section 6)
- `last_activity_at` (updated every time the draft form is touched — used
  to time reminder sends)
- `form_step_reached` (which step of a multi-step form the customer got to
  — used to personalize reminder copy)
- `upsell_items[]` (nullable — items added via an upsell offer, distinct
  from the original `items[]` the customer chose; see Section 10)
- `upsell_source` (nullable — which upsell offer/channel added the extra
  item: `form_bump`, `confirmation_call`, `post_delivery_sms`, etc.)
- `created_at`, `updated_at`, `delivered_at` (nullable — this timestamp is
  what actually drives Revenue reporting)

**Status transition rules to enforce in application logic (not just as a
free enum):**
- `Draft → Pending`: happens automatically on full form submission
- `Pending → Awaiting` or `Pending → Cancelled`: happens after staff
  confirmation call
- `Awaiting → Scheduled`: happens on dispatch
- `Scheduled → Delivered` or `Scheduled → Cancelled`: happens on
  delivery/failed delivery
- Any status can move to `Cancelled` except `Delivered` (a delivered order
  that needs reversal should be a `Return`, tracked separately, not a status
  flip — see Section 3.6)
- Disallow illegal jumps (e.g. `Draft → Delivered`) at the application layer

### 3.6 Returns (optional but recommended even for v1)
- `id`, `order_id`, `reason`, `restocked` (boolean), `refund_amount`,
  `created_at`
- A return does not delete/alter the original delivered order (preserve
  history) — it's a separate record that, when processed, creates an
  offsetting stock movement and can reduce reported revenue in a
  "Net Revenue" metric distinct from "Gross Revenue."

### 3.7 Form
- `id`
- `name` (internal reference name)
- `linked_product_ids[]` or `linked_category_id` (what this form is selling
  — could be a single-product landing page form or a general order form)
- `fields_config` (structured definition of steps/fields — keep this
  data-driven/configurable rather than hardcoded per form, so the merchant
  can build new forms without a developer)
- `embed_key` (public token used in the embed snippet/iframe URL — does not
  expose internal IDs)
- `is_active`
- `created_at`, `updated_at`

### 3.8 Users & Roles
See Section 8.

---

## 4. Orders Pipeline & Dashboard Requirements

Reproduce the reporting structure implied by the reference dashboard, since
it maps directly onto the status pipeline:

- **Total Orders (Amount)**: sum of `total_amount` across all non-Draft,
  non-Cancelled orders in a period, plus a count of orders
- **Total Revenue**: sum of `total_amount` for `Delivered` orders only,
  minus processed Returns
- **Expected Revenue**: sum of `total_amount` for orders currently in
  `Awaiting` + `Scheduled` (i.e., likely to convert to Revenue soon)
- **This Week's Summary / Last Week's Summary**: breakdown of order count
  and amount by status (`Delivered`, `Awaiting`, `Pending`, `Scheduled`,
  `Cancelled`), each shown as count, amount, and % of total — matching the
  reference screenshot's per-status rows
- **Best Sellers**: top products by order count (or quantity sold) over a
  selectable period
- Support a **date-range toggle** (This Week / Last Week, extendable to
  custom ranges) and a **region/state filter** (mirrors the "Nigeria"
  dropdown in the reference — likely a state-level filter within Nigeria
  rather than a country selector, since this is a single-country product)

---

## 5. Embeddable Order Forms

### 5.1 Requirements
- Forms must be embeddable via a lightweight `<script>` snippet or `<iframe>`
  on external landing pages (outside the CRM's own domain) — this is
  non-negotiable since the whole acquisition funnel depends on it
- Multi-step is preferred over one long form (higher completion rates on
  mobile): typical order is Product/Variant selection → Quantity → Contact
  Info (name + phone first, since that's the highest-value data) → Delivery
  Address → Submit
- On every step transition (not just final submit), persist form state to
  the backend as a `Draft` order (create on first meaningful input, update
  on each subsequent step) — this is what powers abandonment reminders in
  Section 6
- Mobile-first design is mandatory — assume most traffic is from Instagram/
  Facebook in-app browsers on Android devices, often on slow connections.
  Keep the embed script small and defer non-critical assets.
- Validate Nigerian phone number formats specifically (handle `0801...`,
  `+234801...`, `234801...` input variants and normalize to one stored
  format)
- On final submission, transition the `Draft` order to `Pending` and clear
  the `resume_token`/stop further reminder eligibility

### 5.2 Anti-spam/duplicate protection
Since Nigerian order-form spam and duplicate submissions are common (bots,
or the same customer submitting twice), add:
- Rate limiting per IP/device on the embed endpoint
- Duplicate detection: flag (not block) new orders that share the same
  phone number + product within a short window, surfaced to staff during
  the confirmation-call step rather than silently rejected

---

## 6. Abandoned Form Reminders

This is a core differentiator to build well. Logic:

### 6.1 Trigger conditions
- A `Draft` order exists with `customer_phone` present (phone is captured
  early in the form) and at least one additional field beyond phone
- No further activity (`last_activity_at`) for **10–15 minutes**
- The draft has not already received a reminder (track `reminder_sent_at`)
- The draft has not since converted to `Pending`

### 6.2 Reminder content rules
- Personalize based on `form_step_reached` — e.g., if they dropped after
  choosing a product but before quantity, say "you were about to order
  [Product] — finish in 30 seconds"; if they dropped at address, say "we
  just need your delivery address to complete your order"
- Include a link back to the form **pre-filled** via the `resume_token`
  (append as a query param, e.g. `?resume=<token>`), so the customer
  doesn't have to re-enter anything
- Keep SMS templates under 160 characters (1 segment) wherever possible —
  avoid emojis/smart quotes, which push messages into Unicode encoding and
  double the segment cost
- Send at most **one reminder** per draft for launch; a second follow-up
  can be added later behind a setting, not by default (avoid feeling spammy)

### 6.3 Cleanup
- Auto-archive/expire `Draft` orders with no activity after a configurable
  period (e.g. 7 days), so they don't clutter dashboards or skew counts.
  Archived drafts should remain queryable for analytics (conversion rate =
  Pending+ orders / total Drafts created) but excluded from default views.

### 6.4 Channels for launch
- **SMS and Email only** for now (per current scope) — no WhatsApp yet, but
  design the notification service (Section 7) so a WhatsApp channel can be
  added later without restructuring.
- Send SMS as primary if phone is present; send email in parallel if an
  email address was also captured. Do not make email the only channel —
  many customers won't have provided one.

---

## 7. Notification Service (SMS + Email)

Build this as a **single internal service**, not two separate ad-hoc
integrations, since both abandonment reminders and delivery receipts (and
future WhatsApp/marketing sends) will reuse it.

### 7.1 Structure
- A `NotificationTemplate` concept: named templates (`draft_reminder`,
  `order_confirmed_receipt`, `order_delivered_receipt`, etc.) with
  placeholder variables (`{{customer_name}}`, `{{product_name}}`,
  `{{resume_link}}`, etc.)
- A `NotificationJob` queue: events (order delivered, draft abandoned, etc.)
  enqueue a job referencing a template + recipient + channel; a worker
  process sends it and records the result (`sent`, `failed`, `delivered` if
  the provider supports delivery callbacks)
- Retry logic with backoff for transient provider failures; do not retry
  indefinitely — cap attempts and mark as `failed` after N tries

### 7.2 Provider selection (cost-optimized for Nigeria)
- **SMS**: use a Nigeria-focused local aggregator rather than an
  international gateway (international gateways like Twilio are
  significantly more expensive per SMS for Nigerian numbers and can have
  worse local-network deliverability). Evaluate **Termii** first — it has
  transactional-tier pricing (typically cheaper than bulk/promotional
  pricing) which fits both receipts and reminders, plus a documented API
  and room to add WhatsApp later through the same account. Compare against
  other local aggregators (e.g. Africa's Talking, Kudisms,
  SmartSMSSolutions) on a per-segment cost and delivery-rate basis before
  committing — pricing changes often, so verify current rates rather than
  assuming.
- **Email**: use a transactional-email-friendly provider with a workable
  free/low tier — **Brevo** (generous free tier, doubles as future marketing
  email tool) or **Zoho ZeptoMail** (very cheap pure-transactional,
  pay-as-you-go) are good starting candidates. Avoid a raw
  self-managed SMTP/SES setup for launch — domain reputation management is
  not worth the overhead this early.
- Store provider credentials/config so the provider can be swapped later
  without touching call sites — the rest of the app should call
  `NotificationService.send(...)`, never a specific provider SDK directly.

### 7.3 Events that must trigger a notification
- Draft order abandoned (reminder) — SMS + email if available
- Order moves to `Pending` (optional acknowledgment: "we received your
  order")
- Order confirmed (`Awaiting`) — optional
- Order `Scheduled` for delivery — "your order is on its way" (recommended,
  reduces failed-delivery/refused-at-door rates)
- Order `Delivered` — this is the **receipt**: order number, items,
  amounts, delivery address, date. This should be sent automatically the
  moment status flips to `Delivered`.
- Order `Cancelled` — optional, but good practice for transparency

---

## 8. Users & Roles

Even for a single-merchant install, expect at least these roles:

- **Owner/Admin**: full access, sees all financials, manages settings/forms/
  products
- **Confirmation Staff**: sees `Pending` orders, can call customers, add
  `confirmation_call_notes`, move to `Awaiting`/`Cancelled`. Should not
  necessarily see full revenue/profit reporting.
- **Dispatch/Logistics**: sees `Awaiting`/`Scheduled` orders, marks
  `Delivered`/`Cancelled` on return from delivery run
- (Optional, later) **Rider**: mobile-friendly view of just their assigned
  deliveries for the day

Build role-based permission checks at the API layer, not just hidden UI —
staff accounts should not be able to fetch financial data via direct API
calls even if the UI doesn't show it to them.

---

## 10. Upsell

Three distinct moments in this pipeline are natural upsell opportunities.
They are different in mechanism and should be treated as three features,
not one generic "upsell" toggle.

### 10.1 Order-form bump (pre-submit upsell)
- On the final step of the form (after product/quantity, before or
  alongside the submit button), show a single low-friction add-on offer
  tied to the product(s) already selected — e.g. a customer ordering the
  Insulated Lunch Box is offered a matching water bottle at a discounted
  add-on price.
- Model as an `UpsellOffer`:
  - `id`
  - `trigger_product_id` / `trigger_category_id` (what the customer must
    have selected for this offer to show)
  - `offer_product_id`
  - `offer_price` (can differ from the product's normal price — this is
    usually a discounted bundle price)
  - `display_copy` (short line, e.g. "Add a Spin Mop for ₦2,000 more")
  - `is_active`
  - `priority` (if multiple offers could match, show only the
    highest-priority one — do not stack multiple upsell prompts on one
    form, it hurts completion rate)
- Accepting the bump adds a line to the order's `items[]` at submit time
  (do not create a second order) and tags `upsell_source = form_bump` on
  the order.
- Keep this to **one offer, one click** (a single checkbox or "Yes, add
  it" button) — do not build a multi-item upsell cart into the order form
  itself; that adds friction exactly where you're trying to reduce it (see
  Section 6, abandonment).

### 10.2 Confirmation-call upsell (staff-driven)
- When staff call to confirm a `Pending` order (Section 1's confirmation
  step), the CRM should surface any active `UpsellOffer` matching the
  order's existing items directly on the order detail screen staff are
  looking at — a short suggested line for the call script, e.g. "Ask if
  they'd like to add X for ₦Y."
- Give staff a one-click "Add upsell to this order" action right there,
  which updates `items[]`, recalculates `total_amount`, and tags
  `upsell_source = confirmation_call`.
- This is manual/human-driven by design — Nigerian COD sales convert
  better with a real phone conversation than with automation at this
  stage, so don't try to fully automate this step; just make it fast for
  staff to act on.

### 10.3 Post-delivery upsell / repeat-purchase nudge (automated)
- Some time after an order reaches `Delivered` (e.g. 5–10 days later,
  configurable — long enough that the customer has used/received the
  product, short enough that they still remember the brand), send a
  low-pressure SMS/email offering a complementary product or a discount on
  a repeat order.
- Reuse the **Notification Service** (Section 7) for this — it's the same
  send/template/queue mechanism as receipts and reminders, just a
  different trigger (`X days after delivered_at`) and a different template
  (`post_delivery_upsell`).
- Include a link that goes to a **pre-filled order form** for the offered
  product (reuse the `resume_token`/pre-fill mechanism from Section 6.2,
  generalized: it should work for "resume an abandoned draft" and "start a
  new pre-filled order" from the same underlying mechanism).
- Track conversion: tag any resulting order with `upsell_source =
  post_delivery_sms` and `source` referencing the specific offer, so the
  merchant can see which post-delivery offers actually drive repeat
  orders.
- Do not send this to customers whose order was `Cancelled` or returned —
  only genuinely delivered, kept orders.

### 10.4 Reporting
Add upsell performance to the dashboard reporting (Section 4), broken out
by `upsell_source`:
- Attach rate (% of eligible orders that included an upsell item)
- Incremental revenue from upsells (sum of upsell line items' value,
  separate from base product revenue, still counted within `Delivered`
  orders only per the Revenue rule in Section 1)
- Compare conversion rate of `form_bump` vs `confirmation_call` vs
  `post_delivery_sms` so the merchant can see which channel is worth
  investing more staff time/SMS budget into.

---

## 11. Build Order / Milestones

Recommended sequence so there's a usable product at each stage rather than
everything half-built at once:

1. **Products, Categories, Inventory (basic, no variants yet)** — get the
   catalog and stock ledger right first, since orders depend on it
2. **Orders + manual order creation** (staff can create an order directly in
   the CRM, no public form yet) — validates the status pipeline and
   dashboard math before adding public-facing complexity
3. **Dashboard** — Order Summary, Revenue vs Expected Revenue, weekly
   summaries, Best Sellers — build against real (even if manually entered)
   order data
4. **Embeddable public order form** (single-step first, without draft
   persistence) — get the acquisition funnel working end-to-end
5. **Draft/abandonment tracking + resume tokens** — layer onto the existing
   form once the base form works
6. **Notification service + delivery receipt** (SMS/email) — hook into the
   `Delivered` status transition
7. **Abandonment reminder job** — reuse the notification service built in
   step 6
8. **Multi-step form + variants** (if needed) — upgrade once the simple
   version is proven
9. **Roles/permissions refinement, Returns, region filters, reporting
   polish**
10. **Upsell** (form bump → confirmation-call surfacing → post-delivery
    automated nudge, in that order) — layer on last, since it depends on
    the order pipeline, staff workflow, and notification service all
    already working (Sections 10, plus the pieces it reuses from 6 and 7)

---

## 12. Open Decisions to Confirm Before/During Build

These were flagged during planning and should be explicitly settled (either
by the merchant or a reasonable documented default) before or during
implementation, not left ambiguous in code:

1. Product variants at launch or product-level stock only?
2. Deduct stock at `Scheduled` or at `Delivered`? (Guide recommends
   `Scheduled`.)
3. Single reminder only, or allow a configurable second follow-up later?
4. Which SMS/email providers specifically, based on current pricing checked
   at build time (rates change — don't hardcode an assumption from this
   document without verifying)?
5. Do staff/dispatch roles need mobile app access, or is a responsive web
   view sufficient for launch?
6. Delivery fee: flat rate, or calculated by state/region? This affects the
   `Order` model and the form's step sequence (may need to show delivery
   fee before final submit once address/state is known).
7. How many upsell offers can be active per product at once, and who
   configures them — is `UpsellOffer` management a merchant-facing settings
   screen from launch, or hardcoded/manually seeded to start and given a UI
   later?
8. What's the default post-delivery upsell delay (Section 10.3)? Guide
   suggests 5–10 days as a starting point, but this should be a merchant
   setting, not a hardcoded constant.
