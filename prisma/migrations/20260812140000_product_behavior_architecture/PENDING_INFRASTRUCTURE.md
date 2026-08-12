# Sprint 33B — Product behavior architecture migration

**Migration:** `20260812140000_product_behavior_architecture`

## Status

- Created in-repo for deploy pipelines.
- **Do not apply to production** from the Sprint 33B implementation branch without owner/deploy approval.
- Local/staging: `npx prisma migrate deploy` (or `db:deploy`) when DATABASE_URL is available.

## Adds

- Enum `ProductBehavior`: CONFIGURABLE_BOX | FIXED_PACK | SIMPLE_PRODUCT | OPTIONAL_CONFIGURABLE
- `Product.productBehavior` (default SIMPLE_PRODUCT)
- `Product.packSize` (nullable)
- `Product.deliveryEligible` (default true — preserves pickup; Thailand values in 33C)
- `OrderItem` snapshots: `productBehavior`, `packSize`, `exactSelectionQuantity`, `deliveryEligible` (nullable for legacy rows)
