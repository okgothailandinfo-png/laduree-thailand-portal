/**
 * Backend foundation entry — layered API for Ladurée Thailand pickup.
 *
 * Route handlers live in app/api/* and delegate here.
 * Repository selection: DATA_SOURCE=mock|prisma (see docs/backend-repositories.md).
 */

export { env, getDataSource, resolveDataSource } from "@/src/server/config/env";
export { handleApi } from "@/src/server/api/handle";
export { ok, created, fail, toErrorResponse } from "@/src/server/api/responses";
export {
  productService,
  categoryService,
  boutiqueService,
  pickupService,
  orderService,
  cartService,
} from "@/src/server/services/container";
export { createRepositories } from "@/src/server/repositories/create-repositories";
