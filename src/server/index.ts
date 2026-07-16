/**
 * Backend foundation entry — layered mock API for Ladurée Thailand pickup.
 *
 * Route handlers live in app/api/* and delegate here.
 */

export { env } from "@/src/server/config/env";
export { handleApi } from "@/src/server/api/handle";
export { ok, created, fail, toErrorResponse } from "@/src/server/api/responses";
export {
  productService,
  categoryService,
  boutiqueService,
  pickupService,
  orderService,
} from "@/src/server/services/container";
