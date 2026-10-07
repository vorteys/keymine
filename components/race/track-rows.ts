// Quelles lignes de la piste afficher quand elle est repliée ?
// Les `limit` premiers du classement, mais la ligne du joueur local est toujours visible :
// s'il est loin derrière, elle prend la place de la dernière ligne affichée.

export type RowLike = { id: string };

export function compactRows<T extends RowLike>(
  ordered: readonly T[],
  meId: string | null,
  limit: number,
): T[] {
  const max = Math.max(1, Math.floor(limit));
  if (ordered.length <= max) return [...ordered];
  const head = ordered.slice(0, max);
  const me = meId ? ordered.find((p) => p.id === meId) : undefined;
  if (!me || head.includes(me)) return head;
  return [...head.slice(0, max - 1), me];
}

/** Nombre de lignes qui tiennent dans la hauteur de la fenêtre (au moins 3, au plus 12). */
export const TRACK_ROW_HEIGHT = 84;
export const TRACK_RESERVED_HEIGHT = 380;

export function rowsThatFit(viewportHeight: number): number {
  const fit = Math.floor((viewportHeight - TRACK_RESERVED_HEIGHT) / TRACK_ROW_HEIGHT);
  return Math.min(12, Math.max(3, fit));
}
