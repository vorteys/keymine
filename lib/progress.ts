// Courbe de progression du profil (AUTH-06) : calcul de la mise en page, sans dépendance au rendu,
// pour pouvoir le tester. Les points arrivent du plus ancien au plus récent.

export type ProgressPoint = { wpm: number; at: Date };

export type ProgressLayout = {
  width: number;
  height: number;
  points: { x: number; y: number; wpm: number; at: Date }[];
  yTicks: { y: number; value: number }[];
  average: { y: number; value: number } | null;
  /** Abscisse du premier et du dernier point (pour écrire les dates de début et de fin). */
  left: number;
  right: number;
};

const PAD = { left: 44, right: 18, top: 18, bottom: 34 };

/** Plafond de l'axe vertical : le prochain multiple de 20 au-dessus du meilleur MPM. */
export function niceCeiling(max: number): number {
  return Math.max(20, Math.ceil(max / 20) * 20);
}

export function layoutProgress(
  data: readonly ProgressPoint[],
  width = 720,
  height = 240,
): ProgressLayout {
  const top = niceCeiling(Math.max(0, ...data.map((p) => p.wpm)));
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const y = (wpm: number) => PAD.top + innerH - (wpm / top) * innerH;
  // Un seul point : on le centre plutôt que de le coller au bord gauche.
  const x = (i: number) =>
    data.length > 1 ? PAD.left + (i / (data.length - 1)) * innerW : PAD.left + innerW / 2;

  const mean = data.length > 0 ? data.reduce((sum, p) => sum + p.wpm, 0) / data.length : null;
  return {
    width,
    height,
    points: data.map((p, i) => ({ x: x(i), y: y(p.wpm), wpm: p.wpm, at: p.at })),
    yTicks: [0, 0.25, 0.5, 0.75, 1].map((f) => ({ y: y(top * f), value: Math.round(top * f) })),
    average: mean === null ? null : { y: y(mean), value: Math.round(mean) },
    left: PAD.left,
    right: width - PAD.right,
  };
}
