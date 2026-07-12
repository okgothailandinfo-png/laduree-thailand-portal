# Singapore User Flow — Ladurée Pickup Portal

**Source of truth:** https://www.laduree.sg  
**Documented:** 12 July 2026  
**Method:** Derived from live Singapore portal inspection recorded in companion docs; no invented steps, labels, or screens.  
**Rules:** Do not redesign, simplify, or invent. If a step was not verified, it is marked **TODO** / gap — stop and ask before implementing.

| Field | Value |
| --- | --- |
| **Companion docs** | `docs/singapore-ui-audit.md` (screens), `docs/components.md` (UI parts), `docs/design-tokens.md` (tokens) |
| **Primary happy path** | Pick-up: enter → select service/outlet/time → browse → product detail → cart → checkout → pay → tracker |
| **Allowed Thailand diffs** | Outlet name/code, address, hours, last order, availability, THB prices, payment methods, legal only |

---

## Flow overview

```text
[Entry: Home / Category / Recommended / Promotion / About / Allergen]
        |
        | optional browse (ADD opens product detail; service may still be unset)
        v
[Select service, date and time]
        |
        +-- Pick-up --> [Select outlet] --> [Choose Date & Time] --> [Confirm]
        |
        +-- Delivery --> [Postal code] --> [Choose Date & Time] --> [Confirm]
        |
        v
[Browse / search / Recommended / Category]
        |
        v
[Product detail] --> Add to Cart --> [Cart: Item(s) Added]
        |
        | edit qty / notes / Clear items / change Pickup Time / change service
        v
[Checkout] --> Validate cart
        |
        +-- Checkout As Member --> member login / rewards path
        |
        +-- Checkout As Guest --> buyer info (manual or member autofill)
        v
[Select payment option] --> Proceed / PAY
        |
        v
[Payment successful / Order Tracker states]
```

Supporting interruptions (any step): offline banner, slow-load notice, session urgency (complete within 5 minutes), outlet reassignment, unavailable-item removal.

---

## Actors & session context

| Actor | Behavior on Singapore |
| --- | --- |
| Guest | Can browse, build cart, use `Checkout As Guest` |
| Member | Enters via header/mobile `Member?` or `Checkout As Member`; external portal `https://LadureeParis.member.getz.co` (Singapore merchant) |
| System | Validates postal code, slot availability, cart, connectivity; may remove unavailable items before pay |

Session-facing service context (cart / header):

- Service: `Pick-up` or `Delivery`
- Outlet (pickup example verified): `Ladurée Paris (Takashimaya)` / cart address `391 Orchard Road #B1-13/13A, 238872, Singapore`
- Time row label: `Pickup Time` + date/slot or affordance `Select a different date/time`
- Note (header): `Timeslot has been adjusted according to assigned outlet`

---

## Entry points

Customer can land on any of these without completing service selection first.

| # | Screen | URL | Role in flow |
| --- | --- | --- | --- |
| 1 | Home | `/` | Landing, announcement, all category grids, cart rail, service CTA |
| 2 | All Items | `/Category` | Full menu browse |
| 3–8 | Category pages | `/Category/….html` | Single-category browse |
| 9 | Recommended | `/Recommendations` | Chef/patron starred items |
| 10 | Promotions | `/Promotion` | Promo browse (inventory **TODO** if empty snapshot) |
| 11 | About Us | `/Home/Hours` | Informational exit; shared chrome |
| 12 | Allergen Information | `/Home/TermsConditions` | Informational exit from footer |

**Primary CTA into fulfillment setup (shared chrome):** `Select service, date and time`  
**Also triggers service flow:** cart service tabs `Pick-up` / `Delivery` / `Select Other Services`

---

## Stage 1 — Fulfillment setup

### 1.1 Select service

| | |
| --- | --- |
| **Trigger** | `Select service, date and time`; service tabs; `Select Other Services` |
| **Copy (verified)** | `SELECT YOUR DESIRED SERVICE`; `Select Service To Start`; `Pick-up` + `Order & collect` / `no queuing`; `Delivery` + `Served to your` / `doorstep` |
| **Outcome** | Session set toward pickup (`/ShoppingCart/PickUp`) or delivery (`/ShoppingCart/Delivery`) |
| **Next** | Pick-up → outlet; Delivery → postal code |

### 1.2 Pick-up — select outlet

| | |
| --- | --- |
| **Headings** | `Select outlet to Pickup Order` / `Select Outlet To Pickup Order` / `Select the outlet` |
| **Verified outlet row** | `1. Ladurée Paris (Takashimaya)` + address + phone |
| **Actions** | `Select`, `Continue`, `Confirm` |
| **Cart reflection** | Outlet row in cart (`#divPickupMyCart`); edit → select other branch |
| **Thailand** | Replace outlet identity/address/phone/hours with owner-approved Thailand data only |

### 1.3 Delivery — postal code (secondary branch)

