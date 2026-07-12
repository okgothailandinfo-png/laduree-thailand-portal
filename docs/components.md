# Ladurée Singapore — Reusable UI Component Inventory

| Field | Value |
| --- | --- |
| **Source of truth** | https://www.laduree.sg |
| **Audit date** | 2026-07-12 |
| **Method** | Downloaded homepage HTML + linked CSS (version query from HTML `href`s); fetched `/Category`, `/Recommendations`, `/Promotion`, `/Home/Hours`, `/Home/TermsConditions` for additional component evidence. Selectors/copy taken only from verified markup/CSS/localization keys. |
| **Asset version query** | `?v=253.20260706-129` (where present) |
| **Companion docs** | `docs/design-tokens.md` (tokens), `docs/singapore-ui-audit.md` (screens/flow) |
| **Rule** | Do **not** invent. Unverified items are marked **TODO**. Thailand may change only outlet/ops/pricing/payment/legal data; structure, labels, and behavior must match Singapore. |

---

## CSS / HTML assets reviewed

| Asset | Path | HTTP | Notes |
| --- | --- | --- | --- |
| Homepage HTML | `/` | 200 | Primary shell (~1.0 MB) |
| Category | `/Category` | 200 | Product grid + floating category rail |
| Recommendations | `/Recommendations` | 200 | Recommended product list |
| Promotion | `/Promotion` | 200 | Shared chrome; promo content sparse in snapshot |
| Hours (About Us) | `/Home/Hours` | 200 | CMS About Us / hours |
| Terms (Allergen) | `/Home/TermsConditions` | 200 | Allergen Information images |
| `colour-scheme.css` | `/Content/css_newUI/colour-scheme.css` | 200 | |
| `style.css` | `/Content/css_newUI/style.css` | 200 | |
| `style_v2.min.css` | `/Content/themes/css-v2/style_v2.min.css` | 200 | |
| `homepage.min.css` | `/Content/v2/css/homepage/homepage.min.css` | 200 | |
| `custom_new_ui.css` | `/Content/css_newUI/custom_new_ui.css` | 200 | |
| `font-style.css` | `/Content/css_newUI/font-style.css` | 200 | No version query on href |
| `bootstrap.css` | `/Content/css_newUI/bootstrap.css` | 200 | Bootstrap **v3.4.1** |
| `select-payment-method.css` | `/Content/css_newUI/select-payment-method.css` | 200 | |
| `slow-notice.css` | `/Content/slow-notice.css` | 200 | No version query |
| `GetzThemMenuLeftRightAuto.css` | `/Content/themes/GetzThemMenuLeftRightAuto.css` | 200 | MENU dropdown |
| `modal-loading.css` | `/Content/customizable_loading/css/modal-loading.css` | 200 | |
| `modal-loading-animate.css` | `/Content/customizable_loading/css/modal-loading-animate.css` | 200 | |
| `fix_new_ui.css` | `/Content/css_newUI/fix_new_ui.css` | 200 | Linked on homepage (name is `fix_`, not `form_`) |

**404s this pass:** none for the assets listed above.

**Not requested / not fully audited here:** Owl carousel CSS, print CSS, Font Awesome, jQuery UI, `jquery.datetimepicker.css`, `product-details.min.css`, `getz-dropdownhover.css`, S3 `styleCustom.css`, `remove-logo-box-shadow.css`.

---

## Global theme (component context)

| Token | Value |
| --- | --- |
| `--main-color` | `#84754e` |
| `--main-light-color` | `#84754e14` |
| `--main-activated-color` | `#84754e` |
| `--main-background-page-color` | `#fdf8ec` |
| `--main-background-item-color` | `#fdf8ec` |
| `--main-button-hover-color` | `#d5e4c0` |
| `--main-announcement-text-color` | `#ffffff` |
| `--main-scrollbar-color` | `#84754e80` |
| `--main-font-family` | `"Lora", sans-serif` (via `font-style.css` / tokens doc) |

Runtime: `var currency = 'SGD'`. Star accent `#FFC700` (`.color-by-star`). Cart chrome class `bg-pink` resolves to `var(--main-color)` in `colour-scheme.css` (olive, not pink).

Breakpoints observed: **991px** (desktop vs mobile chrome / View Cart bar), **767px**, **540px**.

---

## 1. Header

### Purpose
Site chrome: logo, outlet brand name, member entry, search (desktop), and mobile bar (hamburger, Member?, logo, service, cart badge).

### Structure (verified)
- Desktop: `header#header.header` → `nav#nav.navbar` → `.container-fluid`
  - Logo: `a.navbar-brand.hidden-xs.hidden-sm` → `span.logo` → `img.img-responsive` (alt: `Order online for pickup or delivery`)
  - Brand: `h1.brand-name` — verified text `Ladurée Paris (Takashimaya)` → `/`
  - Member: `#languages-menu` → `a.btn-login` — `Member?`
  - Search: `#search-form` → `#txtSearch.stxtProductSearch` + `#btnProductSearch.fa.fa-search`
- Mobile bar: `.header__navbar` → `.row.mobile-menu`
  - Hamburger `.navbar-toggle` (three `.icon-bar`)
  - Mobile `a.btn-login` — `Member?`
  - `.menu__branch-name` / `img.branch-name` (logo)
  - Service dropdown + cart `#my-cart-count` (badge; empty snapshot shows `0`)

### States
| State | Verified |
| --- | --- |
| Default | Cream page/header bg `--main-background-page-color` |
| Hover (`Member?`) | `.btn-login:hover` → white bg + `--main-color` text (`style_v2.min.css`) |
| Active nav | `li.active` on Home when on `/` |
| Disabled | **TODO** (no disabled header controls verified) |
| Cart badge empty | `#my-cart-count` present; cart icon container may be `display:none` depending on state |

