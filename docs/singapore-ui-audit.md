# Singapore UI Audit — Ladurée Thailand Blueprint

**Source of truth:** https://www.laduree.sg  
**Audited:** 12 July 2026  
**Method:** Live HTML/CSS/copy inspection of customer-facing routes and shared chrome.  
**Rules for use:** Do not redesign. Do not simplify. Do not invent. If a detail was not verified below, stop and ask for approval before implementing it in Thailand.

**Thailand note:** Only outlet name/code, address, hours, last order, product availability, Thailand pricing, THB, payment methods, and legal information may differ. Everything else in this document must match Singapore.

---

## Global design system (verified on live site)

### Colors (CSS custom properties on homepage)

| Token | Value |
| --- | --- |
| `--main-color` | `#84754e` |
| `--main-activated-color` | `#84754e` |
| `--main-light-color` | `#84754e14` |
| `--main-color-40` | `#84754e40` |
| `--main-scrollbar-color` | `#84754e80` |
| `--main-background-page-color` | `#fdf8ec` |
| `--main-background-item-color` | `#fdf8ec` |
| `--main-background-item-color-60` | `#fdf8ec60` |
| `--main-background-item-color-80` | `#fdf8ec80` |
| `--main-button-hover-color` | `#d5e4c0` |
| `--main-announcement-text-color` | `#ffffff` |

Observed supporting neutrals from theme CSS: `#000000`, `#7F7F7F`, `#85807B`, `#F0F0F0`, `#F8F8F8`, `#ececec`, `#CCCCCC`, star `#FFC700`, alert/promo red `#DA534F`.

About Us body text also uses inline `#84754e` / `rgb(95, 80, 53)` with Georgia in CMS HTML.

### Typography

| Role | Value |
| --- | --- |
| `--main-font-family` | `"Lora", sans-serif` |
| Lora source | Self-hosted `/Content/fonts/custom-fonts/Lora/Lora.woff` (+ `.ttf`) |
| Also loaded | Google Fonts `Lato` (400,100,300,700,900) |
| About Us CMS text | `georgia, serif`, ~18px brand paragraphs, ~16px store block |

### Layout / spacing / borders (verified structural)

- Bootstrap grid: primary content `col-md-8` + cart aside `col-md-4` on desktop ordering pages.
- Page background: cream `#fdf8ec`.
- Product cards: `.thumbnail.thumbnail-1` with ~8–10px radius; mobile horizontal cards use border `1px solid #ececec`, background `#F8F8F8`.
- Cart panels use class `bg-pink` → resolves to `--main-color` (olive), not literal pink.
- Desktop sticky cart behavior references header/slider heights and footer clearance.
- Responsive breakpoints observed in site CSS/HTML: **991px** (desktop vs mobile chrome), **767px**, **540px**.

### Currency (Singapore)

- Runtime `var currency = 'SGD'`
- Price display pattern: `SGD  31.00` (space after SGD)
- Thailand must replace with THB / `฿1,290` using owner-approved prices (never FX-convert).

---

## Shared chrome (present on all audited pages)

### Document chrome

- Title: `Ladurée Paris | Islandwide Delivery | Order Online`
- Offline banner strings: `No Internet Connection.` / `Please check your internet connection and try again.` / dismiss control

### Desktop header navigation

| Label | Target |
| --- | --- |
| Logo | `/` (img alt: `Order online for pickup or delivery`) |
| `Home` | `/` |
| `MENU` | Dropdown |
| → `All Items` | `/Category` |
| → `Macaron Gift Boxes` | `/Category/macaron-gift-boxes.html` |
| → `Eugénie Chocolates Gift Boxes` | `/Category/eugénie-chocolates-gift-boxes.html` (URL-encoded) |
| → `Chocolates` | `/Category/chocolates.html` |
| → `Biscuits` | `/Category/biscuits.html` |
| → `Tea Boxes` | `/Category/tea-boxes.html` |
| → `Merchandise` | `/Category/merchandise.html` |
| `RECOMMENDED` | `/Recommendations` |
| `About Us` | `/Home/Hours` |
| `Member?` | Member portal redirect (`https://LadureeParis.member.getz.co`) |

Header service controls:

