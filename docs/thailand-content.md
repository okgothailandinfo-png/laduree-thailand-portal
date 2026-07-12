# Thailand Localization Content

**Scope:** Approved Thailand-only operational and commercial data.  
**Rule:** Everything else (IA, nav, system wording, buttons, categories, workflow chrome, design) must match https://www.laduree.sg exactly.  
**Copy rule:** Do not invent customer-facing copy. Missing values are `TODO` until the project owner supplies them.

| Field | Value |
| --- | --- |
| **Companion docs** | `docs/singapore-ui-audit.md`, `docs/components.md`, `docs/user-flow.md`, `docs/design-tokens.md` |
| **Governing rules** | `.cursor/rules/singapore-portal-parity.mdc`, `.cursor/rules/thailand-localization.mdc` |

---

## Brand

| Item | Value | Status |
| --- | --- | --- |
| Brand | Ladurée Thailand | Approved (project locale default) |

Customer-facing chrome labels, category names, and system strings still follow Singapore unless an item in this file is explicitly approved to replace them.

---

## Country

| Item | Value | Status |
| --- | --- | --- |
| Country | Thailand | Approved (project locale default) |

---

## Currency

| Item | Value | Status |
| --- | --- | --- |
| Currency | THB | Approved (project locale default) |
| Display format | `฿1,290` (preferred); `THB 1,290` when that form is required | Approved (project locale default) |
| Product / cart prices | TODO | Owner-supplied Thailand retail prices only — never FX-convert from SGD |

---

## Outlet

| Item | Value | Status |
| --- | --- | --- |
| Outlet name | TODO | |
| Outlet code | TODO | |
| Outlet display name (header / cart / selector) | TODO | |

---

## Address

| Item | Value | Status |
| --- | --- | --- |
| Full address | TODO | |
| Short address (cart / outlet modal) | TODO | |
| Map / coordinates | TODO | |

---

## Opening Hours

| Item | Value | Status |
| --- | --- | --- |
| Opening hours | TODO | |

---

## Last Order

| Item | Value | Status |
| --- | --- | --- |
| Last order time | TODO | |

---

## Timezone

| Item | Value | Status |
| --- | --- | --- |
| Timezone | Asia/Bangkok | Approved (project locale default) |

---

## Date format

| Item | Value | Status |
| --- | --- | --- |
| Date format | DD/MM/YYYY | Approved (project locale default) |
| Time format | 24-hour | Approved (project locale default) |

---

## Phone

| Item | Value | Status |
| --- | --- | --- |
| Phone | TODO | |

---

## Email

| Item | Value | Status |
| --- | --- | --- |
| Email | TODO | |

---

## LINE OA

| Item | Value | Status |
| --- | --- | --- |
| LINE Official Account | TODO | |
| LINE OA URL / ID | TODO | |

---

## Tax / Legal

| Item | Value | Status |
| --- | --- | --- |
| Tax treatment / VAT display rules | TODO | |
| Legal entity / company name | TODO | |
| Allergen / terms assets | TODO | |
| Footer copyright / powered-by legal line | TODO | |
| Privacy / other legal pages | TODO | |

Footer link label `Allergen Information` and other Singapore system labels stay until legal explicitly requires an approved replacement recorded here.

---

## Pickup policy

| Item | Value | Status |
| --- | --- | --- |
| Pickup policy (customer-facing) | TODO | |
| Pickup slot / cutoff rules (ops) | TODO | |

Do not invent policy copy. Singapore service UI labels (`Pick-up`, `Select Outlet To Pickup Order`, `Pickup Time`, etc.) remain until replaced only where this file records owner-approved Thailand policy text.

---

## Delivery policy

| Item | Value | Status |
| --- | --- | --- |
| Delivery policy (customer-facing) | TODO | |
| Delivery charges / zones / postal rules | TODO | |
| Delivery payment / commercial notes | TODO | |

Do not invent policy copy. Singapore delivery UI labels and validation strings remain unless an approved Thailand replacement is recorded here.

---

## Approval log

| Date | Section | Approver | Notes |
| --- | --- | --- | --- |
| — | Locale defaults (Brand, Country, Currency format, Timezone, Date/Time format) | Project rules | From `.cursor/rules/thailand-localization.mdc` |
| — | Outlet, Address, Hours, Last Order, Phone, Email, LINE OA, Tax/Legal, Pickup/Delivery policy, prices | — | TODO — awaiting owner |

When the owner supplies data, replace the matching `TODO`, set Status to **Approved**, and add a row to this log.

---

## End

This file is the only place for Thailand localization values. Unlisted customer-facing content must follow Singapore. No invented copy.
