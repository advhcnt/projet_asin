import "dotenv/config";

import { prisma } from "../lib/prisma";

const lignes = await prisma.rendezVous.findMany({
  where: { id: { in: [292, 742, 826] } },
  orderBy: { id: "asc" },
});

console.log(
  lignes.map((l) => ({
    id: l.id,
    dateHeureISO: l.dateHeure.toISOString(),
    local: l.dateHeure.toString(),
  })),
);

await prisma.$disconnect();
