// Adresse IP du client, pour SALLE-04 (lien lié à une IP) et SALLE-10 (limite
// de tentatives). L'application tourne derrière le reverse proxy HTTPS du
// déploiement (docs/DEPLOIEMENT.md), qui renseigne X-Forwarded-For : on prend la
// dernière entrée ajoutée par le proxy de confiance (la plus à droite), et non
// la première, que le client peut forger lui-même.
export function clientIpFrom(headers: Pick<Headers, "get">): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  return headers.get("x-real-ip")?.trim() || "inconnue";
}