### Responsive behavior
- Desktop logo/brand/search/nav: `hidden-xs hidden-sm` vs mobile bar under `.header__navbar`
- Logo box-shadow removed for this merchant via `remove-logo-box-shadow.css` (linked)
- Breakpoint split aligns with Bootstrap `xs/sm` vs `md/lg` (~991px)

### Reuse (Thailand parity)
Reuse shell, selectors, `Member?`, search, logo treatment. Swap only outlet brand name / logo asset (owner-approved). Do not invent marketing header copy.

---

## 2. Navigation

### Purpose
Primary IA: Home, MENU (category dropdown), RECOMMENDED, About Us; mobile off-canvas `#menu-mb` also lists Promotions + Menu Categories.

### Structure (verified)
**Desktop** — `#main-menu` → `ul#navbar-collapse-1.nav.navbar-nav`:
| Label | Target |
| --- | --- |
| `Home` | `/` |
| `MENU` | dropdown `#getz-menu-mainsub-category` |
| → `All Items` | `/Category` |
| → `Macaron Gift Boxes` | `/Category/macaron-gift-boxes.html` |
| → `Eugénie Chocolates Gift Boxes` | `/Category/eugénie-chocolates-gift-boxes.html` (encoded) |
| → `Chocolates` | `/Category/chocolates.html` |
| → `Biscuits` | `/Category/biscuits.html` |
| → `Tea Boxes` | `/Category/tea-boxes.html` |
| → `Merchandise` | `/Category/merchandise.html` |
| `RECOMMENDED` | `/Recommendations` |
| `About Us` | `/Home/Hours` |

MENU dropdown CSS: `GetzThemMenuLeftRightAuto.css` — `#getz-menu-mainsub-category ul.dropdown-menu-getz` width `250px`, white bg, border/shadow; hover reveals `.wrapper`.

**Mobile** — `#menu-mb.menu-mb.hidden-md.hidden-lg`:
- `Home`, `Recommended`, `Promotions` → `/Promotion`, `About Us`
- Section title `Menu Categories` + same category links as desktop

### States
| State | Verified |
| --- | --- |
| Default | Links as above |
| Active | `li.active` on current section (Home on `/`) |
| Hover | Dropdown hover via `data-hover="dropdown"` + Getz menu CSS |
| Open (mobile) | Toggle via `.navbar-toggle` — open animation details **TODO** (JS-driven) |

### Responsive behavior
Desktop collapse nav `hidden-xs hidden-sm`; mobile menu `hidden-md hidden-lg`. `Promotions` appears in mobile menu only (not in desktop `#navbar-collapse-1` on audited home snapshot).

### Reuse (Thailand parity)
Keep exact labels/casing (`MENU`, `RECOMMENDED`, `All Items`, category names) unless Singapore changes. Route shape should match. Do not add extra nav items.

---

## 3. Hero

### Purpose
Singapore does **not** ship a marketing “luxury landing” hero (no full-bleed brand headline + CTA composition). Closest verified equivalent: **home banner slider** + optional homepage **announcement** block.

### Structure (verified) — Home slider (closest to Hero)
- `section#main-slide.block.slider-block`
- Child: `div[data-slider="home-slider"].slider.slider-1.home-page-slider`
- Static HTML body: **empty shell**; slides loaded via `/Home/LoadBannerSlider` (endpoint referenced in platform JS patterns)
- Footer twin: `data-slider="footer-slider"` inside `footer#footer` (also empty in static snapshot)

### Structure (verified) — Announcement (not a Hero; adjacent home content)
- `#announcement-homepage-section` → `.announcement-content`
- Verified ops copy includes: `Dear Valued Ladurée Customers,`; Islandwide Delivery `$18`; `FREE WEEKDAY` delivery `$90`+; weekend surcharge `+$8.80`; delivery charges table; payment note `Visa/Mastercard only.`

### States
| State | Verified |
| --- | --- |
| Default | Empty slider shell until AJAX |
| Loading / error / slide content | **TODO** (interactive capture of LoadBannerSlider) |
| Announcement collapse | Not wired in static HTML → **TODO** if JS adds expand/collapse |

### Responsive behavior
Slider sits in `.container-fluid` full content width; not a separate full-viewport marketing hero. Mobile/desktop slide assets **TODO**.

### Reuse (Thailand parity)
Do **not** invent a luxury hero. Reproduce empty-or-loaded slider shell + announcement pattern. Announcement commercial numbers/hours/payments may differ only with owner-approved Thailand ops data.

---

## 4. Outlet selector

### Purpose
Choose pickup (or delivery) outlet before/while ordering.

### Structure (verified)
| UI | Selector | Verified labels / notes |
| --- | --- | --- |
| Cart outlet row | `#divPickupMyCart` → `.item.address` | Map pin; outlet name `Laduree Paris`; address `391 Orchard Road #B1-13/13A, 238872, Singapore`; edit pencil; title `Select other branch` |
| Pickup outlet modal | `#brachIndexModal` (source spelling) | Title `Select Outlet To Pickup Order`; table row `1. Laduree Paris`; address; phone `(+65) 83183731`; map `#map-canvas` |
| Delivery outlets modal | `#outletsModal` | Title `Select Delivery Outlet`; sort `#dropdown-sort-selecter`: `Distance`, `Earliest Delivery time`, `Latest Delivery time`, `Menu Availability`; `#listMatchOutlets`; `Selected Outlet:` / `#lbCurrentSelectedOutlet` default `No Outlet Selected`; CTA `Start Order` `#btnMatchOutlet` |
| Match/confirm controls | `#selecter-outlet`, `#btnChooseDeliveryOutlet` | `Confirm`; date-unavailable alerts for pickup/delivery |
| Outlet changed alert | `#outletChanged` | Shell present; full body **TODO** beyond “continue at new outlet” patterns in related copy |
| Outlet+datetime popup | `#outlet-and-datetime-popup` | JS sets `.outlet-and-datetime__outlet-name` / `__datetime-selected` |

