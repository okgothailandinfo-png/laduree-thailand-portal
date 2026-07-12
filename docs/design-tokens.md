# Ladurée Singapore — Design Tokens

| Field | Value |
| --- | --- |
| **Source of truth** | https://www.laduree.sg |
| **Audit date** | 2026-07-12 |
| **Method** | Downloaded homepage HTML; downloaded linked CSS assets with version query strings from HTML `href`s; extracted tokens only from those files and inline `:root` / `@font-face` in the homepage. No invented values. Uncertain items marked **TODO**. |
| **Asset version query** | `?v=27.20260706-124` (where present on hrefs) |

## CSS assets reviewed

| File | Path | Status |
| --- | --- | --- |
| Homepage HTML | `/` | 200 |
| `colour-scheme.css` | `/Content/css_newUI/colour-scheme.css` | 200 |
| `style.css` | `/Content/css_newUI/style.css` | 200 |
| `custom_new_ui.css` | `/Content/css_newUI/custom_new_ui.css` | 200 |
| `font-style.css` | `/Content/css_newUI/font-style.css` | 200 |
| `style_v2.min.css` | `/Content/themes/css-v2/style_v2.min.css` | 200 |
| `homepage.min.css` | `/Content/v2/css/homepage/homepage.min.css` | 200 |
| `bootstrap.css` | `/Content/css_newUI/bootstrap.css` | 200 — Bootstrap **v3.4.1** |
| `GetzThemMenuLeftRightAuto.css` | `/Content/themes/GetzThemMenuLeftRightAuto.css` | 200 |
| `remove-logo-box-shadow.css` | `/Content/custom-theme/remove-logo-box-shadow.css` | 200 |
| `select-payment-method.css` | `/Content/css_newUI/select-payment-method.css` | 200 |
| `slow-notice.css` | `/Content/slow-notice.css` | 200 |
| `form_new_ui.css` | `/Content/css_newUI/form_new_ui.css` | **404** — linked from homepage; not available for extraction |

Also linked on homepage but not fully audited in this pass: Owl carousel CSS, print CSS, modal-loading CSS, Font Awesome, jQuery UI, datetimepicker, product-details.min.css, getz-dropdownhover.css, S3 `styleCustom.css`.

---

## Color palette

### CSS custom properties (`:root`)

**Observed in:** inline `<style>` on homepage HTML. `colour-scheme.css` consumes these via `var(--main-*)`.

| Token | Value | Role (from name / usage) |
| --- | --- | --- |
| `--main-color` | `#84754e` | Primary brand / chrome |
| `--main-light-color` | `#84754e14` | Light tint of main (8-digit hex) |
| `--main-activated-color` | `#84754e` | Active / selected (same as main on this tenant) |
| `--main-background-page-color` | `#fdf8ec` | Page background |
| `--main-background-item-color` | `#fdf8ec` | Item / panel background |
| `--main-button-hover-color` | `#d5e4c0` | Button / control hover |
| `--main-announcement-text-color` | `#ffffff` | Text on brand fills (e.g. `.btn-grey`) |
| `--main-scrollbar-color` | `#84754e80` | Scrollbar (alpha) |
| `--main-color-40` | `#84754e40` | Borders (e.g. product detail footer top) |
| `--main-background-item-color-60` | `#fdf8ec60` | Background with alpha |
| `--main-background-item-color-80` | `#fdf8ec80` | Background with alpha |
| `--main-font-family` | `"Lora", sans-serif` | Primary UI font stack |

**Homepage / voucher vars** (`homepage.min.css` `:root`):

| Token | Value | Observed with |
| --- | --- | --- |
| `--promo-code-color` | `#1565c0` | Promo code UI |
| `--voucher-color` | `#00b900` | Voucher UI |
| `--expired-color` | `#636a79` | Expired state |

### Supporting colors (hardcoded; where observed)

