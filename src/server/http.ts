import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export function ok<T>(data: T) {
  return NextResponse.json(data, { status: 200 });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(error: unknown, context: string) {
  logger.error({ err: error, context }, "API error");
  return fail(error instanceof Error ? error.message : "Internal server error", 500);
}
