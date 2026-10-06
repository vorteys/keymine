// RES-03 : évolution du MPM dans le temps, tous les participants sur un même
// graphique. SVG pur (aucune dépendance), accessible : titre, description et
// légende textuelle ; les bots sont en pointillés, la couleur n'est jamais la
// seule information (la légende donne le nom et le MPM final).

export type ChartSeries = {
  id: string;
  name: string;
  isBot: boolean;
  isMe: boolean;
  points: { t: number; wpm: number }[];
};

const COLORS = ["#7fd36a", "#f0b429", "#6fb1ff", "#ff7b6b", "#c58bff", "#4fd1c5", "#ffa94d", "#f783ac"];

const W = 720;
const H = 260;
const PAD = { left: 44, right: 12, top: 14, bottom: 30 };

export function WpmChart({
  series,
  title,
  description,
  xLabel,
  yLabel,
}: {
  series: ChartSeries[];
  title: string;
  description: string;
  xLabel: string;
  yLabel: string;
}) {
  const withData = series.filter((s) => s.points.length > 0);
  const maxT = Math.max(1, ...withData.flatMap((s) => s.points.map((p) => p.t)));
  const maxWpm = Math.max(20, ...withData.flatMap((s) => s.points.map((p) => p.wpm)));
  const niceMax = Math.ceil(maxWpm / 20) * 20;
  const x = (t: number) => PAD.left + (t / maxT) * (W - PAD.left - PAD.right);
  const y = (wpm: number) => H - PAD.bottom - (wpm / niceMax) * (H - PAD.top - PAD.bottom);

  const ticksY = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(niceMax * f));
  const ticksX = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxT * f));

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-labelledby="wpm-chart-title wpm-chart-desc">
        <title id="wpm-chart-title">{title}</title>
        <desc id="wpm-chart-desc">{description}</desc>
        <rect x="0" y="0" width={W} height={H} fill="#1b1b1b" />
        {ticksY.map((v) => (
          <g key={`y${v}`}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="#3a3a3a" />
            <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" fill="#cfcfcf" fontSize="12" fontFamily="monospace">
              {v}
            </text>
          </g>
        ))}
        {ticksX.map((v) => (
          <text key={`x${v}`} x={x(v)} y={H - 10} textAnchor="middle" fill="#cfcfcf" fontSize="12" fontFamily="monospace">
            {v}
          </text>
        ))}
        <text x={W - PAD.right} y={H - 10} textAnchor="end" fill="#8b8b8b" fontSize="11" fontFamily="monospace">
          {xLabel}
        </text>
        <text x={PAD.left + 4} y={12} fill="#8b8b8b" fontSize="11" fontFamily="monospace">
          {yLabel}
        </text>
        {withData.map((s, i) => (
          <polyline
            key={s.id}
            fill="none"
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={s.isMe ? 4 : 2}
            strokeDasharray={s.isBot ? "6 4" : undefined}
            strokeLinejoin="round"
            points={s.points.map((p) => `${x(p.t).toFixed(1)},${y(p.wpm).toFixed(1)}`).join(" ")}
          />
        ))}
      </svg>
      <figcaption>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xl">
          {withData.map((s, i) => (
            <li key={s.id} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-1 w-6"
                style={{
                  background: s.isBot
                    ? `repeating-linear-gradient(90deg, ${COLORS[i % COLORS.length]} 0 6px, transparent 6px 10px)`
                    : COLORS[i % COLORS.length],
                  height: s.isMe ? 4 : 2,
                }}
              />
              {s.name}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