| Color | Where observed | Notes |
| --- | --- | --- |
| `#ffffff` / `#fff` | Buttons, footer links, tab labels, cart chrome | Ubiquitous white |
| `#000000` / `#000` | `.brand-name` (`colour-scheme.css`); `body` text (`style.css`) | |
| `#333` / `#333333` | Payment modal secondary buttons | |
| `#555` / `#555555` | Inactive tab chrome (`.tab .nav-tabs`), service tabs | |
| `#7F7F7F` | Slider dots (`colour-scheme.css`) | |
| `#d7d7d7` | Cart category borders; dotted item dividers | |
| `#DA534F` | `#header a#my-cart-count .fa-shopping-cart span` badge | Cart count badge |
| `#FD576B` | Delivery modal hover accents; older pink accents in `style.css` | Coexists with brand olive; not CSS-var driven |
| `#FF7A00` | `.btn-action-required-*` | Action-required CTAs |
| `#ff9800` | `#slow-notice` background (`slow-notice.css`) | |
| `#b94a48` | `input.input-validation-error` border | Validation |
| `#fcf8e3` / `#faebcc` / `#8a6d3b` | `.content-minimum-delivery` (warning panel) | |
| `#F0F0F0` / `#f0f0f0` | Payment modal header / voucher sections | |
| `#777777` | Payment radio `small` helper text | |
| `#d90000` | `.text-red-color` (`select-payment-method.css`) | |
| `#CCCCCC` | Secondary button borders in payment modals | |
| `#8a764f` | Inline announcement HTML on homepage | Content color close to but **not** identical to `--main-color` `#84754e` |
| `#615236` | Inline announcement HTML on homepage | Content-only |
| `#C2AE83` / `#c2ae83` | Commented scrollbar / animation rules | Mostly commented; treat cautiously |
| `#cbb991` | `.mobile-progress-bar-dilivery .content` border | |
| `#301b20` | `homepage.min.css` | **TODO:** map exact selectors/roles |
| `#edeee0` | `style_v2.min.css` | **TODO:** map exact selectors/roles |
| Bootstrap `#337ab7` `.btn-primary` | `bootstrap.css` | Overridden by `colour-scheme.css` for themed buttons |

**TODO:** Full inventory of every hex in `style.css` / `style_v2.min.css` with semantic naming. Above list is verified but not exhaustive.

---

## Typography / font family

### Primary (tenant)

| Token / rule | Value | Source |
| --- | --- | --- |
| `@font-face` `Lora` | `font-weight: normal`; `src`: `/Content/fonts/custom-fonts/Lora/Lora.woff`, `.ttf`; `font-display: swap` | Inline homepage HTML |
| `--main-font-family` | `"Lora", sans-serif` | Inline homepage `:root` |
| Application | `body`, headings, cart titles, tabs, modals, tracker, etc. use `font-family: var(--main-font-family) !important` | `font-style.css` |

### Also declared (not the live body default under `font-style.css`)

| Family | Where | Notes |
| --- | --- | --- |
| `"Helvetica Neue", Helvetica, Arial, sans-serif` | `body` in `style.css` (`font-size: 14px`, `font-weight: 400`, `line-height: 1.2`) | Base stack; **overridden** by `font-style.css` |
| `'Open Sans', sans-serif` | `.brand-name` in `style.css` | Also overridden toward Lora via `font-style.css` |
| `'SweetlyBroken', cursive, sans-serif` | `@font-face` + decorative title rules in `style.css` | Specialty display font |
| `FontAwesome` | `style.css` `@font-face` | Icons |
| `"Glyphicons Halflings"` | `bootstrap.css` | Bootstrap icons |
| `sans-serif` | `#slow-notice` | Explicit exception |

Homepage also links Google Fonts **Lato** stylesheet and `homepage.min.css` imports **Bebas Neue** — usage map beyond presence: **TODO**.

