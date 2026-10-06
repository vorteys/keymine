"use client";

import { useMemo, type ReactNode } from "react";
import { PixelLabel, PixelPanel, PixelSlot } from "@/components/ui";
import { BUNDLED_CORPUS } from "@/lib/text/corpus";
import { generateRaceText } from "@/lib/text/generate";
import type { Difficulty } from "@/db/types";
import { toggled, type Access, type ErrorMode, type SettingsState, type TextOption } from "./settings";

// CONF-01 : de 15 secondes à 2 heures.
export const DURATIONS = [
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

const TEXT_OPTIONS: TextOption[] = ["Majuscules", "Ponctuation", "Nombres", "Accents"];

export function Chip({
  on,
  onClick,
  children,
  label,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
  label?: string;
}) {
  return (
    <button type="button" onClick={onClick} data-on={on} aria-pressed={on} aria-label={label} className="pixel-chip text-xl">
      {children}
    </button>
  );
}

function Choice({
  on,
  onClick,
  title,
  sub,
}: {
  on: boolean;
  onClick: () => void;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-on={on}
      aria-pressed={on}
      className="pixel-chip flex flex-col items-start gap-1 leading-tight"
    >
      <b className="font-pixel text-[11px] font-normal">{title}</b>
      <span className="text-lg">{sub}</span>
    </button>
  );
}

/**
 * Formulaire de réglages partagé entre « Créer une course » et la salle
 * d'attente (CONF-12). `layout="split"` : deux panneaux côte à côte ;
 * `layout="stacked"` : une seule colonne (barre latérale de la salle).
 */
export function SettingsForm({
  value,
  onChange,
  layout = "split",
  leftExtra,
}: {
  value: SettingsState;
  onChange: (patch: Partial<SettingsState>) => void;
  layout?: "split" | "stacked";
  /** Éléments propres à la création (rôle de l'hôte, bots) insérés dans le panneau de gauche. */
  leftExtra?: ReactNode;
}) {
  const v = value;
  const random = v.textType === "aleatoire";

  const preview = useMemo(() => {
    try {
      return generateRaceText(
        {
          type: v.textType,
          language: v.language,
          length: 12,
          complexity: v.complexity,
          uppercase: v.options.includes("Majuscules"),
          punctuation: v.options.includes("Ponctuation"),
          digits: v.options.includes("Nombres"),
          accents: v.options.includes("Accents"),
          includeChars: v.includeChars,
          excludeChars: v.excludeChars,
        },
        BUNDLED_CORPUS,
      );
    } catch {
      return "";
    }
  }, [v.textType, v.language, v.complexity, v.options, v.includeChars, v.excludeChars]);

  const general = (
    <div className="flex flex-col gap-4">
      <div>
        <PixelLabel>ACCÈS</PixelLabel>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["public", "PUBLIQUE", "Listée à l’accueil"],
              ["unlisted", "PAR CODE", "Cachée, on entre avec un code"],
              ["private", "PRIVÉE", "Accessible par le code seulement"],
            ] as [Access, string, string][]
          ).map(([key, title, sub]) => (
            <Choice key={key} on={v.access === key} onClick={() => onChange({ access: key })} title={title} sub={sub} />
          ))}
        </div>
      </div>

      <div className="flex gap-6">
        <div>
          <PixelLabel>LANGUE DE LA COURSE</PixelLabel>
          <div className="flex gap-2">
            {(["fr", "en"] as const).map((lang) => (
              <Chip key={lang} on={v.language === lang} onClick={() => onChange({ language: lang })}>
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
            value={v.duration}
            onChange={(e) => onChange({ duration: Number(e.target.value) })}
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
        <PixelLabel>TAILLE MAX DU LOBBY: {v.lobbySize} JOUEURS</PixelLabel>
        <input
          type="range"
          min={2}
          max={30}
          value={v.lobbySize}
          onChange={(e) => onChange({ lobbySize: Number(e.target.value) })}
          aria-label="Taille maximale du lobby"
          className="w-full accent-[#3f7d24]"
        />
      </div>

      {leftExtra}

      <div>
        <PixelLabel>ERREURS</PixelLabel>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["accumuler", "ACCUMULER", "On continue. Erreurs en rouge, affichées à la fin."],
              ["bloquer", "BLOQUER", "Bloqué jusqu’à la bonne touche."],
            ] as [ErrorMode, string, string][]
          ).map(([key, title, sub]) => (
            <Choice key={key} on={v.errorMode === key} onClick={() => onChange({ errorMode: key })} title={title} sub={sub} />
          ))}
        </div>
        <label className="mt-2 flex items-center gap-2.5 text-xl">
          <input
            type="checkbox"
            checked={v.penalty}
            onChange={(e) => onChange({ penalty: e.target.checked })}
            className="h-5 w-5 accent-[#3f7d24]"
          />
          Pénalité: +1 s par erreur non corrigée
        </label>
      </div>

      <label className="flex items-center gap-2.5 text-xl">
        <input
          type="checkbox"
          checked={v.comebackBonus}
          onChange={(e) => onChange({ comebackBonus: e.target.checked })}
          className="h-5 w-5 accent-[#3f7d24]"
        />
        Bonus de remontée activés
      </label>
    </div>
  );

  const text = (
    <div className="flex flex-col gap-4">
      <div>
        <PixelLabel>TYPE DE TEXTE</PixelLabel>
        <div className="grid grid-cols-2 gap-2">
          <Choice
            on={v.textType === "coherent"}
            onClick={() => onChange({ textType: "coherent" })}
            title="COHÉRENT"
            sub="Vrais passages d’œuvres du domaine public."
          />
          <Choice
            on={v.textType === "aleatoire"}
            onClick={() => onChange({ textType: "aleatoire" })}
            title="ALÉATOIRE"
            sub="Mots tirés d’un dictionnaire."
          />
        </div>
      </div>

      <div>
        <PixelLabel>COMPLEXITÉ</PixelLabel>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(COMPLEXITY_LABELS) as Difficulty[]).map((level) => (
            <Choice
              key={level}
              on={v.complexity === level}
              onClick={() => onChange({ complexity: level })}
              title={COMPLEXITY_LABELS[level][0]}
              sub={COMPLEXITY_LABELS[level][1]}
            />
          ))}
        </div>
      </div>

      <div>
        <PixelLabel>LONGUEUR: {v.length} MOTS</PixelLabel>
        <input
          type="range"
          min={10}
          max={400}
          value={v.length}
          onChange={(e) => onChange({ length: Number(e.target.value) })}
          aria-label="Longueur du texte en mots"
          className="w-full accent-[#3f7d24]"
        />
      </div>

      <div>
        <PixelLabel>OPTIONS DU TEXTE</PixelLabel>
        <div className="flex flex-wrap gap-2">
          {TEXT_OPTIONS.map((o) => (
            <Chip key={o} on={v.options.includes(o)} onClick={() => onChange({ options: toggled(v.options, o) })}>
              {o}
            </Chip>
          ))}
        </div>
        <p className="mt-1.5 text-lg text-[#3a3a3a]">
          En mode cohérent, les passages sont adaptés (accents et ponctuation retirés si désactivés).
        </p>
      </div>

      <div aria-disabled={!random} className={!random ? "opacity-40" : ""}>
        <PixelLabel>CARACTÈRES À INCLURE</PixelLabel>
        <div className="flex flex-wrap gap-2">
          {["z", "q", "x", "w", "j", "k", "é", "ç"].map((c) => (
            <Chip
              key={c}
              on={v.includeChars.includes(c)}
              onClick={() => {
                if (!random) return;
                onChange({ includeChars: toggled(v.includeChars, c), excludeChars: v.excludeChars.filter((x) => x !== c) });
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
              on={v.excludeChars.includes(c)}
              onClick={() => {
                if (!random) return;
                onChange({ excludeChars: toggled(v.excludeChars, c), includeChars: v.includeChars.filter((x) => x !== c) });
              }}
            >
              {c}
            </Chip>
          ))}
        </div>
        {!random && (
          <p className="mt-1.5 text-lg text-[#3a3a3a]">
            Réglage désactivé en mode cohérent : réservé au texte aléatoire.
          </p>
        )}
      </div>

      <div>
        <PixelLabel>APERÇU</PixelLabel>
        <PixelSlot className="px-3.5 py-3 text-3xl leading-snug text-white">{preview || "…"}</PixelSlot>
      </div>
    </div>
  );

  if (layout === "stacked") {
    return (
      <div className="flex flex-col gap-6">
        {general}
        {text}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <PixelPanel className="w-full flex-none p-6 lg:w-[34rem]">{general}</PixelPanel>
      <PixelPanel className="w-full flex-grow p-6">{text}</PixelPanel>
    </div>
  );
}
