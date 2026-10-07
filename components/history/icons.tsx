// Petites icônes en pixels pour les champs de l'historique (décoratives : le libellé texte est toujours présent).

type IconName = "date" | "wpm" | "rank" | "accuracy" | "status" | "players" | "winner";

const PATHS: Record<IconName, string> = {
  // calendrier
  date: "M2 3h12v11H2zM2 6h12M5 1v4M11 1v4",
  // éclair
  wpm: "M9 1 3 9h4l-1 6 7-9H9z",
  // coupe
  rank: "M4 2h8v4a4 4 0 0 1-8 0zM4 3H1v2a3 3 0 0 0 3 3M12 3h3v2a3 3 0 0 1-3 3M8 10v3M5 14h6",
  // cible
  accuracy: "M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM8 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  // drapeau
  status: "M3 1v14M3 2h10l-2 3 2 3H3",
  // joueurs
  players:
    "M6 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM1 15c0-3 2-5 5-5s5 2 5 5M12 6a2 2 0 1 0 0-4M13 10c2 0 3 2 3 5",
  winner: "M2 5l3 3 3-5 3 5 3-3-1 8H3z",
};

export function HistoryIcon({ name }: { name: IconName }) {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      strokeLinecap="round"
      className="shrink-0"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