**TODO:** Confirm whether additional Lora weights (bold/italic) are loaded elsewhere; only `font-weight: normal` `@font-face` was verified on the homepage.

---

## Font size scale

**No named type scale** (no `--font-size-*` tokens). Verified recurring `font-size` values from brand CSS:

| Size | Approx. frequency | Verified usage examples |
| --- | --- | --- |
| `14px` | Very high | `body` (`style.css`); homepage cart CTA; many UI labels |
| `12px` | High | `.panel-title > a`; meter text; compact labels |
| `16px` | High | Footer menu/copy; checkout button; cart “items added” |
| `13px` | Medium | `#slow-notice`; various compact UI |
| `18px` | Medium | Action-required buttons; mobile tab router; voucher titles |
| `20px` | Medium | `.title-2` (`style.css`); mobile cart tab item |
| `15px` | Lower | Footer copy variants; `.to-order-now` |
| `10px`–`11px` | Low | Compact icons / reward info |
| `22px` | Low | `.promotion-title` |
| `23px` | Low | `.modal-body h4` (`font-style.css` `!important`) |
| `24px` | Low | `.welcome-page-h4`; `.back-to-menu` |
| `26px`–`27px` | Low | Tracker / voucher; `.tracker-services-available` → `27px !important` |
| `12pt` | Low | `.btn-view-changes` |
| `em` / `%` | Various | e.g. `#footer .footer` `0.92857em` / `0.6875em` in media blocks |

Base body size verified: **14px** (`style.css`).

---

## Font weights

No CSS-var weight tokens. Verified values in brand CSS:

| Weight | Frequency (approx.) | Examples |
| --- | --- | --- |
| `bold` / `700` | High | Titles, mobile tab router, homepage cart CTA, checkout |
| `500` | Medium | Tab labels; `.clear-items`; payment radio labels; quantity value |
| `400` / `normal` | Medium | Body / default |
| `600` | Lower | Tracker copy; `.brand-name` in `style.css` |
| `300` | Rare | `.alcoholic-policy__message` |
| `200` | Rare | `.title-order-status-header` |

**TODO:** Whether Lora `@font-face` actually serves 500/600/700 or browser synthesizes — only normal face verified in HTML.

---

## Line heights

No named scale. Verified recurring values:

| Value | Notes / examples |
| --- | --- |
| `1.2` | `body` (`style.css`) |
| `1.42857143` | Bootstrap `.btn` / `.form-control` |
| `1.3` | `.title-2 > a`; product modal subtitle; payment helpers |
| `1.5` | Payment radio labels |
| `17px` | Many v2 / homepage buttons (checkout tracker, homepage cart) |
| `20px` / `22px` / `16px` / `18px` / `14px` | Component-specific |
| `160%` / `140%` / `100%` | Occasional percentage line-heights |

---

## Letter spacing

No named scale. Verified values:

| Value | Where |
| --- | --- |
| `.2px` | Frequent in `homepage.min.css` |
| `.4px` | `style_v2` outlet/datetime titles |
| `.5px` | Voucher status names (`homepage.min.css`) |
| `.6px` | Homepage cart / mark-as-ready buttons |
| `.3px` | `.cart-block .btn-checkout` |
| `1px` | Payment options popup titles (`style_v2`) |
| `.04em` / `.01em` | Occasional popup text |
| `1.08px` | Announcement OK button |
| `35px` / `12px` | `.text-2` decorative (`style.css`) — specialty |

---

## Spacing scale

**No named spacing scale** (no `--space-*` tokens).

### Observed recurring padding/margin values (brand CSS)

| Value | Approx. uses |
| --- | --- |
| `0` | Very high |
| `5px` | High |
| `10px` | High |
| `15px` | High |
| `20px` | Medium |
| `8px` | Medium |
| `30px` | Lower |
| `3px` / `4px` / `6px` / `12px` / `16px` / `25px` / `35px` | Present |

