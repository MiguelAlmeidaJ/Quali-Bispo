import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

export { PrismaClient };
export type { Prisma } from "./generated/prisma/client";

/** Open a PostgreSQL-backed Prisma 7 client. Call $disconnect() during shutdown. */
export function createPrismaClient(connectionString = process.env.DATABASE_URL): PrismaClient {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to create a Prisma client.");
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}