Service modal nested pickup tab (`#tabPickup`): `Select outlet to Pickup Order`; outlet cell `#outlet-pickup-2`.

### States
| State | Verified |
| --- | --- |
| Default / selected | Cart shows current branch; modal lists outlets |
| Empty selection | `No Outlet Selected` |
| Error | `#ErrPickUpCollectTime3_Modal` — `This date is not available for pickup`; delivery twin for delivery |
| Loading list | **TODO** (AJAX fill of `#listMatchOutlets`) |

### Responsive behavior
Map `#map-canvas` height ~300px in inline styles; pickup map hidden on xs in one tab layout (`hidden-xs visible-sm…`). Modal back chevron uses `--main-color` fill on mobile close-left controls.

### Reuse (Thailand parity)
Reuse modal shells and labels (`Select Outlet To Pickup Order`, etc.). Replace outlet name, address, phone, hours with owner-approved Thailand outlet data only.

---

## 5. Pickup workflow

### Purpose
Select service (Pick-up / Delivery), outlet, and pickup date/time, then order from menu with cart fulfillment strip.

### Structure (verified)
1. **Service entry**
   - Mobile strip: `.select-datetime-service` — `Select service, date and time` → `selectService()`
   - Mobile header dropdown: `.dropdown.dropdown-service` — `Pick-up`, `Delivery`
   - Cart tabs: `#service-active` / `#content-service__title` — `Pick-up`; `#service-choice` — `Select Other` / `Services` (title `Select Other Services`)
2. **Service modal** `#deliveryModal`
   - Title `#titleservicepopup` — `SELECT YOUR DESIRED SERVICE`
   - `#btnPickup` — `Pick-up` (+ supporting `Order & collect` / `no queuing` style copy in modal)
   - Delivery twin — `Delivery` / `Served to your` / `doorstep` (verified in existing audit; present in modal body)
3. **Datetime**
   - Cart row `#item_date_time`: label `Pickup Time`; `#collect_date_dl` / `#collect_time_dl` (e.g. `12 Jul 2026 (Today)`, `02:15 PM To 02:30 PM`); hidden 24h twin `#collect_datetime_tw`
   - Opens `#timeModal` (`pickupInitDatePicker(); showTimeModal()`)
4. **Time modal** `#timeModal`
   - Visible title strong `#titletimepopup` — `Pick-up`
   - Hidden header text `Choose Date & Time`
   - Body includes date chips / outlet address / time slots (datetimepicker ids `datetimepicker12`, `datetimepicker3`, `datetimepicker123`; `jquery.datetimepicker.css` linked)
5. **Date modal** `#dateModal` — delivery-oriented title `#titledatepopup` default `Delivery`; `Select Delivery Date` in hidden header
6. **Blockout** `#orderingtime` — `Blockout Ordering Time`; `#orderingtimetitle` — `Online ordering for Pickup or Delivery is now available.`
7. **Tooltips** `#limitAmount_error` — `Select a different date/time`; `#date_time_adjusted` — `Timeslot has been adjusted according to assigned outlet`

### States
| State | Verified |
| --- | --- |
| Default | Pick-up active on Ladurée SG snapshot |
| Error | Pickup/delivery date unavailable alerts; capacity tooltips |
| Adjusted slot | `Timeslot has been adjusted according to assigned outlet` |
| Loading | Tab spinner `#iprocessingtab` (`display:none` default) |
| Disabled checkout during blockout | Script references disabling `#check_payment` on `/checkout` — full checkout page **TODO** |

### Responsive behavior
Service modal: mobile back chevron `#btn-serviceModal-close` (`visible-xs`); desktop close `#btn-deliveryModal-close`. Cart datetime row in sidebar; mobile uses header strip + modals.

### Reuse (Thailand parity)
Keep wording (`Pick-up`, `Pickup Time`, `Select service, date and time`, modal titles). Swap hours / last-order / slot rules with owner-approved Thailand ops data only.

---

## 6. Category cards / rail

### Purpose
Navigate menu categories and section product grids.

### Structure (verified)
**Floating category rail** (Category / home grid template):
- `#floating-category__menu.floating-category` → `#idMenuLeft`
- `ul.nav.category-menu-mobile.item-menu-floating`
- Items: `li.menu-mobile-item` with `data-href="#scroll-{uuid}"` + `span.slide__title`
- Labels: `Macaron Gift Boxes`, `Eugénie Chocolates Gift Boxes`, `Chocolates`, `Biscuits`, `Tea Boxes`, `Merchandise`

**Category section** `#category-section.block-1.full-menu-block.style-1.item-products-floating`:
- `.title-group` → `h2.title-2` → `a` / `span.color-by-theme` category name
- Mobile chevron `i.fa.fa-chevron-circle-right.visible-xs`
- Optional `.desc.text-clamp-overflow` (e.g. protective inserts note for macaron boxes)
- Grid: `.LazyLoading.product-container.vertical-products` with `data-item-per-row="3"`

**Recommended note** `#description-by-recommended`:
- `Items with star` + `i.fa.fa-star.color-by-star` + `are recommended by our chef and patrons`

There is **no** separate pictorial “category card” tile component in the audited markup beyond the rail list + titled section; treat rail + section header as the category UI.

### States
| State | Verified |
| --- | --- |
| Default | Rail + sections on `/` and `/Category` |
| Active rail item | **TODO** (scroll-spy active class not fully documented this pass) |
| Empty category | **TODO** |
| Desc expand | `toggleText('{uuid}')` on `.desc` |