- Outlet title: `Ladurée Paris (Takashimaya)`
- Service dropdown: `Pick-up` / `Delivery`
- CTA: `Select service, date and time`
- Note: `Timeslot has been adjusted according to assigned outlet`
- Search placeholder: `Search items`
- Cart count badge

### Mobile navigation

Bottom/side menu labels: `Home`, `Recommended`, `Promotions` (`/Promotion`), `About Us`, plus `Menu Categories` list (same category set).

Mobile header: service switcher, `Member?`, search, cart, `View Cart` sticky affordance.

### Persistent cart (right rail / mobile cart)

| Element | Verified wording |
| --- | --- |
| Service tabs | `Pick-up`, `Delivery`, `Select Other Services` |
| Time row | `Pickup Time` + `Select a different date/time` |
| Lines header | `Item(s) Added` |
| Clear action | `Clear items` |
| Empty state | `Your cart is empty.Add at least 1 item to checkout!` |
| Alternate empty | `No item to checkout. Please add item(s) into the cart.` |
| Totals | `Item(s) Total`, `Tax` |
| Primary CTA | `Checkout` (button shows amount + count pattern e.g. `$ 0.00 Checkout 0` in DOM) |

### Footer

- Link: `Allergen Information` → `/Home/TermsConditions`
- Copyright: `©2026 Laduree Paris. Powered by` + Getz
- Mobile: `View Cart`

---

## Screen inventory (customer-facing, in application order)

### 1) Home

- **URL:** https://www.laduree.sg/
- **Purpose:** Landing + full menu browsing + announcement + cart entry to order flow.
- **Body class:** `home`
- **Navigation:** Shared chrome above.
- **Sections (top → bottom):**
  1. Header / service / search / cart
  2. Home slider (`.home-page-slider` / `.slider-block`)
  3. Announcement (`Dear Valued Ladurée Customers,` … delivery charges table … `Payment options: Visa/Mastercard only.` … `Thank you for your support and understanding!`) with expand controls `View more` / `View less`
  4. Category product grids for all six categories
  5. Recommendation helper: `Items with star … are recommended by our chef and patrons`
  6. Persistent cart aside
  7. Footer
- **Category intros (verified):**
  - Macaron Gift Boxes — `Macaron gift boxes include protective inserts for online orders only.`
  - Eugénie Chocolates Gift Boxes — `A delicious, unexpected marriage of a crunchy sablé, a melting heart, and a delicate chocolate coating.`
  - Chocolates — `Soft marshmallow bears coated in rich, silky chocolate.`
  - Biscuits — `Delicate langue de chat biscuits with a light, buttery crunch.`
  - Tea Boxes — `A curated selection of aromatic teas inspired by Parisian tradition.`
  - Merchandise — `Beautifully crafted items inspired by Ladurée's timeless Parisian style.`
- **Buttons / actions:** `ADD`, `Unavailable`, product image/title opens product detail dialog, cart `Checkout`, `Clear items`, service selectors.
- **Wording:** See announcement + category intros + shared chrome. No invented marketing hero headline beyond CMS/slider assets.
- **Layout:** Full-width slider; then `col-md-8` content + `col-md-4` cart on desktop; stacked on mobile.
- **Spacing / colors / typography:** Global system; announcement olive text tones (`#615236` / `#8a764f` observed in delivery table HTML).
- **Interaction:** Lazy-loaded product images; `showProductDetailDiaLog(...)` on image/title/`ADD`; service modal via `selectService()`; announcement collapse script.
- **Validation / empty / loading:** Empty cart messages above; offline banner; `loadingModal` / retry: `Having trouble with internet? Please press ok to try again.` + `OK`; long-load string exists: `This website is taking a long time to load.`
- **Responsive:** Mobile menu + sticky `View Cart`; cart moves off fixed right rail below ~991px.

**Home catalog (verified product titles + Singapore prices):**

