import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });
}

function isStalePrismaClient(client: PrismaClient): boolean {
  return !("organization" in client) || !("pigeonHole" in client);
}

function getPrismaClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (cached && !isStalePrismaClient(cached)) {
    return cached;
  }
  if (cached) {
    void cached.$disconnect().catch(() => undefined);
  }
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const db = getPrismaClient();