### Responsive behavior
At `<992px`, JS `ToogleCategoryAndProduct` can hide `#div-category-tiles` and show products; floating rail uses `col-xs-5 col-sm-4 col-md-3` beside `col-xs-7 col-sm-8 col-md-9` product grid.

### Reuse (Thailand parity)
Same category labels/order as Singapore unless availability differs (allowed). Keep star note wording exactly.

---

## 7. Product cards

### Purpose
Browse/add items from category grids (Home, Category, Recommendations).

### Structure (verified)
- Wrapper: `.lazy.item-products.box-product-{uuid}` → `.thumbnail.thumbnail-1.style-1`
- Top: `.thumbnail-group__top` → `.product__img` → `img.asyncImage.img-responsive-2` (lazy `data-src` + `_Small` src)
- Title: `.title-4` → `.text-clamp-overflow-item` (click → `showProductDetailDiaLog(...)`)
- Bottom: `.thumbnail-group__bottom`
  - `.price-bottom` — pattern `SGD  31.00` (two spaces after SGD)
  - `.btn-add` → `a.btn.btn-3.btn-sm.btn-add-to-cart.product__btn.btn-grey` — label **`ADD`**
  - Unavailable twin: `a.btn.btn-6-fix.btn-sm.btn-border-red.product__btn.unavailableflag` — **`Unavailable`** (often `.hidden`)
  - Qty stepper (see Quantity selector); often paired with ADD

CSS: `.thumbnail-1` bg `#F0F0F0`, radius `8px` (`colour-scheme.css`); ADD `.btn-grey` uses `--main-color` + white text under colour-scheme override.

### States
| State | Verified |
| --- | --- |
| Default | Image, title, price, ADD |
| Hover | **TODO** (card hover not extracted as dedicated rule this pass) |
| Unavailable | `.unavailableflag` visible; ADD hidden/replaced |
| In cart / qty | `data-count-item-in-cart`; stepper becomes visible (often `.hidden` when 0) |
| Loading image | `asyncImage` / LazyLoading container |
| Disabled ADD | `.btn-add-to-cart[disabled]` → `pointer-events: none` (bootstrap.css theme) |

### Responsive behavior
Desktop vertical cards in 3-column grid; mobile horizontal card treatment referenced in audit (`#F8F8F8`, border `#ececec`, radius ~10px). Confirm computed mobile layout when implementing.

### Reuse (Thailand parity)
Same card structure and `ADD` / `Unavailable` labels. Prices must be owner-approved THB (never FX-convert SGD). Availability may differ.

---

## 8. Product detail

### Purpose
Modal product configuration / add-to-cart from image, title, or ADD.

### Structure (verified)
- Shell: `#productDetailModal.modal` → `.modal-dialog.modal-xl` → `#productDetailModal_Body.modal-content`
- **Static body empty** — filled by AJAX (`showProductDetailDiaLog`)

**Related item overlays (verified shells):**
| Modal | Notes |
| --- | --- |
| `#addNoteForItemModal` | `Add a note for item`; placeholder `Tap to add note`; `Cancel` / `Add` |
| `#sessionTimeOut` | Complete order within 5 minutes warning |
| `#product-in-cart-modal` | id present; body **TODO** |
| `#alertProductInvalid` / `#alertProductNotAdded` | shells present; full copy **TODO** |

### States
| State | Verified |
| --- | --- |
| Closed / open | Bootstrap modal |
| Loading body | **TODO** |
| Error / validation | **TODO** (field matrix not in static HTML) |
| Variants / modifiers UI | **TODO** |

### Responsive behavior
`modal-xl` dialog; scrollable body patterns shared with other modals. Mobile/desktop field layout **TODO** until body captured.

### Reuse (Thailand parity)
Keep modal shell and trigger behavior. Do not invent detail layout; capture Singapore AJAX body before Thailand implementation.

---

## 9. Quantity selector

### Purpose
Increment/decrement item quantity on product cards (and related cart/detail flows).

### Structure (verified)
```
button.btn-theme-style.input-group-addon.btn-change-quantity[data-type-change="minus"]
  i.fa.fa-minus
input.form-control.text-center.border-color-by-theme.quantity-product-value[disabled][max="999"]
button.btn-theme-style.input-group-addon.btn-change-quantity[data-type-change="plus"][data-show-product-detail="true"]
  i.fa.fa-plus
```
Parent attributes include `data-productid`, `data-is-track-quantity`, `data-count-item-in-cart`, etc.

Hidden `#confirm-quantity` used in promotion confirmation flows (not the visible stepper).

### States
| State | Verified |
| --- | --- |
| Default | Value `0`; input disabled (buttons change value) |
| Plus | May open product detail (`data-show-product-detail="true"`) |
| Disabled buttons | `.btn-change-quantity[disabled]` opacity `0.65`, `cursor: not-allowed` |
| Max | `max="999"` on input |
| Empty / error | **TODO** beyond cart empty messages |

### Responsive behavior
`custom_new_ui.css`: `.btn-change-quantity` width `30%`, bottom radii 0. Mobile card layout may reposition stepper — **TODO** for exact computed flex.

### Reuse (Thailand parity)
Reuse stepper markup/behavior exactly; no alternate qty UX.

---

## 10. Cart

### Purpose
Sidebar order summary: outlet, pickup time, line items, totals, checkout CTA; mobile View Cart bar.

### Structure (verified)
**Desktop / sidebar:** `aside.sidebar` → `.cart-block` → `#containmycart` → `#content-cart` → `#box-content-cart`

