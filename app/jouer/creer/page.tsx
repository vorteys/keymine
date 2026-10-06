"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PixelShell } from "@/components/PixelShell";
import { PixelButton, PixelLabel, PixelPanel, PixelSlot } from "@/components/ui";
import { generateRaceText } from "@/lib/text/generate";
import { BUNDLED_CORPUS } from "@/lib/text/corpus";
import { BOT_LEVELS, BOT_PROFILES } from "@/lib/race/bots";
import type { BotLevel, Difficulty, TextType } from "@/db/types";
import { useLanguage } from "@/lib/i18n";

type Access = "public" | "unlisted" | "private";
type ErrorMode = "accumuler" | "bloquer";

// CONF-01 : de 15 secondes à 2 heures.
const DURATIONS = [
  ["15 secondes", 15],
  ["30 secondes", 30],
  ["1 minute", 60],
  ["2 minutes", 120],
  ["5 minutes", 300],
  ["10 minutes", 600],
  ["30 minutes", 1800],
  ["1 heure", 3600],
  ["2 heures", 7200],
] as const;

const COMPLEXITY_LABELS: Record<Difficulty, [string, string]> = {
  easy: ["FACILE", "Mots de 2 à 5 lettres, sans accent."],
  medium: ["MOYEN", "Mots de 4 à 8 lettres."],
  hard: ["DIFFICILE", "Mots de 7 lettres ou plus, accents compris."],
};

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} data-on={on} className="pixel-chip text-xl">
      {children}
    </button>
  );
}

