import Link from "next/link";
import type { ReactNode } from "react";
import { PixelAvatar } from "./ui";

type NavKey = "jouer" | "lobbys" | "stats" | null;

export function PixelShell({
  active = null,
  rightSlot,
  children,
}: {
  active?: NavKey;
  rightSlot?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="pixel-night min-h-screen">
      <div className="pixel-grass h-5 border-b-4 border-[#2f5d1c]" />

      <header className="flex h-16 items-center gap-6 border-b-4 border-black bg-[#241a10] px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="pixel-key">K</span>
          <span className="pixel-key bg-[#7fc45a]">E</span>
          <span className="pixel-key">Y</span>
          <span className="font-pixel ml-2 text-lg text-white [text-shadow:3px_3px_0_#000]">
            MINE
          </span>
        </Link>

        <nav className="hidden flex-grow gap-1.5 sm:flex">
          <Link href="/jouer/creer" data-active={active === "jouer"} className="pixel-nav-link">
            JOUER
          </Link>
          <Link href="/" data-active={active === "lobbys"} className="pixel-nav-link">
            LOBBYS
          </Link>
          <Link href="/profil" data-active={active === "stats"} className="pixel-nav-link">
            STATS
          </Link>
        </nav>

        <div className="flex-grow sm:hidden" />

        <select
          aria-label="Langue du site"
          className="font-pixel h-10 border-3 border-white bg-[#c6c6c6] px-2 text-[11px]"
          style={{ borderColor: "#fff #555 #555 #fff" }}
          defaultValue="FR"
        >
          <option>FR</option>
          <option>EN</option>
        </select>

        {rightSlot ?? (
          <Link href="/profil" className="flex items-center gap-2 text-xl text-white">
            <PixelAvatar label="A" color="#3d6fc4" className="h-9 w-9 text-sm" />
            <span className="hidden sm:inline">Alexy</span>
          </Link>
        )}
      </header>

      <main className="px-4 py-6 sm:px-8 sm:py-7">
        <div className="mx-auto w-full max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
