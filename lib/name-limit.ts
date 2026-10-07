// Limite de renommages d'une salle : 5 changements de nom par minute et par salle. En mémoire :
// suffisant pour freiner un script depuis un seul processus, rien à nettoyer côté base.
export const NAME_CHANGES_PER_MINUTE = 5;
const WINDOW_MS = 60_000;
const changes = new Map<string, number[]>();

/** Compte un changement de nom ; vrai (donc à refuser) si la salle en a déjà fait trop. */
export function isNameChangeLimited(lobbyId: string, now = Date.now()): boolean {
  const recent = (changes.get(lobbyId) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= NAME_CHANGES_PER_MINUTE) {
    changes.set(lobbyId, recent);
    return true;
  }
  recent.push(now);
  changes.set(lobbyId, recent);
  // Ménage : on oublie les salles inactives pour que la table ne grandisse pas sans fin.
  if (changes.size > 5_000) {
    for (const [id, times] of changes)
      if (times.every((at) => now - at >= WINDOW_MS)) changes.delete(id);
  }
  return false;
}
