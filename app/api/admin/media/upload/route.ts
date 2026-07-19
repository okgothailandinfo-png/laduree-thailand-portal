import { handleApi } from "@/src/server/api/handle";
import { created } from "@/src/server/api/responses";
import { requireAdminWrite } from "@/src/server/admin/auth";
import {
  assertRateLimit,
  clientSubjectFromRequest,
} from "@/src/server/http/rate-limit";
import { adminMediaService } from "@/src/server/services/container";
import { logEvent } from "@/src/server/utils/logger";
import { AppError, isAppError } from "@/src/server/utils/errors";

export async function POST(request: Request) {
  return handleApi(async () => {
    await requireAdminWrite(request);
    await assertRateLimit({
      bucket: "media-upload",
      subject: clientSubjectFromRequest(request),
      maxAttempts: 30,
      windowMs: 60_000,
    });
    try {
      const formData = await request.formData();
      const data = await adminMediaService.upload(formData);
      return created(data);
    } catch (error) {
      if (isAppError(error) && error.code === "VALIDATION_ERROR") {
        logEvent.mediaUploadRejected({ code: error.code });
      }
      throw error instanceof AppError
        ? error
        : error;
    }
  }, request);
}