| Region | Selectors / labels |
| --- | --- |
| Service tabs | `Pick-up` / `Select Other Services` |
| Outlet + Pickup Time | `#divPickupMyCart.bg-pink` |
| Rewards | `#cart-rewards` (empty in snapshot) |
| Items header | `Item(s) Added` / `#clear-items` — `Clear items` |
| Empty | `#ErrNothingToCheckout` — `Your cart is empty.Add at least 1 item to checkout!` (note missing space before `Add`) |
| Alternate empty | `#ErrNoItemToCheckout` — `No item to checkout. Please add item(s) into the cart.` |
| Price accordion | `#info-total-cart` / `#content-cart-price` — `Item(s) Total`, `Tax` (labels in shell) |
| Checkout | `#content-cart-checkout` → `#btnCheckOut.btn-checkout` |

**Checkout button content:** `.checkout-total-amount` (e.g. `$ 0.00`) + `#textCheckOut` `Checkout` + `.checkout-total-quantity`.

**Mobile View Cart bar:** `.homepage-cart-button-display` → `button.btn-homepage-cart-display` — `View Cart` + qty box; triggers `.menu__cart` click.

**Clear confirm:** `#confirmClearItems` — `Clear all items in the cart!`; `Clear` / `Cancel` (referenced in audit / shells).

**Add-item progress:** `#show-progress-bar-when-add-item.block-4.cart-info-block` (empty shell).

### States
| State | Verified |
| --- | --- |
| Empty | Empty messages above; checkout qty `0` |
| Non-empty line items | **TODO** (capture with items in cart) |
| Loading | `#iprocessingtab` spinner; `.product-in-cart-modal-waiting` CSS exists |
| Clear items | Confirm modal |
| Hover checkout | Parent/theme uses `--main-button-hover-color` — computed cascade vs legacy `#333` in `style.css` **TODO** |

### Responsive behavior
Desktop sticky cart ~`270px` aside (`col-md-4` pattern on ordering pages). `@media (max-width: 991px)`: fixed bottom View Cart bar; `footer#footer { margin-bottom: 64px }`; bar hidden when cart open.

### Reuse (Thailand parity)
Exact labels (`Item(s) Added`, `Clear items`, `Checkout`, `View Cart`). Currency display → THB formatting rules. Outlet/address row content from Thailand ops.

---

## 11. Checkout

### Purpose
Transition from cart to identity/payment: checkout CTA opens payment-options / member-guest confirm flows.

### Structure (verified)
| Piece | Selector | Verified |
| --- | --- | --- |
| Cart CTA | `#btnCheckOut` | `onclick` / `data-onclick` → `openSelectPaymentOptionsPopup()` |
| Confirm modal | `#CheckOutConfirmModal` | Title `Checkout`; `Checkout As Member`; `OR`; `Checkout As Guest`; guest help `Process to checkout order without account` |
| Recheck cart | `#RecheckYourCartModal` | Modifier quantity / recheck patterns |
| Place order popup | `#place-order-popup` | `Pay On Mobile`; `How would you like to complete the buyer’s information?`; `USE MY MEMBER ACCOUNT INFO`; `USE MANUAL INPUT` |
| Proceed | `#proceed-to-payment` | `Proceed to payment` |
| Errors | `#ErrNoItemToCheckout`, `#ErrNothingToCheckout` | See Cart |

Dedicated `/Checkout` page HTML: **TODO** (not fetched this pass; home shell covers overlays).

### States
| State | Verified |
| --- | --- |
| Default empty cart | Empty danger messages; CTA still rendered with `$ 0.00` / `0` |
| Member vs guest | `#CheckOutConfirmModal` sections |
| Validation error | `input.input-validation-error` border `#b94a48`; `.field-validation-error` |
| Loading | `#loadingModal` during transitions |

### Responsive behavior
Checkout button full width, height `46px`, radius `12px`, uppercase (`style_v2.min.css`). Modals use Bootstrap + custom close-left on small screens.

### Reuse (Thailand parity)
Keep checkout wording and modal sequence. Legal/payment method differences only with owner approval.

---

## 12. Payment

### Purpose
Collect phone/consent benefits, choose payment method, proceed to pay.

### Structure (verified)
**Phone / benefits popup** `#select-payment-options-popup`:
- `Get More with Your Order!`
- `Enter your mobile number to unlock these benefits:`
- Benefits include: `Track your orders in real-time`; `Instantly download your digital receipt`; `Re-order your favourites with a tap`
- Consent line for notifications on expiring rewards
- CTA pattern `Join for Exclusive Benefits` (in popup body)

**Payment method CSS** (`select-payment-method.css`) targets:
- `#selectOptionPaymentModal` — header bg `#F0F0F0`; `.radio` / `.radio.active` shadow; `.btn-procced-checkout` 180×40; `.apply-voucher`; `.no-payment-required`
- Related: `#voucherVerificationRequiredModal`, `#invalidVoucherModal`

**`#selectOptionPaymentModal` element:** **not** present in home static HTML → markup/labels **TODO**.

Singapore announcement states `Payment options: Visa/Mastercard only.` Localization keys include `O_ConfirmProcessPayment`, `O_NotEligibleToUseThisPaymentMethod`, etc.

`#btnProceedPayment` — label `Proceed Payment` (nearby discount modal footer).

### States
| State | Verified |
| --- | --- |
| Default popup | Benefits + phone entry shell |
| Active payment radio | `.radio.active` box-shadow |
| Not eligible | `.not-eligible-apply-sap` / `.text-red-color` `#d90000` |
| No payment required | `.no-payment-required` styled box |
| Error / field validation strings | **TODO** |

### Responsive behavior
Payment modal `margin-top: 30px`; body padding compact. Full mobile payment layout **TODO** until `#selectOptionPaymentModal` HTML captured.

### Reuse (Thailand parity)
Reuse popup/modal structure. **Payment methods are an allowed Thailand difference** — replace Visa/Mastercard-only with owner-approved methods; do not invent gateway UI beyond Singapore patterns.

---

## 13. Order confirmation

### Purpose
Post-payment / order-placed confirmation UX (and in-flow confirm modals).