| | |
| --- | --- |
| **Heading** | `Please input the postal code for delivery` |
| **Placeholder** | `Delivery location postal code` |
| **Actions** | `Enter`, `Continue`, `Confirm` |
| **Errors (verified)** | `The Postal Code field is required.`; `Postal code is incorrect`; `The postal / address is not available for delivery yet.`; `Wrong postal code or address`; `This address doesn't exist, please try again.` |
| **Next** | Match outlet list / `Start Order` pattern (see components: delivery outlets modal) → date & time |

### 1.4 Choose date & time

| | |
| --- | --- |
| **Headings** | `Choose Date & Time`, `Select Time slot`, `Select Date` |
| **Controls** | Calendar, `More Dates` / `Less Dates`, time dropdown, `Done`, `Confirm` |
| **Cart reflection** | `Pickup Time` + selected window (e.g. `12 Jul 2026 (Today)`, `02:15 PM To 02:30 PM`) |
| **Change loop** | `Select a different date/time` → reopen time modal |
| **Errors / notices** | `This date is not available for pickup` / `… for delivery`; `This date & time is not available for delivery`; `There is currently no valid collect time in this day.`; earliest-slot adjustment / complete-within-5-minutes urgency |

### 1.5 Blockout / ordering window

When online ordering is restricted, blockout messaging applies (verified keys/UI):

- `Blockout Ordering Time`
- `Online ordering for Pickup or Delivery is now available.` (title pattern on Singapore)

Checkout may be disabled during blockout on `/checkout` (**TODO:** dedicated checkout page interaction).

**Exit Stage 1:** Service + outlet (or delivery match) + date/time confirmed → customer returns to browse with cart fulfillment strip populated.

---

## Stage 2 — Browse & build cart

### 2.1 Browse paths

| Path | Behavior |
| --- | --- |
| Home category grids | Six categories with intros + product cards |
| MENU → All Items / category | Same product card pattern |
| RECOMMENDED | Starred items; helper: `Items with star … are recommended by our chef and patrons` |
| Search | Placeholder `Search items` |
| Promotions | Promo surface; card inventory **TODO** if empty |

### 2.2 Product card → detail → cart

```text
[Product card: image / title / price / ADD | Unavailable]
        |
        | click image, title, or ADD
        v
[Product detail modal]
        |
        | modifiers / qty / note (Tap to add note)
        | success: Item is added into cart.
        v
[Cart rail / View Cart]
   Item(s) Added
   qty steppers
   Item(s) Total / Tax
   Checkout (amount + qty)
```

| Event | Verified outcome / copy |
| --- | --- |
| Add success | `Item is added into cart.` |
| Unavailable product | Card `Unavailable`; detail: `This product is unavailable at this time.` |
| Add failure | `The item you've selected was not added to your cart. Please try again.` |
| Empty cart | `Your cart is empty.Add at least 1 item to checkout!` (missing space before `Add` preserved) |
| Alternate empty | `No item to checkout. Please add item(s) into the cart.` |
| Clear cart | `Clear items` → confirm `Clear all items in the cart!` |
| Unavailable in cart | `Some item(s) are not available right now and will be removed from your cart.` |

**Gap:** Full per-SKU modifier matrix requires interactive capture — do not invent options.

### 2.3 Mobile cart loop

Below ~991px: sticky `View Cart` → opens cart experience; footer gains bottom clearance. Same checkout CTA once items exist.

---

## Stage 3 — Checkout identity

```text
[Checkout button]
        |
        v
[Validate cart]  (/Checkout/ValidateCartToCheckOut)
        |
        +-- empty / invalid --> stay on cart (empty messages)
        |
        v
[CheckOutConfirmModal]
   title: Checkout
   Checkout As Member
   OR
   Checkout As Guest
   (guest help: Process to checkout order without account)
```

Related surface: `Member Rewards` / member portal redirect.

**Buyer information (payment-adjacent popup):**

- Prompt: `How would you like to complete the buyer’s information?`
- Choices: `USE MY MEMBER ACCOUNT INFO` / `USE MANUAL INPUT`
- Related marketing string: `Get More with Your Order! Enter your mobile number to unlock these benefits:` (benefits include track orders, digital receipt, re-order — see components doc)

**Gap:** Dedicated `/Checkout` page HTML not fully snapshotted — treat overlays as verified; page body **TODO**.

---

## Stage 4 — Payment

| | |
| --- | --- |
| **Entry** | After identity / buyer-info path; `openSelectPaymentOptionsPopup()` from cart checkout |
| **Singapore announcement constraint** | `Payment options: Visa/Mastercard only.` |
| **Agreement** | `GetzPay agreement` label present |
| **CTAs (platform set)** | `Proceed Payment` / `Proceed to payment` / `Proceed To Pay` / `PAY` |
| **Thailand** | Payment methods may differ only with owner-supplied list — do not invent |

**Gap:** Exact live payment-method radio labels and card-form field order need interactive checkout re-audit before Thailand payment UI.

---

## Stage 5 — Confirmation & Track Order

Not a single static public URL; order-token / Order Tracker routes (pattern **TODO** for Thailand deep links).

### 5.1 Confirmation messaging (verified keys / wording)