Bootstrap grid gutter pattern: `.container` uses **15px** horizontal padding; `.row` uses `margin-left/right: -15px`. This build also contains `[class*="col-"] { padding-right: 0; padding-left: 0; }` — verified customization of Bootstrap 3.

**TODO:** Formal reduced spacing token set would require design intent not published in CSS.

---

## Border radius

No named radius tokens. Verified recurring values:

| Value | Examples |
| --- | --- |
| `4px` | Bootstrap `.btn` / `.form-control`; `#header .navbar-toggle`; quantity buttons (mobile) |
| `5px` | `#content-tab-main` bottom corners; floating category; cart tracker button |
| `6px` | Payment modal header corners |
| `8px` | Product thumbnails / vertical products; bottom of `btn-border-red` on cards |
| `12px` | `.btn-checkout`; homepage cart CTA |
| `20px` / `20px 20px 0 0` | Service tabs; cart side panel `20px 0 0 20px` |
| `50%` | Circles (scroll-top, radio custom) |
| `0` / `0px` | Many tabs / squared controls |

---

## Border width

| Value | Notes |
| --- | --- |
| `1px` | Dominant (buttons, inputs, dividers, footer borders) |
| `2px` | Less common (e.g. chevron borders in mobile login) |
| `3px` | Tab top indicator height uses `height: 3px` (not always border-width) |

Default themed outline button: `1px solid var(--main-color)`.

---

## Button styles

Bootstrap base (`.btn` in `bootstrap.css`): `padding: 6px 12px`; `font-size: 14px`; `line-height: 1.42857143`; `border-radius: 4px`; `font-weight: normal`; transparent border.

### Themed primary fills (`colour-scheme.css`)

| Selector | Properties (verified) |
| --- | --- |
| `.btn-primary` | `color: #fff`; `background-color: var(--main-color) !important`; `border-color: var(--main-color) !important` |
| `.btn-danger` | `color: #fff !important`; `background-color: var(--main-color) !important`; `border-color: var(--main-color) !important` |
| `.btn-danger:hover` | `background-color: var(--main-button-hover-color) !important`; `color: #fff !important`; `border-color: #dcd8d8 !important` |
| `.btn-grey` | `color: var(--main-announcement-text-color) !important`; `background-color: var(--main-color) !important` |
| `.btn-grey:hover` | `background-color: var(--main-button-hover-color) !important` |
| `.btn-proceed-to-payment` | Brand fill; hover → `--main-button-hover-color` |
| `.btn-number` | Brand fill; desktop hover → `--main-button-hover-color` |
| `.post-code-block .btn-next` | Brand fill |
| `.btn-view-changes` | Brand fill + `font-size: 12pt`; hover inverts |

### Outline / secondary

| Selector | Properties |
| --- | --- |
| `.btn-border-red` | `background-color: #fff !important`; `border: 1px solid var(--main-color) !important`; `color: var(--main-color) !important` |
| `.btn-border-red:hover` | fill `--main-button-hover-color`; `border: 1px solid #fff`; `color: #fff` |
| `.btn-border-promotion` | Same outline pattern as `.btn-border-red` |

### Action-required (non-brand orange)

| Selector | Properties |
| --- | --- |
| `.btn-action-required-background` | `border: 1px solid #FF7A00`; `min-width: 270px`; `font-size: 18px`; `background-color: #FF7A00`; `color: #ffffff` |
| `.btn-action-required-border` | White fill, `#FF7A00` text/border; same sizing |

### Homepage cart CTA (`homepage.min.css`)

`.btn-homepage-mark-as-ready`, `.btn-homepage-cart-display`:

- `background-color: var(--main-color)`; `color: #fff`
- `letter-spacing: .6px`; `line-height: 17px`; `text-transform: uppercase`; `font-weight: 700`; `font-size: 14px`
- `border: 1px solid rgba(255,255,255,.5)`; `border-radius: 12px`; `height: 44px`; `padding: 8px 15px`

