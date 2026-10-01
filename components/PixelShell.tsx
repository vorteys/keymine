"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { PixelAvatar } from "./ui";
import { useLanguage, type SiteLang } from "@/lib/i18n";

type NavKey = "jouer" | "lobbys" | "stats" | null;

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("km_theme");
      if (stored === "light" || stored === "dark") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- lu depuis localStorage, pas dispo au premier rendu serveur
        setTheme(stored);
        document.documentElement.dataset.theme = stored;
      }
    } catch {
      // stockage indisponible: thème sombre par défaut
    }
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("km_theme", next);
    } catch {
      // ignoré
    }
  }

  return { theme, toggle };
}

export function PixelShell({
  active = null,
  rightSlot,
  children,
}: {
  active?: NavKey;
  rightSlot?: ReactNode;
  children: ReactNode;
}) {
  const { t, lang, setLang } = useLanguage();
  const { toggle: toggleTheme } = useTheme();

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
            {t("nav.jouer")}
          </Link>
          <Link href="/" data-active={active === "lobbys"} className="pixel-nav-link">
            {t("nav.lobbys")}
          </Link>
          <Link href="/profil" data-active={active === "stats"} className="pixel-nav-link">
            {t("nav.stats")}
          </Link>
        </nav>

        <div className="flex-grow sm:hidden" />

        <select
          aria-label={t("lang.select")}
          className="font-pixel h-10 border-3 border-white bg-[#c6c6c6] px-2 text-[11px]"
          style={{ borderColor: "#fff #555 #555 #fff" }}
          value={lang}
          onChange={(e) => setLang(e.target.value as SiteLang)}
        >
          <option value="fr">FR</option>
          <option value="en">EN</option>
        </select>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={t("theme.toggle")}
          className="flex h-10 w-10 items-center justify-center border-3 border-white bg-[#c6c6c6]"
          style={{ borderColor: "#fff #555 #555 #fff" }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <circle cx="9" cy="9" r="7.5" fill="none" stroke="#2b2b2b" strokeWidth="2" />
            <path d="M9 1.5a7.5 7.5 0 0 0 0 15z" fill="#2b2b2b" />
          </svg>
        </button>

        {rightSlot ?? (
          <Link href="/profil" className="flex items-center gap-2 text-xl text-white">
            <PixelAvatar label="A" color="#3d6fc4" className="h-9 w-9 text-sm" />
            <span className="hidden sm:inline">{t("common.guest")}</span>
          </Link>
        )}
      </header>

      <main className="px-4 py-6 sm:px-8 sm:py-7">
        <div className="mx-auto w-full max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
