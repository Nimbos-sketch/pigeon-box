import { ok } from "@/server/http";

export async function GET() {
  return ok({ status: "ok", time: new Date().toISOString() });
}
