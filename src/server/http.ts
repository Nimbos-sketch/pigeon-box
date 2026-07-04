import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export function ok<T>(data: T) {
  return NextResponse.json(data, { status: 200 });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(error: unknown, context: string) {
  logger.error({ err: error instanceof Error ? error.message : String(error), context }, "API error");
  const clientMessage = env.isProduction ? "Internal server error" : error instanceof Error ? error.message : "Internal server error";
  return fail(clientMessage, 500);
}
