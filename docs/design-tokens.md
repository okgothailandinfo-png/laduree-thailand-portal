# Ladurée Singapore — Design Tokens

**Source of truth:** https://www.laduree.sg  
**Audited:** 12 July 2026  
**Method:** Extracted from live HTML CSS variables and linked stylesheets (`colour-scheme.css`, `style.css`, `custom_new_ui.css`, `font-style.css`, `style_v2.min.css`, `homepage.min.css`, `bootstrap.css`, `GetzThemMenuLeftRightAuto.css`, `remove-logo-box-shadow.css`).  
**Rule:** Do not invent values. Unverified items are marked `TODO`.

Theme tokens below are the merchant-configured Ladurée Singapore values. Where Bootstrap defaults remain visible underneath theme overrides, both are noted.

---

## 1. Color palette

### Theme CSS variables (live homepage `:root` / inline theme)

| Token | Value | Role |
| --- | --- | --- |
| `--main-color` | `#84754e` | Primary olive / brand |
| `--main-activated-color` | `#84754e` | Activated / accent (same as primary on this merchant) |
| `--main-light-color` | `#84754e14` | Primary at ~8% alpha |
| `--main-color-40` | `#84754e40` | Primary at ~25% alpha |
| `--main-scrollbar-color` | `#84754e80` | Scrollbar (~50% alpha) |
| `--main-background-page-color` | `#fdf8ec` | Page / header shell background |
| `--main-background-item-color` | `#fdf8ec` | Item / panel background |
| `--main-background-item-color-60` | `#fdf8ec60` | Item bg ~38% alpha |
| `--main-background-item-color-80` | `#fdf8ec80` | Item bg ~50% alpha |
| `--main-button-hover-color` | `#d5e4c0` | Button / nav hover wash |
| `--main-announcement-text-color` | `#ffffff` | Text on primary buttons / announcements |
| `--main-font-family` | `"Lora", sans-serif` | (typography; listed for completeness) |

### Applied / supporting colors (verified in theme/component CSS)

| Value | Where observed |
| --- | --- |
| `#FFFFFF` / `#fff` | Surfaces, footer link/copy on primary, buttons text |
| `#000000` / `#000` | Body text (`style.css` body), titles |
| `#7F7F7F` | `.title-4` hover (desktop) |
| `#85807B` | `.text-gray-color` |
| `#F0F0F0` | Vertical product card background |
| `#F8F8F8` | Horizontal product card background (mobile rule) |
| `#ececec` | Horizontal product card border |
| `#e6e6e6` | Mobile sticky cart bar top border |
| `#ddd` / `#ccc` | Borders (menus, Bootstrap inputs) |
| `#d9d9d9`, `#ebebeb`, `#e1e1e1`, `#d7d7d7` | Misc borders / input chrome |
| `#555555` / `#555` | Bootstrap `.form-control` text; some menu titles |
| `#a7a7a7` | Inactive service tab label color (`style.css`) |
| `#6c6c84` | `.title-5` default color |
| `#515151` | Struck price (`.price-line-through`) |
| `#80858a` | Homepage input placeholder |
| `#181818` | Homepage `.input-group-name` text |
| `#FFC700` | Star recommendation color (`.color-by-star`) |
| `#DA534F` | Cart badge / promo-ish red override |
| `#fd576b` | Legacy pink accents still present in base `style.css` (often overridden by `--main-color`) |
| `#333` | `#btnCheckOut` background in `style.css` (see Buttons) |
| `#66afe9` | Bootstrap `.form-control:focus` border (default framework) |

### Homepage.min extra CSS variables

| Token | Value |
| --- | --- |
| `--promo-code-color` | `#1565c0` |
| `--voucher-color` | `#00b900` |
| `--expired-color` | `#636a79` |

### CMS inline colors (About Us content, not theme tokens)

| Value | Where |
| --- | --- |
| `#84754e` | About Us body text |
| `rgb(95, 80, 53)` | About Us store headings |
| `#615236`, `#8a764f` | Delivery charges announcement table text |

---

## 2. Typography

