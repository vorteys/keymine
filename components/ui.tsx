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
};

type ButtonAsButton = ButtonBaseProps & {
  href?: undefined;
  onClick?: () => void;
  type?: "button" | "submit";
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

  const { onClick, type = "button" } = props as ButtonAsButton;
  return (
    <button type={type} onClick={onClick} data-variant={variant} className={classes}>
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
}: {
  label: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={`pixel-avatar ${className}`}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}

export function PixelLabel({ children }: { children: ReactNode }) {
  return <div className="font-pixel mb-2 text-[11px] text-[#3a3a3a]">{children}</div>;
}
