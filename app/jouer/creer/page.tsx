"use client";

import { useState } from "react";
import { PixelShell } from "@/components/PixelShell";
import { PixelButton, PixelLabel, PixelPanel, PixelSlot } from "@/components/ui";

type Access = "publique" | "code" | "privee";
type ErrorMode = "accumuler" | "bloquer";
type TextMode = "texte" | "desordre" | "cible";
type BotLevel = "débutant" | "intermédiaire" | "expert" | "impossible";

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
  const [access, setAccess] = useState<Access>("publique");
  const [language, setLanguage] = useState<"FR" | "EN">("FR");
  const [duration, setDuration] = useState("5 minutes");
  const [lobbySize, setLobbySize] = useState(30);
  const [errorMode, setErrorMode] = useState<ErrorMode>("accumuler");
  const [penalty, setPenalty] = useState(true);
  const [bots, setBots] = useState<Set<BotLevel>>(new Set(["intermédiaire", "expert"]));
  const [bonus, setBonus] = useState(false);
  const [textMode, setTextMode] = useState<TextMode>("desordre");
  const [length, setLength] = useState(40);
  const [cutOff, setCutOff] = useState(false);
  const [accents, setAccents] = useState<Set<string>>(new Set(["é", "è", "ç"]));
  const [targets, setTargets] = useState<Set<string>>(new Set(["z"]));
  const [options, setOptions] = useState<Set<string>>(new Set(["Majuscules", "Ponctuation"]));

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
                    ["publique", "PUBLIQUE", "Listée à l’accueil"],
                    ["code", "PAR CODE", "Cachée, on entre avec un code"],
                    ["privee", "PRIVÉE", "Un lien unique par invité"],
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
                  {(["FR", "EN"] as const).map((lang) => (
                    <Chip key={lang} on={language === lang} onClick={() => setLanguage(lang)}>
                      {lang}
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
                  onChange={(e) => setDuration(e.target.value)}
                >
                  <option>5 minutes</option>
                  <option>10 minutes</option>
                  <option>30 minutes</option>
                  <option>2 heures</option>
                </select>
              </div>
            </div>

            <div>
              <PixelLabel>TAILLE MAX DU LOBBY: {lobbySize} JOUEURS</PixelLabel>
              <input
                type="range"
                min={2}
                max={100}
                value={lobbySize}
                onChange={(e) => setLobbySize(Number(e.target.value))}
                aria-label="Taille maximale du lobby"
                className="w-full accent-[#3f7d24]"
              />
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
                {(["débutant", "intermédiaire", "expert", "impossible"] as const).map((lvl) => (
                  <Chip key={lvl} on={bots.has(lvl)} onClick={() => setBots(toggle(bots, lvl))}>
                    {lvl.toUpperCase()}
                  </Chip>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-xl">
              <input
                type="checkbox"
                checked={bonus}
                onChange={(e) => setBonus(e.target.checked)}
                className="h-5 w-5 accent-[#3f7d24]"
              />
              Activer les bonus (Rallonge, Raccourci, Flou)
            </label>
          </div>
        </PixelPanel>

        <PixelPanel className="w-full flex-grow p-6">
          <div className="flex flex-col gap-4">
            <div>
              <PixelLabel>MODE DE TEXTE</PixelLabel>
              <div className="flex gap-2">
                {(
                  [
                    ["texte", "TEXTE"],
                    ["desordre", "DÉSORDRE"],
                    ["cible", "CIBLÉ"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTextMode(key)}
                    data-on={textMode === key}
                    className="pixel-chip flex-1 justify-center text-xl"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-lg text-[#3a3a3a]">
                Texte: vrais mots et phrases. Désordre: mots sans lien. Ciblé: on travaille des
                caractères précis.
              </p>
            </div>

            <div>
              <PixelLabel>LONGUEUR: {length} MOTS</PixelLabel>
              <input
                type="range"
                min={5}
                max={300}
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                aria-label="Longueur du texte"
                className="w-full accent-[#3f7d24]"
              />
              <label className="mt-1 flex items-center gap-2.5 text-lg">
                <input
                  type="checkbox"
                  checked={cutOff}
                  onChange={(e) => setCutOff(e.target.checked)}
                  className="h-4 w-4 accent-[#3f7d24]"
                />
                Couper net dans un extrait
              </label>
            </div>

            <div>
              <PixelLabel>ACCENTS (AU MOINS UN MOT EN CONTIENT)</PixelLabel>
              <div className="flex flex-wrap gap-2">
                {["é", "è", "ê", "à", "ç", "ù", "î", "ô"].map((a) => (
                  <Chip key={a} on={accents.has(a)} onClick={() => setAccents(toggle(accents, a))}>
                    {a}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <PixelLabel>CARACTÈRES CIBLÉS</PixelLabel>
              <div className="flex flex-wrap gap-2">
                {["z", "q", "x", "w", "j"].map((c) => (
                  <Chip key={c} on={targets.has(c)} onClick={() => setTargets(toggle(targets, c))}>
                    {c}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <PixelLabel>OPTIONS DU TEXTE</PixelLabel>
              <div className="flex flex-wrap gap-2">
                {["Majuscules", "Ponctuation", "Chiffres", "Symboles"].map((o) => (
                  <Chip key={o} on={options.has(o)} onClick={() => setOptions(toggle(options, o))}>
                    {o}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <PixelLabel>APERÇU</PixelLabel>
              <PixelSlot className="px-3.5 py-3 text-3xl leading-snug text-white">
                Zèbre forêt garçon Élève zigzag pâte Noël
              </PixelSlot>
            </div>
          </div>
        </PixelPanel>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4 border-t-4 border-black bg-[#241a10] px-4 py-5 sm:flex-row sm:justify-between">
        <p className="text-2xl text-[#f1e6c9]">
          Minimum 2 participants, bots inclus. Tu seras le Chef de la course.
        </p>
        <div className="flex gap-3.5">
          <PixelButton href="/" variant="slate" className="h-13 px-5 text-[13px]">
            ANNULER
          </PixelButton>
          <PixelButton href="/jouer/km4f7q" variant="green" className="h-13 px-7 text-[15px]">
            CRÉER LA SALLE
          </PixelButton>
        </div>
      </div>
    </PixelShell>
  );
}