| Role | Family | Source |
| --- | --- | --- |
| Primary UI (`--main-font-family`) | `"Lora", sans-serif` | Live theme + `font-style.css` |
| Lora files | `/Content/fonts/custom-fonts/Lora/Lora.woff`, `.ttf` | `@font-face` in homepage HTML (`font-weight: normal`) |
| Also loaded | Google Fonts `Lato` (100,300,400,700,900) | `<link>` on homepage |
| Also imported | `Bebas Neue` | `@import` in `homepage.min.css` |
| Base `style.css` body fallback | `"Helvetica Neue", Helvetica, Arial, sans-serif` | Overridden for branded UI by `font-style.css` → Lora |
| About Us CMS paragraphs | `georgia, serif` | Inline CMS styles on `/Home/Hours` |
| Cart arrow label (colour-scheme) | `Roboto` (named in rule) | `#header .cart .fa-arrow-left span` |
| Icons | Font Awesome 4.3.0 | Linked stylesheet |

`font-style.css` forces Lora on: `body`, branch name, service tabs, brand name, titles (`.title-2`, `.title-4`), cart product titles, modals, promotion title, tracker titles, datetime picker, etc.

---

## 3. Font sizes

Verified recurring / component sizes:

| Size | Where |
| --- | --- |
| `14px` | Body (`style.css`), `.title-4`, `.text-clamp-overflow-item`, Bootstrap `.form-control`, branch text, homepage name input |
| `12px` | `.btn-login` (`style_v2`) |
| `13px` | `.btn-checkout` override (smaller variant in `style_v2`); tab labels via `em(13px)` in `style.css` |
| `15px` | `.item-products .text-clamp-overflow-item` |
| `16px` | `.btn-checkout` primary rule; footer menu / copyrights |
| `18px` | Modal cart arrow span; various headings |
| `20px` | Popup titles; some welcome modal inputs |
| `22px` | `.promotion-title`, `.order-total-title` (colour-scheme) |
| `23px` | `.modal-body h4` (`font-style.css`) |
| `27px` | `.tracker-services-available` |
| `0.92857em` | `#footer .footer` (~13px if 14px root) |
| `1em` | Vertical card `h3`; `#menu-mb .title-5` |
| `75%` | Struck-through price |
| About Us CMS | `18px` paragraphs; `16px` store block |

Bootstrap also ships many sizes; merchant UI above is authoritative for branded surfaces.

---

## 4. Font weights

| Weight | Where observed |
| --- | --- |
| `normal` / `400` | Lora `@font-face`; body `font-weight: 400`; `.title-4` |
| `500` | Service tab labels; cart arrow span |
| `600` | `.branch__text` |
| `700` / `bold` | `.btn-login`; popup titles; `#btnCheckOut`; footer menu; various CTAs |
| `bolder` | `#menu-mb .title-5` |
| `300` | Present in CSS corpus (Lato load) — component mapping **TODO** beyond font link |

---

## 5. Line heights

| Value | Where |
| --- | --- |
| `1.2` | `body` in `style.css` |
| `1.3` | `.title-2 > a` |
| `1.42857143` | Bootstrap body / `.form-control` |
| `17px` | Vertical card title links |
| `18px` | Floating category titles (colour-scheme) |
| `20px` | Bootstrap navbar links |
| `22px` | Recurring in theme CSS |
| `24px` | Popup title (`style_v2`) |
| `32px` / `33px` | Header cart icon/label line-heights |
| `160%` / `140%` | Present in CSS corpus — specific component mapping **TODO** |

---

## 6. Spacing scale

No named spacing-token system was found. Verified recurring spacing values:

| Value | Common uses |
| --- | --- |
| `2px` | Micro paddings |
| `3px` | Branch text padding-top; `#bodyMainHome` margin-top |
| `5px` | Card/title offsets; input-group margins |
| `6px` | `.title-4` vertical margin; Bootstrap input padding |
| `8px` | Tab span padding; homepage input padding; popup gaps |
| `10px` | Popup title padding; mobile sticky cart padding; checkout area padding |
| `12px` | `.title-4` horizontal margin; footer padding-bottom; Bootstrap input horizontal padding |
| `15px` | Bootstrap grid gutter half; card text margins; navbar link horizontal padding; popup content padding |
| `16px` | Nav bar padding-top; cart tabs margin-bottom |
| `18px` | Checkout button horizontal padding; footer menu item padding |
| `19px` | Footer menu left padding |
| `20px` | Product card margin-bottom |
| `27px` | Footer socials margin-top |
| Bootstrap `.row` | `margin-left/right: -15px` |
| Bootstrap columns | `padding-left/right: 15px` (standard Bootstrap 3) |