| Product | SGD |
| --- | --- |
| « Napoléon III » Macaron - 8pcs | 31.00 |
| « Prestige » Macaron - 15pcs | 57.00 |
| « Prestige » Macaron - 20pcs | 75.00 |
| « Prestige » Macaron - 28pcs | 101.00 |
| « Prestige » Macaron - 35pcs | 125.00 |
| « Arabesque » Macaron - 42pcs | 148.00 |
| Eugénie Chocolates - 6pcs | 23.80 |
| Eugénie Chocolates - 12pcs | 45.00 |
| Eugénie Chocolates - 18pcs | 66.80 |
| Marshmallow Bear Milk Chocolate | 9.80 |
| Marshmallow Bear Dark Chocolate | 9.80 |
| Dark Chocolate Candied Orange « Orangette » | 35.00 |
| Dark Chocolate Almond Praline « 16 Royale » - 12pcs | 35.00 |
| Langue de Chat Vanilla & Strawberry | 28.00 |
| Langue de Chat Vanilla & Caramel | 28.00 |
| Langue de Chat Dark & Milk Chocolate | 28.00 |
| Marie-Antoinette Tea Box - 20 sachets | 33.00 |
| Roi Soleil Tea Box - 20 sachets | 33.00 |
| Mélange Ladurée Tea Box - 20 sachets | 33.00 |
| Earl Grey Tea Box - 20 sachets | 33.00 |
| 1001 Nuits Tea Box - 20 sachets | 33.00 |
| « Pampille » Keyring | 68.00 |
| « Macarons » Keyring | 68.00 |
| « Little Bag » Keyring | 68.00 |
| Vichy Travel Mug | 28.00 |
| Pink Thermo Bottle | 38.00 |
| Toile De Jouy Thermo Bottle | 38.00 |
| Toile De Jouy (Pouch) | 25.00 |
| Toile De Jouy (Notebook) | 23.00 |
| Organic Cotton Pink Mini Tote Bag | 25.00 |
| Organic Cotton Green Tote Bag | 35.00 |
| Picnic Cooler Bag | 55.00 |

Product card anatomy: image → title (`.text-clamp-overflow-item`) → `SGD xx.xx` → `ADD` (`.btn-grey`) / hidden `Unavailable` twin.

---

### 2) All Items (Menu)

- **URL:** https://www.laduree.sg/Category
- **Purpose:** Full menu listing of all categories/products (same catalog structure as home grids).
- **Body class:** `page-1`
- **Navigation / chrome:** Same shared header/cart/footer.
- **Sections:** Menu category navigation + all category product sections + cart.
- **Buttons / wording / layout / system:** Same product card and cart patterns as Home.
- **Empty / loading / validation / responsive:** Same global behaviors.

---

### 3–8) Category pages

| # | URL | Heading |
| --- | ---: | --- |
| 3 | https://www.laduree.sg/Category/macaron-gift-boxes.html | Macaron Gift Boxes |
| 4 | https://www.laduree.sg/Category/eug%C3%A9nie-chocolates-gift-boxes.html | Eugénie Chocolates Gift Boxes |
| 5 | https://www.laduree.sg/Category/chocolates.html | Chocolates |
| 6 | https://www.laduree.sg/Category/biscuits.html | Biscuits |
| 7 | https://www.laduree.sg/Category/tea-boxes.html | Tea Boxes |
| 8 | https://www.laduree.sg/Category/merchandise.html | Merchandise |

- **Purpose:** Single-category catalog.
- **Body class:** `page-1`
- **Navigation:** Shared chrome; MENU dropdown highlights category set.
- **Sections:** Category title + category intro (same texts as Home) + product grid + cart + footer.
- **Buttons:** `ADD` / `Unavailable`; open product detail.
- **Layout / colors / typography / interaction / validation / loading / empty / responsive:** Same system as Home; product subset only.

Observed product counts on category pages (ADD affordances present in DOM): Macaron 6, Eugénie 3, Chocolates 4, Biscuits 3, Tea 5, Merchandise 11.

---

### 9) Recommended

- **URL:** https://www.laduree.sg/Recommendations
- **Purpose:** Chef/patron recommended assortment.
- **Heading:** `recommended for you`
- **Navigation:** `RECOMMENDED` / mobile `Recommended`
- **Sections:** Recommended product list + shared cart/footer.
- **Verified products on this page:**
  - Eugénie Chocolates - 12pcs — SGD 45.00
  - Marshmallow Bear Dark Chocolate — SGD 9.80
  - Langue de Chat Vanilla & Caramel — SGD 28.00
  - « Prestige » Macaron - 15pcs — SGD 57.00
  - « Prestige » Macaron - 20pcs — SGD 75.00
  - « Arabesque » Macaron - 42pcs — SGD 148.00