### Structure (verified shells / keys — limited rendered confirmation page)
**In-flow confirm modals (verified):**
- `#CheckOutConfirmModal` — pre-payment identity (see Checkout)
- Promotion confirms: `#confirmNextStepPromotion`, `#confirmCancelPromotion`, `#confirmCompletedPromotion`, `#confirmKeepItemPromotion`, `#confirmUnavailableItems`
- `#orderingtime` blockout messaging

**Localization keys (wording verified; rendered tracker/confirmation page markup TODO):**
| Key | Value |
| --- | --- |
| `O_OrderTracker_PaymentSuccessful` | `Payment successful!` |
| `O_YourOrderIsGoodToGo` | `Your order is good to go!` |
| `O_BackToOrderTracker` | `Back to ORDER Tracker` |
| `O_OrderTracker_YouCanRetrieveThisPageViaTheSMSEmail` | `You can retrieve this page via the SMS / Email sent to you` |

Dedicated confirmation route HTML: **TODO** (not in static home; may live under Order Tracker after pay).

### States
| State | Verified |
| --- | --- |
| Payment successful (copy) | Key above |
| Accepted / preparing / ready | See Track Order keys |
| Error confirms | Multiple `Err*` modals on home — per-flow **TODO** |

### Responsive behavior
**TODO** for post-checkout page chrome.

### Reuse (Thailand parity)
Reuse verified status strings. Capture live confirmation UI before implementing Thailand.

---

## 14. Track Order

### Purpose
Order status tracker after checkout (`/OrderTracker/...`).

### Structure
**Verified URL patterns** (home JS):
- `/OrderTracker/Index/-id-`
- `/OrderTracker/PartialOrderStatus/-id-`
- `/Home/RedirectToOrderTracker/-id-`

**Verified localization status/copy samples** (no rendered tracker DOM in audited pages):

| Key | Value |
| --- | --- |
| `O_OrderTracker_Accepted` | `Accepted` |
| `O_OrderTracker_Preparing` | (key present; value in resource blob) |
| `O_OrderTracker_Ready` | `Ready` |
| `O_OrderTracker_ReadyForCollection` | `Ready For Collection` |
| `O_OrderTracker_Collected` | `Collected` |
| `O_OrderTracker_Delivered` | (key present) |
| `O_OrderTracker_PaymentSuccessful` | `Payment successful!` |
| `O_OrderTracker_SubtextHeader_1` | `Please allow some time for your order to be accepted` |
| `O_OrderTracker_SubtextHeader_5` | `Your order has been accepted` |
| `O_OrderTracker_SubtextHeader_20` | `Your order is being prepared…` |
| `O_OrderTracker_SubtextHeader_13` | `Please collect your food at Counter` |
| `O_BackToOrderTracker` | `Back to ORDER Tracker` |
| Benefits bullet | `Track your orders in real-time` |

**Rendered tracker layout / selectors:** **TODO** — `/OrderTracker` page not downloaded this pass; only keys + URL shells verified.

### States
Status enum largely via `O_OrderTracker_OrderStatus_*` and subtext headers — map to UI **TODO** until page captured.

### Responsive behavior
**TODO**.

### Reuse (Thailand parity)
Keep tracker wording from Singapore keys. Do not invent status labels. Capture live DOM before building Thailand tracker.

---

## 15. Footer

### Purpose
Legal/allergen link, copyright, optional footer slider, scroll-top, mobile cart clearance.

### Structure (verified)
- `footer#footer` → `.footer` → `.container-fluid`
- Menu: `ul.list-inline.footer-menu` → `Allergen Information` → `/Home/TermsConditions`
- `ul.list-inline.socials` — empty in snapshot
- `.copy` / `.copyrights-copy` — `©2026 Laduree Paris. Powered by` + link `Getz` → `http://getz.co`
- `#scroll-top.hidden` — `i.fa.fa-chevron-up`
- Optional `#main-slide` footer slider `data-slider="footer-slider"`
- Contains mobile `.homepage-cart-button-display` (View Cart)

Allergen page content: `h2` `Allergen Information` + full-width images (TermsConditions snapshot).

### States
Default olive footer bg `--main-color`; white link/copy text (theme). Scroll-top `.hidden` until JS shows — **TODO** trigger details.

### Responsive behavior
`@media (max-width: 991px)` footer `margin-bottom: 64px` for View Cart bar.

### Reuse (Thailand parity)
Keep `Allergen Information` label and Powered by Getz pattern unless legal requires owner-approved change (legal is an allowed difference). Year/brand string follow Singapore unless owner directs.

---

## 16. Buttons

### Purpose
Primary actions across browse → cart → pay.

### Structure / variants (verified)

| Variant | Selectors | Label / notes |
| --- | --- | --- |
| Member | `a.btn-login` | `Member?`; border/bg `--main-color`, radius `12px`, 12px bold white; hover invert |
| ADD | `.btn-3.btn-sm.btn-add-to-cart.btn-grey` | `ADD` |
| Unavailable | `.btn-border-red.unavailableflag` | `Unavailable` |
| Checkout | `#btnCheckOut.btn-checkout` | `Checkout` + amount + qty |
| View Cart | `.btn-homepage-cart-display` | `View Cart`; uppercase 14px bold |
| Modal primary (legacy pink) | `#btnMatchOutlet.button-done` etc. | Inline `#fd576b` on some Done/Start Order buttons |
| Proceed Payment | `#btnProceedPayment.btn-grey` | `Proceed Payment` |
| Qty ± | `.btn-change-quantity` | icons only |

### States
| State | Verified |
| --- | --- |
| Default / hover | `.btn-login:hover`; checkout hover token `--main-button-hover-color` |
| Disabled | ADD `pointer-events: none`; qty button opacity |
| Active | **TODO** per-variant beyond login/nav |

