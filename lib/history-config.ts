// Constantes de l'historique, sans accès à la base : importables aussi depuis un composant client.

// « all » : toutes les courses terminées, quel que soit le rôle ou l'issue.
export const HISTORY_SECTIONS = ["all", "played", "spectated", "abandoned"] as const;
export type HistorySection = (typeof HISTORY_SECTIONS)[number];
export const HISTORY_SORTS = ["date", "wpm", "rank"] as const;
export type HistorySort = (typeof HISTORY_SORTS)[number];
export type HistoryDirection = "asc" | "desc";