- **Buttons:** `ADD` / `Unavailable`
- **Empty state string available in platform dictionary:** `There is no recommended at this moment.` (use only if that state is shown)
- **Layout / system:** Same product card + cream page + cart rail.

Product detail descriptions on this page include allergen/storage sentences referring customers to the Allergens page at the bottom of the site (Singapore product CMS copy).

---

### 10) Promotions

- **URL:** https://www.laduree.sg/Promotion
- **Purpose:** Promotions listing.
- **Navigation:** Mobile `Promotions`; desktop primarily via mobile menu / related entry points.
- **Sections:** Shared chrome + `All Promotions` title treatment (`.promotion-title`).
- **Buttons:** Shared service/cart buttons; promotion-specific redeem flows exist in platform scripts.
- **Empty / content note:** At audit time, no product `ADD` cards were present in the static HTML snapshot; promotion cards are dynamically structured. **Do not invent promotion titles.** Re-inspect live page / ask owner before Thailand promo content.
- **Layout / colors:** Promotion title uses `--main-color`; otherwise global system.

---

### 11) About Us

- **URL:** https://www.laduree.sg/Home/Hours
- **Purpose:** Brand story + flagship outlet information.
- **Heading:** `ABOUT US`
- **Navigation:** `About Us`
- **Sections / wording (verified):**
  1. Centered hero image (CMS asset)
  2. Brand paragraphs (Georgia / `#84754e` / 18px):
     - `Established in 1862 by Louis-Ernest Ladurée, Pâtisserie E. Ladurée, widely known as Ladurée, is a celebrated French maison of gourmet pastries, chocolates, and teas.`
     - `It is renowned for inventing the signature double-shell macaron, crafted with premium ingredients and presented in its iconic pastel-coloured packaging. Ladurée has become synonymous with timeless elegance and exceptional savoir-faire.`
     - `Today, under Executive Pastry Chef Julien Alvarez, Ladurée continues to blend tradition with innovation, delighting connoisseurs across more than 20 countries worldwide.`
  3. `Flagship Store`
  4. `Takashimaya Shopping Centre`
  5. `Address: 391 Orchard Road #B1-13/13A, Takashimaya Shopping Centre, Singapore 238872`
  6. `Mobile:+65 8318 3731(WhatsApp)`
  7. `Email: hello@laduree.sg`
  8. `Opening Hours:` `10:00 - 21:30 (Daily)`
  9. `(Last Order 21:00)`
  10. `Instagram` link/control
- **Buttons:** `Instagram` (+ shared chrome)
- **Layout:** Centered CMS content in main column; shared cart still present in shell.
- **Thailand adaptation:** Replace outlet/address/hours/last order/contact/legal only; keep brand paragraphs unless owner supplies approved alternate brand text.

---

### 12) Allergen Information

- **URL:** https://www.laduree.sg/Home/TermsConditions  
- **Footer label:** `Allergen Information` (title attribute and visible link text)
- **Purpose:** Allergen information (image-based content).
- **Heading:** `Allergen Information`
- **Sections:** Heading + full-width stacked images (4 JPEG assets on S3) — no additional body paragraphs in HTML beyond images.
- **Buttons:** None page-specific beyond shared chrome/footer.
- **Layout:** `.main` content block, images `width:100%` / `img-responsive`.
- **Thailand:** Legal/allergen assets may differ; structure (footer link label + dedicated page) must match unless owner changes legal IA.

---

## Overlay / modal screens (customer-facing, shared)

These are part of the customer journey even without unique top-level URLs.

### A) Select service

- **Trigger:** `Select service, date and time` / service tabs / `Select Other Services`
- **Verified headings/copy:**
  - `SELECT YOUR DESIRED SERVICE`
  - `Select Service To Start`
  - `Pick-up` + `Order & collect` / `no queuing`
  - `Delivery` + `Served to your` / `doorstep`
- **Buttons:** service cards, continue into outlet/date flow, close controls
- **Interaction:** Sets pickup vs delivery session (`/ShoppingCart/PickUp`, `/ShoppingCart/Delivery`)