| Key / label | Wording |
| --- | --- |
| Payment success | `Payment successful!` |
| Tracker entry | `Track your order status` |
| Actions | `View Order Tracker` / `View Order Details` / `View Payment Receipt` |

### 5.2 Tracker status labels (verified examples)

`Submitted` → `Accepted` → `Preparing` → `Ready` / `Ready For Collection` → `Collected` / `Delivering` → `Delivered` → `Completed`

Also: `Amended`, `Rejected`, `Refunded`

Pickup-oriented subtexts (examples): `Please collect your food at Counter`, `Ready For Collection`

**Gap:** Do not invent tracker chrome, SMS/email templates, or Thailand URL pattern without owner/platform confirmation.

---

## Decision & branch matrix

| Decision | Options | Next stage |
| --- | --- | --- |
| Service | `Pick-up` / `Delivery` | Outlet vs postal code |
| Change fulfillment | `Select Other Services` / edit outlet / `Select a different date/time` | Re-enter Stage 1 |
| Add product | `ADD` vs `Unavailable` | Detail+cart vs blocked |
| Cart | Keep editing vs `Clear items` vs `Checkout` | Stay / empty / Stage 3 |
| Identity | `Checkout As Member` / `Checkout As Guest` | Member portal vs guest buyer info |
| Buyer info | Member autofill / `USE MANUAL INPUT` | Payment |
| Pay | Proceed / PAY vs abandon | Tracker vs back to cart/browse |
| Informational exit | About Us / Allergen | Leaves order path; chrome remains |

---

## Error, empty, loading & interrupt flows

| Condition | Customer-facing behavior (verified) |
| --- | --- |
| Empty cart checkout | Block with empty-cart messages |
| Offline | `No Internet Connection.` / `Please check your internet connection and try again.` |
| Retry | `Having trouble with internet?` / `Please press ok to try again.` / `OK` |
| Slow load | `This website is taking a long time to load.` |
| Session urgency | `The earliest fulfillment time will be adjusted soon. Please complete your order within 5 minutes.` |
| Outlet gone | `Current outlet is no more available.` / `Continue your order at new assigned outlet.` |
| Slot unavailable | Pickup/delivery date-time messages in Stage 1.4 |
| Postal invalid | Delivery validation strings in Stage 1.3 |

Loading shells: `loadingModal`, product-detail AJAX body spinner/placeholder, home slider AJAX shell (may be empty).

---

## Mermaid — primary Pick-up happy path

```mermaid
flowchart TD
  A[Enter site] --> B{Service set?}
  B -->|No| C[Select service, date and time]
  B -->|Yes| F[Browse menu]
  C --> D[Pick-up]
  D --> E[Select outlet]
  E --> T[Choose Date and Time]
  T --> F
  F --> G[Product detail]
  G --> H[Cart Item(s) Added]
  H --> I{Checkout}
  I -->|Empty| H
  I -->|Valid| J[Member or Guest]
  J --> K[Buyer info]
  K --> L[Payment]
  L --> M[Payment successful]
  M --> N[Order Tracker]
```

---

## Implementation anchors (not customer labels)

Use only as engineering references matching Singapore platform:

| Area | Partials / endpoints observed |
| --- | --- |
| Cart | `/ShoppingCart/AddToCartByProductId`, `/ShoppingCart/MyCart`, `/ShoppingCart/ClearItemsInCart`, `/ShoppingCart/PickUp`, `/ShoppingCart/Delivery` |
| Checkout | `/Checkout/ValidateCartToCheckOut`, `/Checkout/OrderDetail`, `/Checkout/SavePhoneNumber` |
| Service / time | `/Home/TimeSelectModal`, `/Home/CheckServiceAvailable` |

Thailand routes may mirror structure; do not invent customer-visible path names that Singapore does not use.

---

## Parity checklist (per flow stage)

When building Thailand, for each stage confirm against Singapore:

1. Same step order and decision branches  
2. Same button / modal titles and system messages  
3. Same cart fulfillment strip fields (`Pick-up`, `Pickup Time`, `Item(s) Added`, `Clear items`, `Checkout`)  
4. Same empty / validation / interrupt copy  
5. Same mobile `View Cart` behavior  
6. Only allowed diffs applied (outlet, hours, last order, availability, THB, payments, legal)

---

## Outstanding flow gaps (do not invent)

1. Home slider slide content (empty AJAX shell in audit)  
2. Per-SKU product detail modifiers  
3. Non-empty cart line-item DOM details under load  
4. Exact payment method radio UI beyond Visa/Mastercard announcement + GetzPay label  
5. Dedicated `/Checkout` page body  
6. Order Tracker / post-payment page DOM and Thailand deep-link pattern  
7. Live Promotions card inventory when empty  
8. Email/SMS order confirmation templates  

---

## End of user flow

This document is the customer journey map for Ladurée Thailand pickup-portal parity with https://www.laduree.sg. Screen chrome details live in `docs/singapore-ui-audit.md`; reusable parts in `docs/components.md`.
