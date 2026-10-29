/** Lit un corps JSON sans faire échouer la route sur une saisie mal formée. */
export async function lireCorpsJson(
  request: Request,
): Promise<Record<string, unknown> | null> {
  try {
    const corps: unknown = await request.json();
    if (typeof corps !== "object" || corps === null || Array.isArray(corps)) {
      return null;
    }
    return corps as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Code agent facultatif : 10 caractères maximum (contrainte de la base). */
export function lireAgent(
  request: Request,
  corps: Record<string, unknown> | null,
): string {
  const candidat = corps?.agent ?? request.headers.get("x-agent");
  if (
    typeof candidat === "string" &&
    /^[A-Za-z0-9-]{1,10}$/.test(candidat)
  ) {
    return candidat;
  }
  return "AG-01";
}

export function erreurInterne(erreur: unknown): Response {
  console.error(erreur);
  return Response.json(
    { erreur: "Erreur interne du serveur" },
    { status: 500 },
  );
}

/** Identifiant numérique de route (`/api/rendez-vous/42`). */
export function lireId(valeur: string): number | null {
  if (!/^\d+$/.test(valeur)) return null;
  const id = Number(valeur);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