Formal 4/8 spacing scale document: **TODO** (not defined as tokens on site).

---

## 7. Border radius

| Value | Where |
| --- | --- |
| `0` / `0px` | Some legacy buttons (`.btn-border-red` in `style.css`) |
| `3px` | Quantity badge radius (homepage cart) |
| `4px` | Bootstrap inputs; MENU dropdown (`GetzThemMenu…`) |
| `5px` | `#btnCheckOut` in `style.css`; some input-group buttons |
| `8px` | Vertical product cards + image top corners + ADD bottom corners |
| `10px` | Horizontal product cards (mobile colour-scheme rule) |
| `12px` | `.btn-checkout`, `.btn-login`, service `.nav-tabs` container |
| `16px` | Homepage `.input-group-name` |
| `20px` | Header side cart tab (`20px 0 0 20px`) |
| `24px 24px 0 0` | Bottom sheet `.popup-dialog` |
| `50%` | Circular controls (scroll-top etc.) |

---

## 8. Border widths

| Width / style | Where |
| --- | --- |
| `1px solid var(--main-color)` | Primary themed borders (ADD outline / login / etc.) |
| `1px solid #ececec` | Horizontal product cards |
| `1px solid #e6e6e6` | Mobile sticky cart bar |
| `1px solid #ccc` | Bootstrap `.form-control` |
| `1px solid #ddd` | Menus / Bootstrap tabs |
| `1px solid rgba(0,0,0,0.15)` | MENU dropdown |
| `2px solid var(--main-color)` | Occurs in theme CSS |
| `2px solid transparent` | Legacy `.btn-grey` in `style.css` |
| `10px solid var(--main-color)` | `#checkoutArea4Click` frame |

---

## 9. Shadows

| Value | Where |
| --- | --- |
| `none` | Logo box-shadow forced off: `#header .navbar-brand { box-shadow: none !important; }` (`remove-logo-box-shadow.css`) |
| `0 6px 12px rgba(0,0,0,0.175)` | MENU dropdown |
| `0 3px 5px 0 rgba(0,0,0,.25)` | Service tabs container |
| `0px -4px 4px rgba(0,0,0,0.25)` | Header side cart tab |
| `0 -3px 15px rgba(0,0,0,.06)` | Mobile sticky cart bar |
| `0 -4px 4px rgba(255,255,255,.16), inset 0 2px 2px rgba(0,0,0,.15)` | Bottom sheet popup (also related variants) |
| `inset 0 1px 1px rgba(0,0,0,0.075)` | Bootstrap inputs |
| `0 0 6px rgba(0,0,0,0.5)` | Logo rule in `style.css` (overridden to `none` for this merchant) |

Stronger Bootstrap modal shadows exist in framework CSS; merchant-facing emphasis is the list above.

---

## 10. Button styles

### Primary ADD (cart add) — `.btn-grey` via colour-scheme (wins over base)

- Text: `var(--main-announcement-text-color)` → `#ffffff`
- Background: `var(--main-color)` → `#84754e`
- Hover background: `var(--main-button-hover-color)` → `#d5e4c0`
- Used with `.btn-add-to-cart` / `.btn-3` / `.btn-sm` classes on product cards
- Label: `ADD`

### Unavailable — `.btn-border-red` (themed)

- Background: `#fff`
- Border: `1px solid var(--main-color)`
- Color: `var(--main-color)`
- Bottom corners on vertical cards: `8px`
- Label: `Unavailable`

### Member login — `.btn-login` (`style_v2`)

- Border: `1px solid var(--main-color)`
- Radius: `12px`
- Background: `var(--main-color)`
- Padding: `5px 8px`
- Color: `#fff`
- Weight: `700`
- Size: `12px`
- Letter-spacing: `.04em`
- Hover: text `var(--main-color)`, background `#fff`

### Checkout — `#btnCheckOut` / `.btn-checkout`

From `style.css`:

- `#btnCheckOut`: background `#333`; radius `5px`; `font-weight: bold`

From `style_v2.min.css`:

- `.btn-checkout`: width `100%`; `text-transform: uppercase`; color `#fff`; height `46px`; font-size `16px` (also `13px` override present); letter-spacing `.3px`; padding-left/right `18px` (also `10px` override); radius `12px`

From `colour-scheme.css`:

- `#btnCheckOut:hover`: background `var(--main-button-hover-color)`
- Checkout frame `#checkoutArea4Click`: `border: 10px solid var(--main-color)`

Effective resting background when themed: **TODO** to confirm computed paint order in browser (base `#333` vs theme/`bg-pink` parent). Parent cart panels use `.bg-pink` → `background-color: var(--main-color)`.

### Mobile sticky View Cart — `.btn-homepage-cart-display`

- Background: `var(--main-color)`
- Color: `#fff`
- Height: `44px`
- Letter-spacing: `.6px`
- Bar padding: `10px 15px 12px`
- Bar shadow: `0 -3px 15px rgba(0,0,0,.06)`

### Bootstrap `.btn-primary`

Framework default blues remain in `bootstrap.css` but colour-scheme overrides `.btn-primary` to `--main-color` + white text.

---

## 11. Input styles

### Bootstrap `.form-control` (base)

- Height: `34px`
- Padding: `6px 12px`
- Font-size: `14px`
- Line-height: `1.42857143`
- Color: `#555555`
- Background: `#fff`
- Border: `1px solid #ccc`
- Radius: `4px`
- Shadow: `inset 0 1px 1px rgba(0,0,0,0.075)`
- Focus border: `#66afe9` + blue glow shadow

### Homepage name-style field — `.input-group-name`

- Background: `#ebebeb`
- Radius: `16px`
- Border: `0`
- Padding: `8px 20px 8px 30px`
- Height: `48px`
- Font-size: `14px`
- Weight: `normal`
- Color: `#181818`
- Placeholder: `#80858a`

### Welcome / join modal inputs

- Font-size: `20px`
- Background: `#FFF`
- Padding-left: `50px`
- Height: `40px`

### Linked file `form_new_ui.css`

Referenced by homepage HTML but returned **HTTP 404** at audit time → additional form token details: **TODO** (re-fetch when available).

### Placeholders observed in DOM

`Search items`, `Delivery location postal code`, `Enter your name `, `Tap to add note`, `Type the request in here`, `Voucher Code / Phone Number`, etc.

---

## 12. Header

| Property | Verified value |
| --- | --- |
| Shell background | `#header > .inner`, brand-name, `#container` → `var(--main-background-page-color)` (`#fdf8ec`) |
| Mobile fixed bar | `.header__navbar`: `position: fixed`; `background-color: #fff`; `width: 100%`; `z-index: 4` |
| Logo (`.navbar-brand`) | Width `170px`; `background #fff`; `margin-top: 10px`; padding `0`; box-shadow removed for this merchant |
| Nav active/open | Color `var(--main-color)` |
| Nav hover | `var(--main-button-hover-color)` / also rules setting `var(--main-color)` |
| Hamburger bars | `var(--main-color)` |
| Side cart tab | Width `47px`; height `258px`; bg `var(--main-color)`; radius `20px 0 0 20px`; shadow `0px -4px 4px rgba(0,0,0,0.25)`; top `33px` |
| Cart badge | `#DA534F` |
| Branch label | Uppercase; `14px`; weight `600`; Lora |

Desktop vs mobile header composition differs (logo + MENU + RECOMMENDED + About Us + Member? vs compact service/search/cart). Exact desktop header total height: **TODO** (computed; JS adjusts `#header` height from `.header__navbar`).

---

## 13. Footer

| Property | Verified value |
| --- | --- |
| Background | `#footer .footer { background-color: var(--main-color); }` |
| Link color | `#FFFFFF` |
| Copyright (`.copyrights-copy`) | `#FFFFFF`; `16px` |
| Menu items | `16px`; `font-weight: bold`; horizontal padding `19px` / `18px` |
| Footer font-size | `0.92857em` |
| Padding-bottom | `12px` |
| Socials margin-top | `27px` |
| Mobile clearance | `@media (max-width: 991px) { footer#footer { margin-bottom: 64px !important; } }` (inline/related rule observed in audit HTML) |

---

## 14. Navigation

### Desktop primary nav

- Labels: `Home`, `MENU` (dropdown), `RECOMMENDED`, `About Us`, `Member?`
- MENU dropdown panel: width `250px`; bg `#fff`; radius `4px`; border `1px solid rgba(0,0,0,0.15)`; shadow `0 6px 12px rgba(0,0,0,0.175)`
- Dropdown item padding: `5px 15px 5px 10px`; hover bg `#f5f5f5`
- Active color: `var(--main-color)`