### B) Select outlet (Pick-up)

- **Headings:** `Select outlet to Pickup Order` / `Select Outlet To Pickup Order` / `Select the outlet`
- **Verified outlet row:** `1. Ladurée Paris (Takashimaya)` + `391 Orchard Road #B1-13/13A, 238872, Singapore` + phone
- **Buttons:** `Select`, `Continue`, `Confirm`

### C) Delivery postal code

- **Heading:** `Please input the postal code for delivery`
- **Placeholder:** `Delivery location postal code`
- **Buttons:** `Enter`, `Continue`, `Confirm`
- **Validation (verified dictionary/UI):**
  - `The Postal Code field is required.`
  - `Postal code is incorrect`
  - `The postal / address is not available for delivery yet.`
  - `Wrong postal code or address`
  - `This address doesn't exist, please try again.`

### D) Choose date & time

- **Headings:** `Choose Date & Time`, `Select Time slot`, `Select Date`
- **Controls:** calendar, `More Dates` / `Less Dates`, time dropdown, `Done`, `Confirm`
- **Validation / availability messages:**
  - `This date is not available for delivery`
  - `This date is not available for pickup`
  - `This date & time is not available for delivery`
  - `There is currently no valid collect time in this day.`
  - Fulfillment adjustment notices (earliest slot changed / complete within 5 minutes)
- **Cart reflection:** `Pickup Time` + `Select a different date/time`

### E) Product detail dialog

- **Trigger:** product image / title / `ADD`
- **Modal id:** `productDetailModal`
- **Verified related wording:** `Add to Cart`, `Additional Request/ Recipient Information`, note placeholder `Tap to add note` / `Type the request in here`
- **Success:** `Item is added into cart.`
- **Validation examples:** required modifier selection messages; quantity limits; unavailable product: `This product is unavailable at this time.`
- **Loading:** modal body can show placeholder SVG/spinner structure before content fills  
  **Gap:** Full modifier matrix per SKU requires interactive capture per product — do not invent modifiers.

### F) Cart maintenance

- Quantity steppers (platform cart partial `/ShoppingCart/MyCart`)
- `Clear items` → clears via `/ShoppingCart/ClearItemsInCart` (confirm copy in dictionary: `Clear all items in the cart!`)
- Unavailable removal modal: `Some item(s) are not available right now and will be removed from your cart.`
- Add failure: `The item you've selected was not added to your cart. Please try again.`

### G) Checkout gate

- **Button:** `Checkout` → validates cart (`/Checkout/ValidateCartToCheckOut`)
- **Empty block:** prevents checkout with empty-cart messages
- **Modal:** `CheckOutConfirmModal`
  - `Checkout`
  - `Checkout As Member`
  - `OR`
  - `Checkout As Guest`
  - Guest helper: `Process to checkout order without account`
- Related: `Member Rewards`

### H) Payment options / buyer info

- Popup id: `select-payment-options-popup`
- Observed strings: `Get More with Your Order! Enter your mobile number to unlock these benefits:`
- Buyer autofill choice: `How would you like to complete the buyer’s information?`
  - `USE MY MEMBER ACCOUNT INFO`
  - `USE MANUAL INPUT`
- Buttons in platform set: `Proceed Payment`, `Proceed to payment`, `Proceed To Pay`, `PAY`
- Singapore homepage announcement states: `Payment options: Visa/Mastercard only.`
- Agreement label present: `GetzPay agreement`
- **Gap:** Exact live payment-method radio labels and card-form field order should be re-verified in an interactive checkout before Thailand payment UI is coded. Thailand payment methods are an allowed difference but must be owner-supplied.

### I) Connectivity / session / system alerts

| State | Verified wording |
| --- | --- |
| Offline | `No Internet Connection.` / `Please check your internet connection and try again.` |
| Retry modal | `Having trouble with internet?` / `Please press ok to try again.` / `OK` |
| Slow load | `This website is taking a long time to load.` |
| Session urgency | `The earliest fulfillment time will be adjusted soon. Please complete your order within 5 minutes.` |
| Outlet change | `Current outlet is no more available.` / `Continue your order at new assigned outlet.` |