function toggle<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function CreerCoursePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [accountRequired, setAccountRequired] = useState(false);
  const [access, setAccess] = useState<Access>("public");
  const [language, setLanguage] = useState<"fr" | "en">("fr");
  const [duration, setDuration] = useState(300);
  const [lobbySize, setLobbySize] = useState(30);
  const [errorMode, setErrorMode] = useState<ErrorMode>("accumuler");
  const [penalty, setPenalty] = useState(true);
  const [bots, setBots] = useState<Set<BotLevel>>(new Set(["intermediaire", "expert"]));
  const [textType, setTextType] = useState<TextType>("coherent");
  const [length, setLength] = useState(40);
  const [complexity, setComplexity] = useState<Difficulty>("easy");
  const [includeChars, setIncludeChars] = useState<Set<string>>(new Set());
  const [excludeChars, setExcludeChars] = useState<Set<string>>(new Set());
  const [options, setOptions] = useState<Set<string>>(new Set(["Accents"]));
  const [comebackBonus, setComebackBonus] = useState(true);
  const [hostRole, setHostRole] = useState<"participant" | "spectator">("participant");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    try {
      return generateRaceText(
        {
          type: textType,
          language,
          length: 12,
          complexity,
          uppercase: options.has("Majuscules"),
          punctuation: options.has("Ponctuation"),
          digits: options.has("Nombres"),
          accents: options.has("Accents"),
          includeChars: [...includeChars],
          excludeChars: [...excludeChars],
        },
        BUNDLED_CORPUS,
      );
    } catch {
      return "";
    }
  }, [textType, language, complexity, options, includeChars, excludeChars]);

  async function createLobby() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/lobbies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access,
          language,
          durationSeconds: duration,
          maxPlayers: lobbySize,
          hostRole,
          textType,
          textLength: length,
          complexity,
          comebackBonus,
          errorMode,
          penaltySeconds: penalty ? 1 : 0,
          uppercase: options.has("Majuscules"),
          punctuation: options.has("Ponctuation"),
          digits: options.has("Nombres"),
          accents: options.has("Accents"),
          includeChars: textType === "aleatoire" ? [...includeChars] : [],
          excludeChars: textType === "aleatoire" ? [...excludeChars] : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // AUTH-03: un invité ne peut pas créer de salle.
        setAccountRequired(data.code === "account_required");
        if (data.code === "already_in_room") {
          router.push(`/jouer/${data.currentCode}`);
          return;
        }
        setError(
          data.code === "account_required"
            ? t("create.account_required")
            : (data.error ?? "Impossible de créer la salle"),
        );
        return;
      }

      for (const level of bots) {
        await fetch(`/api/lobbies/${data.code}/bots`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ level }),
        });
      }

      router.push(`/jouer/${data.code}`);
    } catch {
      setError("Impossible de contacter le serveur");
    } finally {
      setPending(false);
    }
  }

  return (
    <PixelShell active="jouer">
      <h1 className="font-pixel mb-6 text-xl text-white [text-shadow:4px_4px_0_#000]">
        CRÉER UNE COURSE
      </h1>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <PixelPanel className="w-full flex-none p-6 lg:w-[34rem]">
          <div className="flex flex-col gap-4">
            <div>
              <PixelLabel>ACCÈS</PixelLabel>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["public", "PUBLIQUE", "Listée à l’accueil"],
                    ["unlisted", "PAR CODE", "Cachée, on entre avec un code"],
                    ["private", "PRIVÉE", "Accessible par le code seulement"],
                  ] as const
                ).map(([key, title, sub]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAccess(key)}
                    data-on={access === key}
                    className="pixel-chip flex flex-col items-start gap-1 leading-tight"
                  >
                    <b className="font-pixel text-[11px] font-normal">{title}</b>
                    <span className="text-lg">{sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-6">
              <div>
                <PixelLabel>LANGUE DE LA COURSE</PixelLabel>
                <div className="flex gap-2">
                  {(["fr", "en"] as const).map((lang) => (
                    <Chip key={lang} on={language === lang} onClick={() => setLanguage(lang)}>
                      {lang.toUpperCase()}
                    </Chip>
                  ))}
                </div>
              </div>
              <div className="flex-grow">
                <PixelLabel>DURÉE MAX</PixelLabel>
                <select
                  aria-label="Durée maximale"
                  className="pixel-slot h-10 w-full px-2.5 text-2xl text-white"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                >
                  {DURATIONS.map(([label, seconds]) => (
                    <option key={seconds} value={seconds}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <PixelLabel>TAILLE MAX DU LOBBY: {lobbySize} JOUEURS</PixelLabel>
              <input
                type="range"
                min={2}
                max={30}
                value={lobbySize}
                onChange={(e) => setLobbySize(Number(e.target.value))}
                aria-label="Taille maximale du lobby"
                className="w-full accent-[#3f7d24]"
              />
            </div>

            <div>
              <PixelLabel>TON RÔLE</PixelLabel>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setHostRole("participant")}
                  data-on={hostRole === "participant"}
                  className="pixel-chip flex flex-col items-start gap-1 leading-tight"
                >
                  <b className="font-pixel text-[11px] font-normal">PARTICIPANT</b>
                  <span className="text-lg">Tu cours avec les autres.</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHostRole("spectator")}
                  data-on={hostRole === "spectator"}
                  className="pixel-chip flex flex-col items-start gap-1 leading-tight"
                >
                  <b className="font-pixel text-[11px] font-normal">SPECTATEUR</b>
                  <span className="text-lg">Tu organises et tu regardes.</span>
                </button>
              </div>
            </div>

            <div>
              <PixelLabel>ERREURS</PixelLabel>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setErrorMode("accumuler")}
                  data-on={errorMode === "accumuler"}
                  className="pixel-chip flex flex-col items-start gap-1 leading-tight"
                >
                  <b className="font-pixel text-[11px] font-normal">ACCUMULER</b>
                  <span className="text-lg">On continue. Erreurs en rouge, affichées à la fin.</span>
                </button>
                <button
                  type="button"
                  onClick={() => setErrorMode("bloquer")}
                  data-on={errorMode === "bloquer"}
                  className="pixel-chip flex flex-col items-start gap-1 leading-tight"
                >
                  <b className="font-pixel text-[11px] font-normal">BLOQUER</b>
                  <span className="text-lg">Bloqué jusqu’à la bonne touche.</span>
                </button>
              </div>
              <label className="mt-2 flex items-center gap-2.5 text-xl">
                <input
                  type="checkbox"
                  checked={penalty}
                  onChange={(e) => setPenalty(e.target.checked)}
                  className="h-5 w-5 accent-[#3f7d24]"
                />
                Pénalité: +1 s par erreur non corrigée
              </label>
            </div>

            <div>
              <PixelLabel>BOTS ({bots.size} ajoutés)</PixelLabel>
              <div className="flex flex-wrap gap-2">
                {BOT_LEVELS.map((lvl) => (
                  <Chip key={lvl} on={bots.has(lvl)} onClick={() => setBots(toggle(bots, lvl))}>
                    {BOT_PROFILES[lvl].label.toUpperCase()}
                  </Chip>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xl">
              <input
                type="checkbox"
                checked={comebackBonus}
                onChange={(e) => setComebackBonus(e.target.checked)}
                className="h-5 w-5 accent-[#3f7d24]"
              />
              Bonus de remontée activés
            </label>
          </div>
        </PixelPanel>

        <PixelPanel className="w-full flex-grow p-6">
          <div className="flex flex-col gap-4">
            <div>
              <PixelLabel>TYPE DE TEXTE</PixelLabel>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["coherent", "COHÉRENT", "Vrais passages d’œuvres du domaine public."],
                    ["aleatoire", "ALÉATOIRE", "Mots tirés d’un dictionnaire."],
                  ] as const
                ).map(([key, title, sub]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTextType(key)}
                    data-on={textType === key}
                    className="pixel-chip flex flex-col items-start gap-1 leading-tight"
                  >
                    <b className="font-pixel text-[11px] font-normal">{title}</b>
                    <span className="text-lg">{sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <PixelLabel>COMPLEXITÉ</PixelLabel>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(COMPLEXITY_LABELS) as Difficulty[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setComplexity(level)}
                    data-on={complexity === level}
                    className="pixel-chip flex flex-col items-start gap-1 leading-tight"
                  >
                    <b className="font-pixel text-[11px] font-normal">{COMPLEXITY_LABELS[level][0]}</b>
                    <span className="text-lg">{COMPLEXITY_LABELS[level][1]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <PixelLabel>LONGUEUR: {length} MOTS</PixelLabel>
              <input
                type="range"
                min={10}
                max={400}
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                aria-label="Longueur du texte en mots"
                className="w-full accent-[#3f7d24]"
              />
            </div>

            <div>
              <PixelLabel>OPTIONS DU TEXTE</PixelLabel>
              <div className="flex flex-wrap gap-2">
                {["Majuscules", "Ponctuation", "Nombres", "Accents"].map((o) => (
                  <Chip
                    key={o}
                    on={options.has(o)}
                    onClick={() => setOptions(toggle(options, o))}
                  >
                    {o}
                  </Chip>
                ))}
              </div>
              <p className="mt-1.5 text-lg text-[#3a3a3a]">
                En mode cohérent, les passages sont adaptés (accents et ponctuation retirés si
                désactivés).
              </p>
            </div>

            <div aria-disabled={textType === "coherent"} className={textType === "coherent" ? "opacity-40" : ""}>
              <PixelLabel>CARACTÈRES À INCLURE</PixelLabel>
              <div className="flex flex-wrap gap-2">
                {["z", "q", "x", "w", "j", "k", "é", "ç"].map((c) => (
                  <Chip
                    key={c}
                    on={includeChars.has(c)}
                    onClick={() => {
                      if (textType === "coherent") return;
                      setIncludeChars(toggle(includeChars, c));
                      setExcludeChars((prev) => {
                        const next = new Set(prev);
                        next.delete(c);
                        return next;
                      });
                    }}
                  >
                    {c}
                  </Chip>
                ))}
              </div>
              <PixelLabel>CARACTÈRES À EXCLURE</PixelLabel>
              <div className="flex flex-wrap gap-2">
                {["e", "a", "s", "t", "n", "r", "u", "l"].map((c) => (
                  <Chip
                    key={c}
                    on={excludeChars.has(c)}
                    onClick={() => {
                      if (textType === "coherent") return;
                      setExcludeChars(toggle(excludeChars, c));
                      setIncludeChars((prev) => {
                        const next = new Set(prev);
                        next.delete(c);
                        return next;
                      });
                    }}
                  >
                    {c}
                  </Chip>
                ))}
              </div>
              {textType === "coherent" && (
                <p className="mt-1.5 text-lg text-[#3a3a3a]">
                  Réglage désactivé en mode cohérent : réservé au texte aléatoire.
                </p>
              )}
            </div>

            <div>
              <PixelLabel>APERÇU</PixelLabel>
              <PixelSlot className="px-3.5 py-3 text-3xl leading-snug text-white">
                {preview || "…"}
              </PixelSlot>
            </div>
          </div>
        </PixelPanel>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4 border-t-4 border-black bg-[#241a10] px-4 py-5 sm:flex-row sm:justify-between">
        <p className="text-2xl text-[#f1e6c9]">
          {error ?? "Minimum 2 participants, bots inclus. Tu seras le Chef de la course."}
        </p>
        <div className="flex gap-3.5">
          {accountRequired && (
            <PixelButton href="/connexion" variant="gold" className="h-13 px-5 text-[13px]">
              {t("create.login")}
            </PixelButton>
          )}
          <PixelButton href="/" variant="slate" className="h-13 px-5 text-[13px]">
            ANNULER
          </PixelButton>
          <PixelButton
            type="button"
            onClick={createLobby}
            variant="green"
            className="h-13 px-7 text-[15px]"
          >
            {pending ? "..." : "CRÉER LA SALLE"}
          </PixelButton>
        </div>
      </div>
    </PixelShell>
  );
}