### Mobile menu `#menu-mb`

- Width: `80%`
- Off-canvas transform; transition `.4s`
- Background base `#eee` in `style.css`; list accent `var(--main-color)`
- Section title `.title-5`: padding `12px`; border-bottom `1px solid #ddd`

### Service tabs (cart)

- Container height `50px`; bg `#fff`; radius `12px`; shadow `0 3px 5px 0 rgba(0,0,0,.25)`
- Active tab span bg: `var(--main-color)`

---

## 15. Cards

### Vertical product card (`.thumbnail-1`)

- Background: `#F0F0F0`
- Radius: `8px`
- Margin-bottom: `20px`
- Image top radius: `8px`
- Title: `14px`, 2-line clamp
- Price color: `var(--main-color)`
- Title/price left margin often `15px`

### Horizontal product card (mobile colour-scheme)

- Background: `#F8F8F8`
- Radius: `10px`
- Border: `1px solid #ececec`
- Margin-bottom: `20px`

### Cart panels

- `.bg-pink` → `background-color: var(--main-color)` (name is legacy; color is olive)

---

## 16. Forms

Documented from Bootstrap + homepage/modal rules (see §11).

Additional form stylesheet `form_new_ui.css`: **TODO** (404 at audit).

Payment option popup / checkout field chrome: partially in `select-payment-method.css` + `style_v2` popups — full field-by-field matrix: **TODO** (interactive checkout pass).

Popup sheet pattern (`style_v2`):

- Radius `24px 24px 0 0`
- Padding `15px`
- Gap `8px`
- Title: `700`, `20px` / `24px` line-height, uppercase, `#000`

---

## 17. Breakpoints

Most used in merchant + Bootstrap CSS:

| Breakpoint | Role |
| --- | --- |
| `767px` / `768px` | Bootstrap / phone ↔ tablet |
| `991px` / `992px` | Primary mobile ↔ desktop chrome split (sticky View Cart, fonts, layout) |
| `1199px` / `1200px` | Bootstrap large |
| Also present | `320`, `375`, `480`, `540`, `1024`, `1152` in various rules |

Homepage sticky cart explicitly: `@media (max-width: 991px)`.

---

## 18. Grid

Bootstrap 3 grid (linked `bootstrap.css`):

| Token | Value |
| --- | --- |
| Gutter | `15px` padding per column side; `.row` margins `-15px` |
| `.container` widths | `750px` @≥768, `970px` @≥992, `1170px` @≥1200 |
| Ordering layout | Content `col-md-8` + cart `col-md-4` (observed in homepage structure) |
| Fluid shells | `.container-fluid` used in header/footer/home |

---

## 19. Mobile behavior

Verified behaviors:

1. **≤991px:** show fixed bottom homepage cart bar (`.homepage-cart-button-display`) with `View Cart`; footer gains bottom margin (~`64px`) to clear bar.
2. **Off-canvas menu** `#menu-mb` (~`80%` width) for Home / Recommended / Promotions / About Us / Menu Categories.
3. **Fixed white** `.header__navbar` for compact header controls (service, search, member, cart).
4. **Product cards** switch toward horizontal treatment with `#F8F8F8` + `10px` radius + `#ececec` border.
5. **Service selection** uses full-width tab headers / bottom sheets (`border-radius: 24px 24px 0 0`).
6. **Touch:** `-webkit-overflow-scrolling: touch` on body/menu.
7. **Animation:** sticky cart `show-homepage-cart-btn` `.4s ease-in-out`.

Exact safe-area / iOS notch handling: **TODO**.

---

## Implementation notes for Thailand

- Prefer merchant CSS variables (`--main-*`) over hard-coding, matching Singapore values unless owner approves a token change.
- Lora is the mandated UI face for branded chrome; do not replace with invented fonts.
- Logo shadow must remain `none` for this brand configuration.
- Do not invent a spacing scale beyond observed values without measuring corresponding Singapore components again.

---

## Outstanding TODOs

1. Contents of `form_new_ui.css` (404 during audit)  
2. Computed checkout button resting background (cascade confirmation in DevTools)  
3. Exact desktop header total height  
4. Full payment-form field styling matrix  
5. Named spacing scale (none published by site)  
6. iOS safe-area / PWA mobile specifics  
7. Bebas Neue usage map (imported; component coverage not fully traced)
