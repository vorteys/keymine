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
    "entry.pseudo_title": "CHOISIS UN PSEUDO",
    "entry.pseudo_hint": "3 à 20 caractères. Sans compte, tu joues en invité.",
    "entry.pseudo_label": "Pseudonyme",
    "entry.pseudo_submit": "CONTINUER",
    "entry.conflict": "Tu es déjà dans la salle {code}.",
    "entry.conflict_go": "RETOURNER DANS MA SALLE",
    "entry.conflict_leave": "QUITTER ET CONTINUER",
    "entry.none_title": "AUCUNE SALLE DISPONIBLE",
    "entry.none_guest": "Il n'y a pas de salle publique ouverte pour l'instant. Reviens dans un moment.",
    "entry.none_user": "Il n'y a pas de salle publique ouverte. Tu peux en créer une et devenir l'hôte.",
    "entry.none_create": "CRÉER UNE SALLE PUBLIQUE",
    "entry.error": "Impossible de continuer. Réessaie.",
    "entry.cancel": "ANNULER",
    "entry.join": "ENTRER",
    "entry.code_label": "Code de la course",
    "entry.code_placeholder": "CODE",
    "create.account_required": "Il faut un compte pour créer une salle.",
    "create.login": "SE CONNECTER",
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
    "entry.pseudo_title": "PICK A NICKNAME",
    "entry.pseudo_hint": "3 to 20 characters. Without an account you play as a guest.",
    "entry.pseudo_label": "Nickname",
    "entry.pseudo_submit": "CONTINUE",
    "entry.conflict": "You are already in room {code}.",
    "entry.conflict_go": "GO BACK TO MY ROOM",
    "entry.conflict_leave": "LEAVE AND CONTINUE",
    "entry.none_title": "NO ROOM AVAILABLE",
    "entry.none_guest": "There is no open public room right now. Come back in a moment.",
    "entry.none_user": "There is no open public room. You can create one and become the host.",
    "entry.none_create": "CREATE A PUBLIC ROOM",
    "entry.error": "Something went wrong. Try again.",
    "entry.cancel": "CANCEL",
    "entry.join": "ENTER",
    "entry.code_label": "Race code",
    "entry.code_placeholder": "CODE",
    "create.account_required": "You need an account to create a room.",
    "create.login": "LOG IN",
  },
} as const;

export type DictKey = keyof (typeof DICTIONARY)["fr"];

type Params = Record<string, string | number>;
type Ctx = {
  lang: SiteLang;
  setLang: (l: SiteLang) => void;
  t: (key: DictKey, params?: Params) => string;
};

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
    () => ({
      lang,
      setLang,
      t: (key, params) => {
        const text: string = DICTIONARY[lang][key];
        if (!params) return text;
        return text.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ""));
      },
    }),
    [lang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage doit être utilisé sous LanguageProvider");
  return ctx;
}
