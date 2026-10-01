import { PixelShell } from "@/components/PixelShell";
import { PixelAvatar, PixelButton, PixelKeyboard, PixelSlot } from "@/components/ui";

const history = [
  { day: "Aujourd’hui", mode: "Désordre", result: "68 MPM", rank: "3e" },
  { day: "Aujourd’hui", mode: "Texte", result: "71 MPM", rank: "2e" },
  { day: "Hier", mode: "Ciblé z", result: "58 MPM", rank: "4e" },
  { day: "Hier", mode: "Texte", result: "74 MPM", rank: "1er" },
  { day: "Lundi", mode: "Accents", result: "84 MPM", rank: "1er" },
];

const progressionPoints =
  "20,146 56,134 92,140 128,125 164,116 200,128 236,110 272,104 308,113 344,98 " +
  "380,92 416,101 452,86 488,80 524,89 560,74 596,68 632,77 668,56 704,38";

export default function ProfilPage() {
  return (
    <PixelShell active="stats">
      <div className="flex flex-col gap-7 lg:flex-row lg:items-start">
        <div className="flex w-full flex-col gap-6 lg:w-80 lg:flex-none">
          <div className="pixel-panel flex flex-col items-center gap-3 p-6">
            <PixelAvatar label="A" color="#3d6fc4" className="h-32 w-32 border-[5px] text-5xl" />
            <div className="font-pixel text-lg">ALEXY</div>
            <p className="text-center text-xl leading-tight text-[#3a3a3a]">
              Compte créé il y a 3 mois
              <br />
              Photo reprise de Discord
            </p>
            <PixelButton href="/profil" variant="slate" className="h-11 w-full text-[11px]">
              CHANGER LA PHOTO
            </PixelButton>
          </div>

          <div className="pixel-panel flex flex-col gap-2.5 p-5">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-sm">NIVEAU 7</span>
              <span className="text-2xl text-[#3a3a3a]">640 / 800 XP</span>
            </div>
            <div className="h-5.5 border-[3px] border-black bg-[#1b1b1b]">
              <div
                className="h-full w-4/5"
                style={{
                  background: "repeating-linear-gradient(90deg, #7fd36a 0 10px, #4aa233 10px 12px)",
                }}
              />
            </div>
            <div className="mt-1.5 flex gap-2">
              <PixelSlot className="flex h-16 flex-1 flex-col items-center justify-center gap-1 leading-none">
                <span className="font-pixel text-xs text-[#f0b429]">80+</span>
                <span className="text-lg text-white">MPM</span>
              </PixelSlot>
              <PixelSlot className="flex h-16 flex-1 flex-col items-center justify-center gap-1 leading-none">
                <span className="font-pixel text-xs text-[#f0b429]">100</span>
                <span className="text-lg text-white">COURSES</span>
              </PixelSlot>
              <PixelSlot className="flex h-16 flex-1 flex-col items-center justify-center gap-1 leading-none">
                <span className="font-pixel text-xs text-[#f0b429]">5 j</span>
                <span className="text-lg text-white">SÉRIE</span>
              </PixelSlot>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-grow flex-col gap-6">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {[
              ["MEILLEUR", "84 MPM"],
              ["MOYENNE", "62 MPM"],
              ["PRÉCISION", "95,4 %"],
              ["COURSES", "128"],
              ["SÉRIE", "6 jours"],
            ].map(([label, value]) => (
              <PixelSlot key={label} className="p-2.5 leading-none">
                <b className="font-pixel mb-1 block text-[9px] text-[#ffefb3]">{label}</b>
                <span className="text-3xl text-white">{value}</span>
              </PixelSlot>
            ))}
          </div>

          <div className="pixel-panel p-5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="font-pixel text-sm">PROGRESSION · 20 DERNIÈRES COURSES</span>
              <span className="text-xl text-[#3a3a3a]">+36 MPM depuis ta première course</span>
            </div>
            <div className="border-4 border-black bg-[#1b1b1b] p-2">
              <svg
                viewBox="0 0 720 220"
                width="100%"
                role="img"
                aria-label="Courbe de progression de la vitesse en mots par minute, de 48 à 84 sur les 20 dernières courses"
              >
                <g stroke="#3a3a3a" strokeWidth="1">
                  <line x1="0" y1="50" x2="720" y2="50" />
                  <line x1="0" y1="100" x2="720" y2="100" />
                  <line x1="0" y1="150" x2="720" y2="150" />
                  <line x1="0" y1="200" x2="720" y2="200" />
                </g>
                <line
                  x1="0"
                  y1="38"
                  x2="720"
                  y2="38"
                  stroke="#f0b429"
                  strokeWidth="2"
                  strokeDasharray="8 6"
                />
                <polyline fill="none" stroke="#7fd36a" strokeWidth="4" points={progressionPoints} />
                <circle cx="704" cy="38" r="7" fill="#f0b429" stroke="#000" strokeWidth="2" />
                <text x="8" y="30" fill="#ffefb3" fontSize="14" fontFamily="monospace">
                  RECORD 84
                </text>
                <text x="8" y="216" fill="#c9c9c9" fontSize="13" fontFamily="monospace">
                  30 MPM
                </text>
              </svg>
            </div>
          </div>

          <div className="pixel-panel p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-pixel text-sm">TOUCHES À TRAVAILLER</span>
              <span className="text-xl text-[#3a3a3a]">Rouge: à améliorer · Vert: maîtrisé</span>
            </div>
            <PixelKeyboard className="mx-auto w-full max-w-3xl" />
          </div>

          <div className="pixel-panel p-5">
            <div className="font-pixel mb-2.5 text-sm">HISTORIQUE</div>
            {history.map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b-2 border-dotted border-[#8b8b8b] py-1 text-xl"
              >
                <span>{h.day}</span>
                <span className="text-[#3a3a3a]">{h.mode}</span>
                <b className="font-normal">{h.result}</b>
                <span className="font-pixel text-[10px]">{h.rank}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PixelShell>
  );
}
