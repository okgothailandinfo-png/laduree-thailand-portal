import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { pickupService } from "@/src/server/services/container";
import { AppError } from "@/src/server/utils/errors";

export async function GET(request: Request) {
  return handleApi(async () => {
    const { searchParams } = new URL(request.url);
    const boutiqueId = searchParams.get("boutiqueId");
    const dateKey = searchParams.get("dateKey");

    if (!boutiqueId || !dateKey) {
      throw new AppError(
        "VALIDATION_ERROR",
        "boutiqueId and dateKey query parameters are required.",
        { details: { fields: ["boutiqueId", "dateKey"] } },
      );
    }

    const data = await pickupService.getAvailability({ boutiqueId, dateKey });
    return ok(data);
  });
}
