import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/**
 * Prisma Client singleton - مطلوب لـ Vercel serverless.
 * Development: instance واحدة عبر globalThis. Production: عميل واحد لكل serverless instance (يستخدم env DATABASE_URL فقط).
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
