import { NextResponse } from "next/server";
import { env } from "@/src/server/config/env";
import {
  createRequestId,
  REQUEST_ID_HEADER,
} from "@/src/server/http/request-context";

/**
 * GET /api/health — liveness. Does not check dependencies.
 */
export async function GET(request: Request) {
  const requestId = createRequestId(request.headers.get(REQUEST_ID_HEADER));
  return NextResponse.json(
    {
      status: "ok",
      version: process.env.npm_package_version ?? "0.1.0",
      environment: env.appEnv,
      timestamp: new Date().toISOString(),
      requestId,
    },
    {
      status: 200,
      headers: { [REQUEST_ID_HEADER]: requestId },
    },
  );
}