### Checkout (`style_v2.min.css`)

`.btn-checkout`: `width: 100%`; `text-transform: uppercase`; `color: #fff`; `height: 46px`; `font-size: 16px`; `letter-spacing: .3px`; `padding-left/right: 18px`; `border-radius: 12px !important`  

Background fill via theme / parent — **TODO:** confirm computed background if not in the same rule block.

`.cart-block .btn-view-order-tracker`: brand fill, white text, `border-radius: 5px`, `height: 44px`, `font-weight: 700`, `font-size: 16px`, uppercase.

### Payment modal secondary (`select-payment-method.css`)

`.btn-return-previous-screen` / `.btn-back-to-cart`: `background: #FFFFFF`; `color: #333333`; `border: 1px solid #CCCCCC`; typically `min-width: 200px`; `height: 40px`.

### Disabled

`.btn-disabled` (`custom_new_ui.css`): `cursor: not-allowed`; `opacity: 0.65`; `box-shadow: none`.

---

## Form styles

### Bootstrap baseline (`bootstrap.css`)

`.form-control`: `height: 34px`; `padding: 6px 12px`; `font-size: 14px`; `line-height: 1.42857143`; `color: #555555`; `background: #fff`; `border: 1px solid #ccc`; `border-radius: 4px`; inset shadow.

### Theme overrides (`colour-scheme.css`)

| Selector | Properties |
| --- | --- |
| Quantity / modifier text inputs | `border-color: var(--main-color) !important` |
| `.theme-radio-color input[type='radio']` | Custom 20×20 circle; `border: 1px solid var(--main-color)`; checked fill `var(--main-color)` |
| `input.input-validation-error` | `border: 1px solid #b94a48` |
| `.modal .time-selector-dropdown`, `.modal .input-group-addon` | `border-color: var(--main-color) !important` |
| `.search-form .input-1 input.stxtProductSearch:focus` | `background-color: var(--main-background-item-color) !important` |

### Payment / voucher forms (`select-payment-method.css`)

- Radio rows: `border: 1px solid #f0f0f0`; `padding: 15px 5px`; active `box-shadow: 2px 4px 10px 6px rgba(0,0,0,0.1)`
- Labels: `font-size: 16px`; `font-weight: 500`; `line-height: 1.5`
- Helpers: `color: #777777`; `line-height: 1.3`

### `form_new_ui.css`

**404 — no form tokens from this file.** Homepage still links it. **TODO:** confirm if S3 `styleCustom.css` or other sheets replace it.

---

## Navigation styles

| Area | Verified rules |
| --- | --- |
| Header nav links | `#header .navbar-nav li.active > a` / `.open > a` → `color: var(--main-color) !important` |
| Desktop hover | Competing rules: `--main-button-hover-color`, `--main-color`, and legacy `#fd576b` in `style.css` — **TODO:** resolve cascade on live homepage |
| Tabs | `.tab .nav-tabs li > a`: uppercase, `font-weight: 500`, muted `#a7a7a7`; active span `background-color: var(--main-color)` |
| Service tabs | `.tab-service-main .tab-service-item.active`: `background: var(--main-color)`; white text; `border-radius: 20px 20px 0 0` |
| Mobile tab router | `.mobile-tab__header--nav .nav-tabs-router`: white bg, black text, uppercase, `font-weight: 700`, `font-size: 18px` |
| Category dropdown | `GetzThemMenuLeftRightAuto.css`: menu `width: 250px`; `background: #fff`; `border-radius: 4px`; `border: 1px solid rgba(0,0,0,0.15)`; shadow `0 6px 12px rgba(0,0,0,0.175)`; hover `#f5f5f5` |
| Left menu | `#idMenuLeft .nav > li` `border-right: 1px solid #ffffff` |

---

## Header

