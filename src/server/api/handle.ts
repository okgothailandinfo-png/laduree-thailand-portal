import { toErrorResponse } from "@/src/server/api/responses";

/**
 * Thin wrapper so route handlers share consistent error → response mapping.
 */
export async function handleApi(
  run: () => Promise<Response> | Response,
): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    return toErrorResponse(error);
  }
}
