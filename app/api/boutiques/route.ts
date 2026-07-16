import { handleApi } from "@/src/server/api/handle";
import { ok } from "@/src/server/api/responses";
import { boutiqueService } from "@/src/server/services/container";

export async function GET() {
  return handleApi(async () => {
    const data = await boutiqueService.listBoutiques();
    return ok(data);
  });
}