### Responsive behavior
Checkout/View Cart full-width treatments on small screens; login appears desktop + mobile.

### Reuse (Thailand parity)
Exact labels (`ADD`, `Checkout`, `View Cart`, `Member?`). Prefer theme tokens over legacy `#fd576b` where colour-scheme overrides apply — document computed winner when implementing.

---

## 17. Inputs

### Purpose
Search, phone, postal, notes, login/guest fields, qty display.

### Structure (verified samples)
| Input | Selector | Notes |
| --- | --- | --- |
| Product search | `#txtSearch.stxtProductSearch` | Inside `.input-1.placeholder-typing-effect` |
| Qty display | `input.quantity-product-value` | `disabled`, centered |
| Postal | `#PostalCodeModal` flows | `Please input the postal code for delivery`; `Enter` |
| Item note | `#addNoteForItemModal` | `Tap to add note` |
| Checkout member form | inside `#CheckOutConfirmModal` | `.form_login`; validation classes |
| Payment phone | `#select-payment-options-popup` | mobile number entry |

### States
| State | Verified |
| --- | --- |
| Default | Theme borders via `.border-color-by-theme` on qty |
| Error | `input.input-validation-error` → `border: 1px solid #b94a48` |
| Disabled | Qty input always disabled in card stepper |
| Placeholder typing effect | class present; animation details **TODO** |

### Responsive behavior
Desktop search `hidden-xs hidden-sm`; mobile search toggle class `seach-input-icon` (source spelling) in mobile header.

### Reuse (Thailand parity)
Same field labels/validation chrome. Phone/postal rules may follow Thailand ops only where allowed.

---

## 18. Dropdowns

### Purpose
MENU categories, service switcher, delivery outlet sort, misc selects.

### Structure (verified)
| Dropdown | Selector | Options / notes |
| --- | --- | --- |
| MENU | `#getz-menu-mainsub-category` + `.dropdown-menu-getz` | Category links; hover open |
| Service (mobile) | `.dropdown.dropdown-service` | `Pick-up`, `Delivery` |
| Outlet sort | `#dropdown-sort-selecter.time-selector-dropdown` | Distance / earliest / latest delivery / menu availability |
| Bootstrap caret menus | `data-toggle="dropdown"` | Standard BS3 |

### States
Default / hover-open (Getz menu) / selected option. Disabled **TODO**.

### Responsive behavior
MENU desktop-only in header; mobile uses `#menu-mb` list instead of hover dropdown.

### Reuse (Thailand parity)
Keep MENU/service option labels. Sort labels are platform English — match Singapore.

---

## 19. Calendar

### Purpose
Pick fulfillment date (and related time slots) for pickup/delivery.

### Structure (verified)
- Modals: `#timeModal`, `#dateModal`, `#selectTimeModal` (reservation)
- Widgets: `#datetimepicker12`, `#datetimepicker3`, `#datetimepicker123`
- CSS: `/Content/jquery.datetimepicker.css` (linked multiple times on homepage)
- Cart display formats: `12 Jul 2026 (Today)` + `02:15 PM To 02:30 PM`; alternate `12 Jul 2026 at 14:15 - 14:30` in `#collect_datetime_tw`

Date chips / month navigation live inside modal body HTML — full calendar cell markup **TODO** for exhaustive DOM (plugin-generated).

### States
| State | Verified |
| --- | --- |
| Available / selected | Shown in cart once chosen |
| Unavailable date | `This date is not available for pickup` / delivery |
| Adjusted | Timeslot adjusted tooltip |
| Loading slots | **TODO** |

### Responsive behavior
Modals scrollable; mobile back chevron on `#btn-timeModal-close` / `#btn-dateModal-close`.

### Reuse (Thailand parity)
Same modal titles (`Pick-up`, `Choose Date & Time`). Slot windows/hours from Thailand ops only.

---

## 20. Modal

### Purpose
Platform dialog system (Bootstrap 3 + custom popups) for service, product, checkout, errors, loading.

### Structure (verified common pattern)
```
div.modal.fade#{id}[data-backdrop][data-keyboard]
  .modal-dialog (.modal-xl | .modal-lg | .modal-dialog-small | vertical helpers)
    .modal-content
      .modal-header (.header-title) + close / close-left
      .modal-body (.bodycontainer.scrollable)
      .modal-footer (optional)
```

**Custom popups (non-BS class naming):** `#select-payment-options-popup`, `#place-order-popup`, `#outlet-and-datetime-popup` use `.popup-dialog` / `.popup-content` / `.popup-close`.

**Inventory of notable modals:** `#deliveryModal`, `#timeModal`, `#dateModal`, `#selectTimeModal`, `#brachIndexModal`, `#outletsModal`, `#productDetailModal`, `#CheckOutConfirmModal`, `#loadingModal`, `#timeoutRetryModal`, `#sessionTimeOut`, `#outletChanged`, `#orderingtime`, `#modalDiscount`, `#PostalCodeModal`, plus many `Err*` / promotion confirms.

### States
Open/close via Bootstrap; `data-backdrop="static"` on several; error/alert variants with `#FD576B` media headers on some warnings.

### Responsive behavior
`.vertical-alignment-helper` / `.vertical-align-center` centering; mobile `close-left` back SVG filled `#84754e`; desktop `Closeclose.svg`.

### Reuse (Thailand parity)
Reuse modal chrome and close patterns. Don’t invent new dialog types for the same flows.

---

## 21. Toast

### Purpose
Ephemeral success/error notifications.

### Finding
**No dedicated toast library verified** on homepage (`toastr` / `iziToast` / `noty` / `snackbar` absent).

Localization keys exist for cart feedback (`O_ItemAddedToCart`, `O_ItemIsAddedIntoCart`) but **rendered toast UI not verified**.

