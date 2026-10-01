"use client";

// UI-4: site bilingue FR/EN via liste déroulante, indépendant de la langue
// de la course (qui est un réglage de lobby séparé, voir lib/lobby-schema.ts).
// Portée volontairement limitée au chrome commun (menu, en-tête) et à la
// page d'accueil — voir le tableau des exigences dans le README pour le
// détail de ce qui est traduit ou non.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type SiteLang = "fr" | "en";

const DICTIONARY = {
  fr: {
    "nav.jouer": "JOUER",
    "nav.lobbys": "LOBBYS",
    "nav.stats": "STATS",
    "common.guest": "Invité",
    "theme.toggle": "Thème clair ou sombre",
    "lang.select": "Langue du site",
    "home.title": "TAPE PLUS VITE QUE TA CLASSE.",
    "home.subtitle":
      "Des courses de frappe en direct. Tout le monde tape le même texte, le plus rapide monte sur le podium.",
    "home.play": "JOUER",
    "home.quickplay_hint":
      "Partie rapide: on te place dans un lobby, ou on en crée un et tu deviens le Chef.",
    "home.create": "CRÉER UNE COURSE",
    "home.account": "COMPTE",
    "home.guest_note": "Sans compte, tu joues en invité: ton historique s’efface à la fermeture de la page.",
    "home.public_lobbies": "LOBBYS PUBLICS",
  },
  en: {
    "nav.jouer": "PLAY",
    "nav.lobbys": "LOBBIES",
    "nav.stats": "STATS",
    "common.guest": "Guest",
    "theme.toggle": "Light or dark theme",
    "lang.select": "Site language",
    "home.title": "TYPE FASTER THAN YOUR CLASS.",
    "home.subtitle":
      "Live typing races. Everyone types the same text, the fastest one takes the podium.",
    "home.play": "PLAY",
    "home.quickplay_hint":
      "Quick play: we drop you into a lobby, or create one and you become the Host.",
    "home.create": "CREATE A RACE",
    "home.account": "ACCOUNT",
    "home.guest_note": "No account: you play as a guest, your history clears when you close the page.",
    "home.public_lobbies": "PUBLIC LOBBIES",
  },
} as const;

export type DictKey = keyof (typeof DICTIONARY)["fr"];

type Ctx = { lang: SiteLang; setLang: (l: SiteLang) => void; t: (key: DictKey) => string };

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<SiteLang>("fr");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("km_lang");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lu depuis localStorage, pas dispo au premier rendu serveur
      if (stored === "fr" || stored === "en") setLangState(stored);
    } catch {
      // stockage indisponible: on reste en FR par défaut
    }
  }, []);

  const setLang = (l: SiteLang) => {
    setLangState(l);
    try {
      localStorage.setItem("km_lang", l);
    } catch {
      // ignoré
    }
  };

  const value = useMemo<Ctx>(
    () => ({ lang, setLang, t: (key) => DICTIONARY[lang][key] }),
    [lang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage doit être utilisé sous LanguageProvider");
  return ctx;
}
