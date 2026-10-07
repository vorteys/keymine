import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "green" | "slate" | "red" | "gold";

type ButtonBaseProps = {
  variant?: Variant;
  className?: string;
  children: ReactNode;
};

type ButtonAsLink = ButtonBaseProps & {
  href: string;
  onClick?: never;
  type?: never;
  disabled?: never;
};

type ButtonAsButton = ButtonBaseProps & {
  href?: undefined;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
};

export function PixelButton(props: ButtonAsLink | ButtonAsButton) {
  const { variant = "green", className = "", children } = props;
  const classes = `pixel-btn ${className}`;

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} data-variant={variant} className={classes}>
        {children}
      </Link>
    );
  }

  const { onClick, type = "button", disabled } = props as ButtonAsButton;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      className={classes}
    >
      {children}
    </button>
  );
}

export function PixelPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`pixel-panel ${className}`}>{children}</div>;
}

export function PixelSlot({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`pixel-slot ${className}`}>{children}</div>;
}

export function PixelChip({
  children,
  on = false,
  className = "",
}: {
  children: ReactNode;
  on?: boolean;
  className?: string;
}) {
  return (
    <span data-on={on} className={`pixel-chip text-lg ${className}`}>
      {children}
    </span>
  );
}

export function PixelAvatar({
  label,
  color,
  className = "",
  src,
}: {
  label: string;
  color: string;
  className?: string;
  /** Photo de profil (facultative) : sinon on affiche l'initiale sur fond de couleur. */
  src?: string | null;
}) {
  return (
    <span
      className={`pixel-avatar overflow-hidden ${className}`}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar utilisateur de taille minuscule
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        label
      )}
    </span>
  );
}

export function PixelLabel({ children }: { children: ReactNode }) {
  return <div className="font-pixel mb-2 text-[11px] text-[#3a3a3a]">{children}</div>;
}

export function heatColor(pct: number) {
  if (pct >= 95) return "#7fd36a";
  if (pct >= 90) return "#b9e05a";
  if (pct >= 85) return "#f2d24a";
  if (pct >= 78) return "#f5a34a";
  return "#ff7b6b";
}

export const keyboardRows: { indent: string; keys: [string, number][] }[] = [
  {
    indent: "0",
    keys: [
      ["Q", 94],
      ["W", 91],
      ["E", 98],
      ["R", 96],
      ["T", 95],
      ["Y", 88],
      ["U", 93],
      ["I", 97],
      ["O", 92],
      ["P", 79],
    ],
  },
  {
    indent: "0.5",
    keys: [
      ["A", 97],
      ["S", 95],
      ["D", 96],
      ["F", 98],
      ["G", 90],
      ["H", 94],
      ["J", 96],
      ["K", 93],
      ["L", 91],
    ],
  },
  {
    indent: "1",
    keys: [
      ["Z", 68],
      ["X", 74],
      ["C", 90],
      ["V", 92],
      ["B", 89],
      ["N", 95],
      ["M", 96],
    ],
  },
];

export function PixelKeyboard({
  rows = keyboardRows,
  className = "",
  label,
}: {
  rows?: { indent: string; keys: [string, number][] }[];
  className?: string;
  /** Nom accessible de la zone : sur écran étroit elle défile horizontalement, donc elle doit être atteignable au clavier. */
  label?: string;
}) {
  return (
    // 360 px (DES-06) : le clavier garde une taille lisible et défile dans sa zone plutôt que de faire défiler la page.
    // Le padding absorbe l'agrandissement d'une touche au survol : sans lui, la zone afficherait des barres de défilement.
    <div
      className="overflow-x-auto overflow-y-hidden p-3"
      role="group"
      aria-label={label}
      tabIndex={label ? 0 : undefined}
    >
      <div className={`pixel-keymap flex w-max flex-col gap-2 ${className}`}>
        {rows.map((row, i) => (
          // `indent` est un décalage en nombre de touches (0, 0.5, 1), comme sur un vrai clavier.
          <div
            key={i}
            className="flex gap-2"
            style={{ marginLeft: `calc((var(--key) + 0.5rem) * ${row.indent})` }}
          >
            {row.keys.map(([letter, pct]) => (
              <div
                key={letter}
                className="pixel-keymap-key font-pixel"
                style={{ background: heatColor(pct) }}
              >
                <b className="pixel-keymap-letter">{letter}</b>
                <span className="pixel-keymap-pct">{pct}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
