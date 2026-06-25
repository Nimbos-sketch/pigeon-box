import { handlers } from "@/lib/auth";
import { logger } from "@/lib/logger";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const { GET: authGet, POST: authPost } = handlers;

export async function GET(request: NextRequest) {
  try {
    return await authGet(request);
  } catch (error) {
    logger.error({ err: String(error) }, "Auth GET callback failed");
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    return await authPost(request);
  } catch (error) {
    logger.error({ err: String(error) }, "Auth POST callback failed");
    throw error;
  }
}
