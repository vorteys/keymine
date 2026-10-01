import { Fragment } from "react";
import { PixelShell } from "@/components/PixelShell";
import { PixelAvatar, PixelButton, PixelPanel } from "@/components/ui";

function heatColor(pct: number) {
  if (pct >= 95) return "#7fd36a";
  if (pct >= 90) return "#b9e05a";
  if (pct >= 85) return "#f2d24a";
  if (pct >= 78) return "#f5a34a";
  return "#ff7b6b";
}

const keyboardRows: { indent: string; keys: [string, number][] }[] = [
  {
    indent: "0px",
    keys: [
      ["Q", 94], ["W", 91], ["E", 98], ["R", 96], ["T", 95],
      ["Y", 88], ["U", 93], ["I", 97], ["O", 92], ["P", 79],
    ],
  },
  {
    indent: "22px",
    keys: [
      ["A", 97], ["S", 95], ["D", 96], ["F", 98], ["G", 90],
      ["H", 94], ["J", 96], ["K", 93], ["L", 91],
    ],
  },
  {
    indent: "48px",
    keys: [["Z", 68], ["X", 74], ["C", 90], ["V", 92], ["B", 89], ["N", 95], ["M", 96]],
  },
];

const table = [
  { pos: 1, name: "Sam", mpm: 74, acc: "98 %", err: 3 },
  { pos: 2, name: "Maxime", mpm: 69, acc: "95 %", err: 7 },
  { pos: 3, name: "Toi (Alexy)", mpm: 68, acc: "96 %", err: 6 },
  { pos: 4, name: "Léa", mpm: 66, acc: "97 %", err: 4 },
  { pos: 5, name: "Bot Intermédiaire", mpm: 45, acc: "95 %", err: 9 },
];

