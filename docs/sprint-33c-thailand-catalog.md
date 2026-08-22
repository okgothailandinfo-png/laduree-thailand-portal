# Sprint 33C — Thailand Product & Content Safe-Draft Integration

**Scope:** Import owner-approved Thailand Product Master LDR001–LDR038 as typed catalog source of truth; map Sprint 33B behaviors; fail-closed commerce; replace SG/mock sellable catalog on local/mock path.  
**Not authorized:** live selling, production DB deploy, PSP, delivery activation, unapproved prices/options/images.

## Source of truth

- `data/thailand-product-master.ts` — typed Product Master rows + category hierarchy
- `lib/catalog/thailand-product-import.ts` — validation + domain materialization
- `lib/catalog/product-purchasability.ts` — purchasability gates

## Safe-Draft rules

| Gate | Import behavior |
|------|-----------------|
| Price `n/a` | `priceMinor=null` (never 0; never SGD) |
| Status `Draft` | `isActive=false` |
| Availability blank / conflict | `available=false` |
| Delivery unresolved | `deliveryEligible=false` (workbook `1` not approved) |
| Missing flavour options | empty `options[]`; non-purchasable |
| EN content | imported where present |
| TH `n/a`/blank | omitted (no invented TH) |
| Images | `/product-placeholder.svg` only |

## ProductBehavior distribution (approved)

- CONFIGURABLE_BOX: 11 (macaron + Eugénie)
- FIXED_PACK: 14
- SIMPLE_PRODUCT: 13

## Storefront (mock)

- Categories: Thailand hierarchy + All Items
- Products: LDR001–LDR038
- Non-production list includes Draft LDR rows for catalog QA
- Cart/checkout/order reject non-purchasable products
- DEV fixtures isolated in `DEV_BEHAVIOR_FIXTURES` (tests only)

## Delivery fail-closed (app layer)

`isDeliveryEligibleProduct` / snapshots require **explicit `true`**. Unresolved → ineligible. No Prisma schema migration in this sprint.