| Selector / trait | Verified |
| --- | --- |
| `#header.header` | `min-height: 90px` (`style.css`) |
| `#header` | `box-shadow: 0 0 1px #ebebeb` |
| `#header .navbar-brand` | `width: 170px`; `background-color: #fff`; shadow in `style.css` **removed** by `remove-logo-box-shadow.css` (`box-shadow: none !important`) |
| `#header .navbar-toggle .icon-bar` | `background-color: var(--main-color) !important` |
| `#header > .inner`, `.brand-name`, `#container` | `background-color: var(--main-background-page-color) !important` |
| Cart rail (`#header .cart`) | Size/position in `colour-scheme.css`; homepage forces white cart bg; icon uses `--main-color` |
| Cart badge | `#DA534F` |

Sticky brand-name variants exist (`height: 57px` / `60px`, white background) in `style.css`.

---

## Footer

| Selector | Verified |
| --- | --- |
| `footer` | `background-color: var(--main-color) !important` (`colour-scheme.css`) |
| `#footer .footer` | `background-color: var(--main-color)` |
| `#footer .footer a` | `color: #FFFFFF` |
| `#footer` | `text-align: center` |
| `#footer .footer-menu > li` / `.copy > a` | Bold; sizes **16px** or **15px** depending on media block |
| Social icons | `40×40` hit area; `.fa` at `2em` (mobile block) |
| Product-detail footers | Use `--main-color` / `--main-background-item-color` / `--main-color-40` borders |

---

## Grid

| System | Verified |
| --- | --- |
| Framework | Bootstrap **3.4.1** |
| Columns | 12-column: `.col-xs-*`, `.col-sm-*`, `.col-md-*`, `.col-lg-*` |
| `.container` widths | `750px` (≥768px), `970px` (≥992px), `1170px` (≥1200px); base `padding-left/right: 15px` |
| `.row` | `margin-left/right: -15px` |
| Column padding | Customized: `[class*="col-"] { padding-left: 0; padding-right: 0; }` present in this build |

Homepage / cart also use **flex** and occasional **CSS grid** — not a separate named grid token system.

---

## Responsive breakpoints

### Bootstrap 3 (primary grid)

| Name | Query | Container width |
| --- | --- | --- |
| Extra small | `<768px` (default) | auto / 100% |
| Small | `min-width: 768px` | `750px` |
| Medium | `min-width: 992px` | `970px` |
| Large | `min-width: 1200px` | `1170px` |

Also common: `max-width: 767px`, `768px–991px`, `992px–1199px`.

### Additional breakpoints observed in brand CSS

Frequently used: `320px`, `375px`, `400px`, `420px`, `460px`, `480px`, `568px`, `736px`, `767px` / `768px`, `991px` / `992px`, `1023px` / `1024px`, `1151px` / `1152px`, `1200px`.

These are **ad hoc**, not a documented custom scale beyond Bootstrap’s.

---

## Outstanding TODOs

1. **`form_new_ui.css` — HTTP 404** (linked but missing).
2. No formal spacing / type / radius **named token system** beyond `--main-*` color/font vars.
3. Hover color cascade for header nav (brand olive vs `#fd576b`) — needs computed-style check in browser.
4. Lora weight files beyond `normal` not verified.
5. Exhaustive hex inventory in legacy `style.css` / pink accent system not fully catalogued.
6. Out-of-scope sheets (S3 `styleCustom.css`, Font Awesome, Owl, etc.) may add tokens.
7. `.btn-checkout` background fill rule pairing if not inherited from a shared themed class.
8. Map roles for `#301b20` and `#edeee0`.
9. Lato / Bebas Neue usage map.

---

## Files used for extraction

Homepage HTML, `colour-scheme.css`, `style.css`, `custom_new_ui.css`, `font-style.css`, `style_v2.min.css`, `homepage.min.css`, `bootstrap.css`, `GetzThemMenuLeftRightAuto.css`, `remove-logo-box-shadow.css`, `select-payment-method.css`, `slow-notice.css`.