### Alert / banner equivalents (verified)
| Equivalent | Selector | Role |
| --- | --- | --- |
| Offline banner | `#slow-notice` | See Loading / offline |
| Bootstrap alerts | `.alert.alert-danger` | Date unavailable, discount min purchase, etc. |
| Tooltips | `#limitAmount_error`, `#date_time_adjusted` | Fulfillment warnings |
| Progress on add | `#show-progress-bar-when-add-item` | Shell only |
| Session warning modal | `#sessionTimeOut` | Blocking, not toast |

### States / responsive / reuse
**TODO** for true toasts. For Thailand parity: prefer Singapore’s alert/modal/banner patterns; do not invent a new toast system unless Singapore is later shown to use one.

---

## 22. Empty states

### Purpose
Communicate empty cart / nothing to checkout / no outlet selected.

### Structure (verified)
| Empty state | Selector | Copy |
| --- | --- | --- |
| Cart empty | `#ErrNothingToCheckout` `.danger_message` | `Your cart is empty.Add at least 1 item to checkout!` |
| No item checkout | `#ErrNoItemToCheckout` | `No item to checkout. Please add item(s) into the cart.` |
| No outlet | `#lbCurrentSelectedOutlet` | `No Outlet Selected` |
| Socials / rewards / slider | empty containers | No empty- enticing marketing copy |

Promotion page empty messaging: **TODO** (page fetched; distinctive empty promo copy not confirmed this pass).

### States
Hidden vs shown via `.hidden` / `display:none` on messages.

### Responsive behavior
Messages sit inside cart sidebar / modal bodies; same copy on mobile off-canvas cart.

### Reuse (Thailand parity)
Exact empty strings (including the missing space in `empty.Add`).

---

## 23. Loading states

### Purpose
Blocking and inline wait indicators; offline recovery.

### Structure (verified)
| Loader | Selector / asset | Notes |
| --- | --- | --- |
| Loading modal | `#loadingModal` | `i.fa.fa-spin.fa-spinner.fa-5x` |
| Retry modal | `#timeoutRetryModal` / `#retryModal` | `Having trouble with internet?`; `Please press ok to try again.`; `OK` |
| Tab spinner | `#iprocessingtab.fa.fa-spinner.fa-spin` | Default `display:none` |
| Modal-loading library | `modal-loading.css` + `modal-loading-animate.css` | `.modal-mask` → `.modal-loading` → `.loading-animate` |
| Lazy products | `.LazyLoading.product-container` | Product grid lazy load |
| Offline banner | `#slow-notice` | See below |
| Group order loader | `#groupOrderLoader` | id present; **TODO** |

**`#slow-notice`** (`slow-notice.css`):
- Copy: `No Internet Connection.`; `Please check your internet connection and try again.`; `[x] dismiss`
- Visual: width `300px`; centered; bg `#ff9800`; white 13px; default `display: none`; `z-index: 100`

### States
Hidden → shown by JS; dismiss sets cookie `dismissed` for slow-notice.

### Responsive behavior
Slow-notice absolutely positioned top center (not full-width bar). Loading modal centered spinner.

### Reuse (Thailand parity)
Same offline/retry/loading copy and chrome.

---

## Component → page evidence map

| Component | `/` | `/Category` | `/Recommendations` | `/Promotion` | `/Home/Hours` | `/Home/TermsConditions` |
| --- | --- | --- | --- | --- | --- | --- |
| Header / Nav / Footer | ✓ | ✓ shared | ✓ shared | ✓ shared | ✓ shared | ✓ shared |
| Hero (slider shell) | ✓ | — | — | — | — | — |
| Announcement | ✓ | — | — | — | — | — |
| Outlet / Pickup workflow | ✓ overlays | ✓ | ✓ | ✓ | ✓ | ✓ |
| Category rail + product cards | ✓ | ✓ | ✓ list | **TODO** promo cards | — | — |
| Cart / Checkout / Payment overlays | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Product detail modal | shell | shell | shell | shell | shell | shell |
| About / Hours CMS | — | — | — | — | ✓ | — |
| Allergen | footer link | footer | footer | footer | footer | ✓ content |
| Track Order / Order confirmation page | keys only | keys | keys | keys | keys | keys |

---

## Outstanding TODOs (gaps)

1. **Hero/slider slide assets & copy** — empty `home-slider` / `footer-slider` shells only  
2. **Product detail modal body field matrix** — AJAX-filled  
3. **`#selectOptionPaymentModal` HTML/labels** — CSS only in this pass  
4. **Non-empty cart line-item component**  
5. **True Toast system** — not verified; use alert/banner equivalents  
6. **Order Tracker & post-payment confirmation page DOM** — keys/URLs only (`/OrderTracker` not fetched)  
7. **Dedicated `/Checkout` page snapshot**  
8. **Calendar plugin-generated cell markup** beyond modal chrome + datetimepicker ids  
9. **Promotion empty/list card specifics** on `/Promotion`  
10. **Computed checkout button background cascade** (`style_v2` vs legacy `style.css`)  
11. **Announcement popup `#announcementpopup` body** (empty in snapshot)  
12. **Mobile menu open animation** and search-toggle behavior details  

---

## Cross-cutting notes

1. Currency strings mix `SGD  31.00`, cart totals, and checkout `$ 0.00` — Thailand must use THB / `฿…` with owner-approved prices.  
2. Service label `Pick-up` vs cart row `Pickup Time` — both verified; keep both.  
3. `Member?` appears desktop header, mobile header, and cart mobile header.  
4. `Promotions` in mobile menu only on audited desktop nav.  
5. Class `bg-pink` is olive (`--main-color`) under colour-scheme.  
6. Source spellings to preserve when matching selectors: `brachIndexModal`, `seach-input-icon`, `aplly-promo-code-*`, `quatity` in View Cart class names.
