# Sprint 33B — Product Architecture Generalization

**Scope:** Explicit product ordering behaviors (`CONFIGURABLE_BOX` / `FIXED_PACK` / `SIMPLE_PRODUCT`), pack metadata, delivery eligibility capability, OrderItem historical snapshots.  
**Out of scope:** Thailand product/price import (33C), Admin modifier CMS UI (later Admin/CMS sprint), speculative OPTIONAL_CONFIGURABLE storefront flow.

## Architecture

| Behavior | Customer action | Exact-selection engine | `packSize` |
|----------|-----------------|------------------------|------------|
| `CONFIGURABLE_BOX` | Select required internal composition | Yes (`usesExactSelection`) | Optional metadata (e.g. 8) |
| `FIXED_PACK` | Buy pack qty only | No (even if noise groups present) | Pack unit metadata |
| `SIMPLE_PRODUCT` | Purchase qty only | No | `null` |
| `OPTIONAL_CONFIGURABLE` | Architecture-ready enum only | No forced exact | Optional |

- Selection rules remain on **modifier groups**, never category names.
- Existing Sprint 18 / 20.7 exact-selection helpers are preserved; cart/checkout/order **gate** them by `productBehavior`.
- `deliveryEligible` defaults `true` (pickup-preserving). Thailand values filled in 33C. DELIVERY checkout rejects `false`.

**Sprint 33C update:** Application helpers are fail-closed — only explicit `deliveryEligible === true` is treated as eligible. Unresolved/undefined does **not** create a delivery promise. Schema DB default may still be `true`; imports must write explicit booleans.

## Prisma / migration

**Migration:** `prisma/migrations/20260812140000_product_behavior_architecture/`

- Enum `ProductBehavior`
- `Product.productBehavior`, `Product.packSize`, `Product.deliveryEligible`
- `OrderItem` snapshots: `productBehavior`, `packSize`, `exactSelectionQuantity`, `deliveryEligible` (nullable for legacy)

**Deploy requirement:** run `prisma migrate deploy` on staging/production after owner approval. Do **not** apply to production from this sprint alone.

## Neutralized copy (owner confirmation recommended)

Generic (no longer Macaron-hardcoded):

- `formatExactSelectionMaximumMessage` → `You have selected the maximum of {n}.`
- `formatExactSelectionIncompleteMessage` → `Please select all {n} before adding this box to your cart.`
- Cart gate `incompleteSelection` → `Complete your selection.`

Singapore-aligned progress strings unchanged (`Please select {n}`, etc.). Product titles/allergen/storage copy untouched.

## Deferred

- **33C:** Thailand master import (names, THB prices, images, real eligibility, availability)
- **Admin/CMS:** Modifier-group editor UI (API already accepts behavior/pack/modifiers)
- **OPTIONAL_CONFIGURABLE:** No speculative PDP/cart UI

## Tests

Covered in `npm run test:pickup` including:

- `lib/product/product-behavior.test.ts`
- Cart FIXED_PACK / SIMPLE_PRODUCT paths
- Checkout OrderItem snapshots + delivery ineligibility
- Existing exact-selection / Sprint 28–33A suites
