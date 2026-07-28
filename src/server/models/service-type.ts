/** Fulfillment service type — extends Pickup without replacing it. */
export type ServiceType = "PICKUP" | "DELIVERY";

export const SERVICE_TYPES = ["PICKUP", "DELIVERY"] as const;

export function isServiceType(value: unknown): value is ServiceType {
  return value === "PICKUP" || value === "DELIVERY";
}
