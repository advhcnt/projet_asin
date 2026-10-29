import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 ne charge plus les variables d'environnement automatiquement :
// `dotenv/config` lit le fichier .env, et la CLI utilise cette URL.
// Le repli local permet de lancer `prisma generate` sans base accessible.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@localhost:5432/unpetittest?schema=public",
  },
});