export default async function ResultatsPage({ params }: PageProps<"/resultats/[code]">) {
  const { code } = await params;

  return (
    <PixelShell active="lobbys">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-pixel text-xl text-white [text-shadow:4px_4px_0_#000]">
          COURSE TERMINÉE
        </h1>
        <span className="text-2xl text-[#f1e6c9]">
          Salle {code.toUpperCase()} · Désordre + accents · 40 mots · 1:12
        </span>
      </div>

      <div className="flex flex-col gap-7 lg:flex-row lg:items-start">
        <div className="flex w-full flex-col gap-6 lg:w-[32rem] lg:flex-none">
          <PixelPanel className="p-5">
            <div className="font-pixel mb-3.5 text-sm text-[#2b2b2b]">PODIUM</div>
            <div className="flex h-72 items-end justify-center gap-2.5">
              <div className="flex w-36 flex-col items-center gap-1">
                <PixelAvatar label="M" color="#a85512" className="h-13 w-13 text-xl" />
                <div className="text-2xl leading-none">Maxime</div>
                <div className="text-xl leading-none text-[#3a3a3a]">69 MPM</div>
                <div className="font-pixel flex h-32 w-full items-center justify-center border-4 border-black bg-[#a8a8a8] text-3xl text-[#1b1b1b]">
                  2
                </div>
              </div>
              <div className="flex w-40 flex-col items-center gap-1">
                <PixelAvatar label="S" color="#17706f" className="h-14 w-14 text-2xl" />
                <div className="text-2xl leading-none">Sam</div>
                <div className="text-xl leading-none text-[#3a3a3a]">74 MPM</div>
                <div className="font-pixel flex h-44 w-full items-center justify-center border-4 border-black bg-[#f0b429] text-4xl text-[#1b1b1b]">
                  1
                </div>
              </div>
              <div className="flex w-36 flex-col items-center gap-1">
                <PixelAvatar label="A" color="#3d6fc4" className="h-13 w-13 text-xl" />
                <div className="text-2xl leading-none">Toi</div>
                <div className="text-xl leading-none text-[#3a3a3a]">68 MPM</div>
                <div className="font-pixel flex h-24 w-full items-center justify-center border-4 border-black bg-[#9a6b3c] text-2xl text-white">
                  3
                </div>
              </div>
            </div>
          </PixelPanel>

          <PixelPanel className="p-5">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-sm text-[#2b2b2b]">TON RÉSULTAT</span>
              <span className="font-pixel border-4 border-black bg-[#3f7d24] px-2 py-1.5 text-[9px] text-white">
                +4 MPM VS TA MOYENNE
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2.5">
              <div className="pixel-slot px-3 py-2 leading-none">
                <div className="font-pixel text-[9px] text-[#ffefb3]">VITESSE</div>
                <div className="mt-1 text-4xl text-white">68 MPM</div>
              </div>
              <div className="pixel-slot px-3 py-2 leading-none">
                <div className="font-pixel text-[9px] text-[#ffefb3]">PRÉCISION</div>
                <div className="mt-1 text-4xl text-white">96 %</div>
              </div>
              <div className="pixel-slot px-3 py-2 leading-none">
                <div className="font-pixel text-[9px] text-[#ffefb3]">ERREURS</div>
                <div className="mt-1 text-4xl text-white">6</div>
              </div>
            </div>
          </PixelPanel>
        </div>

        <div className="flex w-full flex-grow flex-col gap-6">
          <PixelPanel className="p-5">
            <div className="font-pixel mb-2.5 text-sm text-[#2b2b2b]">
              CLASSEMENT DE LA COURSE
            </div>
            <div className="grid grid-cols-[36px_1fr_74px_84px_66px] gap-x-2.5 gap-y-1 text-xl leading-tight">
              <span className="font-pixel text-[8px] text-[#3a3a3a]">#</span>
              <span className="font-pixel text-[8px] text-[#3a3a3a]">JOUEUR</span>
              <span className="font-pixel text-[8px] text-[#3a3a3a]">MPM</span>
              <span className="font-pixel text-[8px] text-[#3a3a3a]">PRÉCISION</span>
              <span className="font-pixel text-[8px] text-[#3a3a3a]">ERREURS</span>
              {table.map((t) => (
                <Fragment key={t.pos}>
                  <span className="font-pixel pt-1 text-[11px]">{t.pos}</span>
                  <span>{t.name}</span>
                  <span>{t.mpm}</span>
                  <span>{t.acc}</span>
                  <span>{t.err}</span>
                </Fragment>
              ))}
            </div>
          </PixelPanel>

          <PixelPanel className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-pixel text-sm text-[#2b2b2b]">HEATMAP DU CLAVIER</span>
              <span className="text-xl text-[#3a3a3a]">Rouge: à améliorer · Vert: maîtrisé</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {keyboardRows.map((row, i) => (
                <div key={i} className="flex gap-1.5" style={{ marginLeft: row.indent }}>
                  {row.keys.map(([letter, pct]) => (
                    <div
                      key={letter}
                      className="font-pixel flex h-13 w-11 flex-col items-center justify-center gap-0.5 border-[3px] border-black text-[#1b1b1b]"
                      style={{ background: heatColor(pct) }}
                    >
                      <b className="text-[13px] font-normal">{letter}</b>
                      <span className="text-lg">{pct}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p className="mt-2.5 text-xl">
              À travailler en priorité:{" "}
              <b className="border-2 border-black bg-[#ff7b6b] px-1.5 font-normal">Z</b>{" "}
              <b className="border-2 border-black bg-[#ff7b6b] px-1.5 font-normal">X</b>{" "}
              <b className="border-2 border-black bg-[#f5a34a] px-1.5 font-normal">P</b>
            </p>
          </PixelPanel>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-end gap-3.5 border-t-4 border-black bg-[#241a10] px-4 py-5">
        <PixelButton href="/profil" variant="gold" className="h-13 px-5 text-xs">
          MES STATS
        </PixelButton>
        <PixelButton href="/" variant="slate" className="h-13 px-5 text-xs">
          ACCUEIL
        </PixelButton>
        <PixelButton href="/jouer/creer" variant="green" className="h-13 px-7 text-sm">
          REJOUER
        </PixelButton>
      </div>
    </PixelShell>
  );
}
