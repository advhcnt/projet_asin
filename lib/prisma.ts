import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/lib/generated/prisma/client";

/**
 * Prisma 7 exige un adaptateur de pilote. Le client est mis en cache sur
 * `globalThis` pour survivre au rechargement à chaud de Next en développement.
 */
function creerClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL est manquante : copiez .env.example vers .env et renseignez la base.",
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const globalPourPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalPourPrisma.prisma ?? creerClient();

if (process.env.NODE_ENV !== "production") {
  globalPourPrisma.prisma = prisma;
}
