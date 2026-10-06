// Dictionnaire des textes de l'interface (I18N-01), partagé entre le serveur
// (métadonnées, langue initiale) et le client (composants).
export type SiteLang = "fr" | "en";

export const DICTIONARY = {
  fr: {
    "meta.description": "Courses de frappe en temps réel pour la classe.",
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
    "meta.description": "Real-time typing races for the classroom.",
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

export function isSiteLang(value: unknown): value is SiteLang {
  return value === "fr" || value === "en";
}

/** Langue initiale : cookie choisi par l'utilisateur, sinon langue du navigateur (I18N-02). */
export function pickLang(cookieValue: string | undefined, acceptLanguage: string | null): SiteLang {
  if (isSiteLang(cookieValue)) return cookieValue;
  const first = acceptLanguage?.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("fr") ? "fr" : "en";
}

export function translate(
  lang: SiteLang,
  key: DictKey,
  params?: Record<string, string | number>,
): string {
  const text: string = DICTIONARY[lang][key];
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? ""));
}
