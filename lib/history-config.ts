// Constantes de l'historique, sans accès à la base : importables aussi depuis un composant client.

export const HISTORY_SECTIONS = ["played", "abandoned", "spectated"] as const;
export type HistorySection = (typeof HISTORY_SECTIONS)[number];
export const HISTORY_SORTS = ["date", "wpm", "rank"] as const;
export type HistorySort = (typeof HISTORY_SORTS)[number];
export type HistoryDirection = "asc" | "desc";