### J) Member entry points

- Header/mobile: `Member?`
- Checkout member path: `Checkout As Member`
- External member portal host configured for Singapore merchant.

---

## Post-order / tracker (platform-supported; order-token URLs)

Not a single static public URL; referenced extensively in localization and endpoints.

Verified customer-facing tracker wording examples:

- `Track your order status`
- `View Order Tracker` / `View Order Details` / `View Payment Receipt`
- Status labels such as `Submitted`, `Accepted`, `Preparing`, `Ready`, `Ready For Collection`, `Collected`, `Delivering`, `Delivered`, `Completed`, `Amended`, `Rejected`, `Refunded`
- Pickup-oriented subtexts e.g. `Please collect your food at Counter`, `Ready For Collection`

**Gap:** Exact Thailand tracker URL pattern and SMS/email deep links need owner/platform confirmation. Do not invent tracker chrome.

---

## Complete application flow (Singapore → Thailand parity)

```text
[Enter site: Home / Category / Recommended / Promotion / About / Allergen]
        |
        | (optional browse catalog; ADD opens product detail)
        v
[Select service, date and time]
        |
        +-- Pick-up --> [Select outlet] --> [Choose Date & Time] --> [Confirm]
        |
        +-- Delivery --> [Postal code] --> [Choose Date & Time] --> [Confirm]
        |
        v
[Browse / search / Recommended / Category pages]
        |
        v
[Product detail] --> ADD --> [Cart: Item(s) Added]
        |
        | (edit qty / notes / Clear items / change Pickup Time)
        v
[Checkout]
        |
        +-- Checkout As Member --> member login/rewards path
        |
        +-- Checkout As Guest --> buyer info (manual or member autofill)
        v
[Select payment option] --> [Proceed / PAY]
        |
        v
[Order confirmation / Order Tracker states]
```

Supporting loops:

- Change service from cart (`Pick-up` / `Delivery` / `Select Other Services`)
- `Select a different date/time`
- Unavailable items removed before pay
- Offline/retry overlays can interrupt any step
- Footer `Allergen Information` and `About Us` are informational exits that keep shared chrome

API/page partials observed (implementation anchors, not customer labels):

- Cart: `/ShoppingCart/AddToCartByProductId`, `/ShoppingCart/MyCart`, `/ShoppingCart/ClearItemsInCart`, `/ShoppingCart/PickUp`, `/ShoppingCart/Delivery`
- Checkout: `/Checkout/ValidateCartToCheckOut`, `/Checkout/OrderDetail`, `/Checkout/SavePhoneNumber`
- Service/time: `/Home/TimeSelectModal`, `/Home/CheckServiceAvailable`

---

## Screen checklist matrix

For every Thailand screen implementation, confirm parity against the matching Singapore screen for:

1. URL/route role  
2. Page purpose  
3. Navigation labels + targets  
4. Sections order  
5. Buttons + exact labels  
6. Wording (no inventions)  
7. Layout structure  
8. Spacing rhythm  
9. Colors (theme tokens)  
10. Typography (Lora primary)  
11. Interaction model  
12. Validation messages  
13. Loading / retry states  
14. Empty states  
15. Responsive behavior (991px / 767px / 540px patterns)

---

## Explicit non-goals / forbidden inventions

Do not add Singapore-absent marketing such as:

- Luxury French Pâtisserie  
- Luxury Pickup Experience  
- Browse Collection  
- Select Boutique  

Do not invent headlines, taglines, descriptions, promotional copy, button wording, or section titles.

If not verified above → **stop and ask for approval**.

---

## Open items requiring owner approval or interactive re-audit

1. Live Promotions card inventory (static snapshot empty of ADD cards)  
2. Per-SKU product detail modifiers/options  
3. Exact payment method list UI beyond announcement `Visa/Mastercard only` and GetzPay agreement label  
4. Order tracker public URL pattern + email/SMS templates  
5. Whether Thailand keeps `Powered by Getz` footer treatment  
6. Thailand replacements for outlet, hours, last order, prices (THB), payments, allergen/legal assets  

---

## End of blueprint

This document is the implementation blueprint for Ladurée Thailand portal parity with https://www.laduree.sg.
