# Admin / CMS Modifier Gaps (Sprint 20.7)

Storefront DTOs and mock catalog now support configuration-driven modifier groups. Full Admin CRUD and Prisma persistence are deferred to a later Content Management sprint.

## Supported on Product model / storefront DTO today

- Fixed-size selection quantity (`exactSelectionQuantity`)
- Required / optional groups (`required`, `requiredText`, inference helpers)
- Min / max selection (`minSelection`, `maxSelection`)
- Option price (`optionDetails[].priceMinor`, THB satang; null = no approved price)
- Sort order (`sortOrder` on groups and option details)
- Active / inactive (`isActive` on groups and option details)
- Required acknowledgement flag (`isAcknowledgement`)
- Product-level quantity (outer box qty, independent of flavour total)
- Availability (`available`, `isActive` on product)

## Admin gaps (later sprint)

1. Prisma tables/JSON for modifier groups and option details (currently `modifierGroups: []` on Prisma mapper).
2. Admin product create/update DTOs and UI for modifier groups.
3. Admin fields for allergen label/text (domain fields exist; Prisma columns do not).
4. Validation UI for exact-selection quantity vs option counts.
5. Preview of Pickup-appropriate acknowledgement copy (never ship delivery-only wording for Pickup SKUs).
6. Price approval workflow so add-on `priceMinor` cannot be invented in Admin without owner sign-off.

## Content rule

Until owner approval, Thailand acknowledgement and add-on prices must remain `[CONTENT PENDING APPROVAL]` / `priceMinor: null` (UI `฿ —`).
