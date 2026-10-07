import { formatDate } from "@/lib/format";
import { layoutProgress, type ProgressPoint } from "@/lib/progress";
import type { Language } from "@/db/types";

// Progression du MPM sur les dernières courses : axes chiffrés, un point par course (survol = date et
// MPM exacts), ligne de moyenne en tirets. Rendu serveur, SVG pur.

export function ProgressChart({
  data,
  lang,
  label,
  averageLabel,
  wpmLabel,
}: {
  data: ProgressPoint[];
  lang: Language;
  label: string;
  averageLabel: string;
  wpmLabel: string;
}) {
  const layout = layoutProgress(data);
  const line = layout.points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const first = layout.points[0];
  const last = layout.points[layout.points.length - 1];
  const baseline = layout.yTicks[0]!.y;
  const area =
    first && last && layout.points.length > 1
      ? `${first.x},${baseline} ${line} ${last.x},${baseline}`
      : null;

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      width="100%"
      role="img"
      aria-label={label}
    >
      {layout.yTicks.map((tick) => (
        <g key={tick.value}>
          <line x1={layout.left} x2={layout.right} y1={tick.y} y2={tick.y} stroke="#3a3a3a" />
          <text
            x={layout.left - 8}
            y={tick.y + 4}
            textAnchor="end"
            fill="#cfcfcf"
            fontSize="12"
            fontFamily="monospace"
          >
            {tick.value}
          </text>
        </g>
      ))}
      <text x={layout.left} y={11} fill="#a8a8a8" fontSize="11" fontFamily="monospace">
        {wpmLabel}
      </text>

      {area && <polygon points={area} fill="#7fd36a" opacity="0.14" />}
      {layout.average && (
        <g>
          <line
            x1={layout.left}
            x2={layout.right}
            y1={layout.average.y}
            y2={layout.average.y}
            stroke="#f0b429"
            strokeDasharray="6 5"
          />
          <text
            x={layout.right}
            y={layout.average.y - 5}
            textAnchor="end"
            fill="#f0b429"
            fontSize="12"
            fontFamily="monospace"
          >
            {averageLabel} {layout.average.value}
          </text>
        </g>
      )}
      {layout.points.length > 1 && (
        <polyline
          fill="none"
          stroke="#7fd36a"
          strokeWidth="3.5"
          strokeLinejoin="round"
          points={line}
        />
      )}
      {layout.points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={5}
          fill="#7fd36a"
          stroke="#1b1b1b"
          strokeWidth="2"
          className="progress-dot"
        >
          <title>{`${formatDate(lang, p.at, true)} · ${Math.round(p.wpm)} ${wpmLabel}`}</title>
        </circle>
      ))}

      {first && (
        <text
          x={first.x}
          y={layout.height - 10}
          textAnchor="start"
          fill="#cfcfcf"
          fontSize="12"
          fontFamily="monospace"
        >
          {formatDate(lang, first.at)}
        </text>
      )}
      {last && layout.points.length > 1 && (
        <text
          x={last.x}
          y={layout.height - 10}
          textAnchor="end"
          fill="#cfcfcf"
          fontSize="12"
          fontFamily="monospace"
        >
          {formatDate(lang, last.at)}
        </text>
      )}
    </svg>
  );
}
