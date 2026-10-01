import { PixelAvatar, PixelButton, PixelPanel } from "@/components/ui";

const textSegments: { text: string; state: "ok" | "error" | "current" | "rest" | "blur" }[] = [
  { text: "Le vent se lève sur la colline et la n", state: "ok" },
  { text: "u", state: "error" },
  { text: "i", state: "current" },
  {
    text:
      "t tombe doucement sur le village endormi. Les lanternes s’allument une à une pendant " +
      "que les mineurs remontent vers la surface, fatigués mais fiers de leur récolte. ",
    state: "rest",
  },
  { text: "Demain, tout recommencera, plus vite encore.", state: "blur" },
];

const segmentClass: Record<(typeof textSegments)[number]["state"], string> = {
  ok: "text-[#7fd36a]",
  error: "bg-[#b0281c] text-white",
  current: "bg-[#f0b429] text-[#1b1b1b]",
  rest: "text-[#d8d8d8]",
  blur: "text-[#d8d8d8] blur-[3.5px]",
};

const rows = [
  { pos: 1, initial: "S", name: "Sam", mpm: 74, width: "61%", color: "#17706f", me: false },
  { pos: 2, initial: "M", name: "Maxime", mpm: 69, width: "54%", color: "#a85512", me: false },
  { pos: 3, initial: "A", name: "Toi", mpm: 68, width: "46%", color: "#3d6fc4", me: true },
  { pos: 4, initial: "L", name: "Léa", mpm: 66, width: "44%", color: "#b03a7a", me: false },
  { pos: 5, initial: "I", name: "Inès", mpm: 61, width: "40%", color: "#7a45b0", me: false },
  { pos: 6, initial: "B", name: "Bot Interm.", mpm: 45, width: "38%", color: "#555555", me: false },
  { pos: 7, initial: "N", name: "Noah", mpm: 52, width: "31%", color: "#3f7d24", me: false },
  { pos: 8, initial: "Z", name: "Zoé", mpm: 40, width: "22%", color: "#b63a32", me: false },
];

export default async function CoursePage({ params }: PageProps<"/course/[code]">) {
  const { code } = await params;

  return (
    <div className="pixel-night min-h-screen">
      <div className="pixel-grass h-5 border-b-4 border-[#2f5d1c]" />

      <header className="flex h-16 items-center gap-6 border-b-4 border-black bg-[#241a10] px-4 sm:px-8">
        <div className="flex items-center gap-1.5">
          <span className="pixel-key">K</span>
          <span className="pixel-key bg-[#7fc45a]">E</span>
          <span className="pixel-key">Y</span>
          <span className="font-pixel ml-2 text-lg text-white [text-shadow:3px_3px_0_#000]">
            MINE
          </span>
        </div>
        <div className="font-pixel flex-grow truncate text-xs text-[#f1e6c9]">
          FRANÇAIS 3E – MME ROY · SALLE {code.toUpperCase()}
        </div>
        <PixelAvatar label="A" color="#3d6fc4" className="h-9 w-9 text-sm" />
      </header>

      <main className="px-4 py-6 sm:px-8 sm:py-7">
        <div className="mb-6 flex flex-wrap items-center gap-3.5">
          <div className="pixel-slot flex w-48 flex-col gap-1 px-4 py-2">
            <b className="font-pixel text-[9px] text-[#ffefb3]">TEMPS RESTANT</b>
            <span className="font-pixel py-1 text-2xl text-white">02:46</span>
          </div>
          <div className="pixel-slot flex w-36 flex-col gap-1 px-4 py-2">
            <b className="font-pixel text-[9px] text-[#ffefb3]">VITESSE</b>
            <span className="text-3xl text-white">68 MPM</span>
          </div>
          <div className="pixel-slot flex w-36 flex-col gap-1 px-4 py-2">
            <b className="font-pixel text-[9px] text-[#ffefb3]">PRÉCISION</b>
            <span className="text-3xl text-white">97 %</span>
          </div>
          <div className="pixel-slot flex w-32 flex-col gap-1 px-4 py-2">
            <b className="font-pixel text-[9px] text-[#ffefb3]">ERREURS</b>
            <span className="text-3xl text-white">3</span>
          </div>
          <div className="flex-grow" />
          <PixelButton href={`/resultats/${code}`} variant="red" className="h-16 w-full text-base sm:w-64">
            ABANDONNER
          </PixelButton>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex-grow">
            <PixelPanel className="p-4">
              <div className="border-4 border-black bg-[#1b1b1b] p-6 text-3xl leading-relaxed sm:text-4xl">
                {textSegments.map((s, i) => (
                  <span key={i} className={segmentClass[s.state]}>
                    {s.text}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-pixel text-[11px] text-white">PROGRESSION 46 %</span>
                <span className="text-xl text-[#3a3a3a]">
                  Les erreurs restent en rouge jusqu&rsquo;à la fin.
                </span>
              </div>
            </PixelPanel>

            <div className="mt-5 flex flex-wrap items-center gap-5">
              <div className="flex gap-2">
                <div className="pixel-slot flex h-20 w-20 flex-col items-center justify-center gap-1.5 border-[#ffe08a] bg-[#f0b429] text-[#2b1e13]">
                  <span className="font-pixel text-lg">−5</span>
                  <span className="font-pixel text-[7px]">MOTS</span>
                </div>
                <div className="pixel-slot h-20 w-20 opacity-50" />
                <div className="pixel-slot h-20 w-20 opacity-50" />
              </div>
              <div className="leading-tight">
                <div className="font-pixel text-[11px] text-[#ffd84a]">BONUS RACCOURCI</div>
                <div className="text-xl text-[#f1e6c9]">
                  Appuie sur Tab pour retirer 5 mots de ton texte.
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <div className="font-pixel border-4 border-black bg-[#ffd84a] px-4 py-2.5 text-[12px] text-[#1b1b1b]">
                TU DÉPASSES LÉA !
              </div>
              <div className="font-pixel border-4 border-black bg-[#b0281c] px-4 py-2.5 text-[12px] text-white">
                FLOU REÇU · 6 s
              </div>
            </div>
          </div>

          <PixelPanel className="w-full flex-none p-4 lg:w-96">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="font-pixel text-xs text-[#2b2b2b]">CLASSEMENT</span>
              <span className="text-xl text-[#3a3a3a]">2 spectateurs</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {rows.map((r) => (
                <div
                  key={r.pos}
                  className="flex items-center gap-2.5 px-2.5 py-1.5"
                  style={{ background: r.me ? "#f0b429" : "#6b6b6b" }}
                >
                  <span
                    className="font-pixel w-5 text-[11px]"
                    style={{ color: r.me ? "#1b1b1b" : "#ffffff" }}
                  >
                    {r.pos}
                  </span>
                  <PixelAvatar label={r.initial} color={r.color} className="h-7 w-7 text-[11px]" />
                  <div className="min-w-0 flex-grow leading-none">
                    <div
                      className="flex justify-between text-xl"
                      style={{ color: r.me ? "#1b1b1b" : "#ffffff" }}
                    >
                      <span>{r.name}</span>
                      <span>{r.mpm}</span>
                    </div>
                    <div className="mt-1 h-3 border-2 border-black bg-[#1b1b1b]">
                      <div
                        className="h-full"
                        style={{
                          width: r.width,
                          background:
                            "repeating-linear-gradient(90deg, #7fd36a 0 8px, #4aa233 8px 10px)",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PixelPanel>
        </div>
      </main>
    </div>
  );
}
