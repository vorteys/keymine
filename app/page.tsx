import { PixelShell } from "@/components/PixelShell";
import { PixelButton, PixelPanel, PixelSlot } from "@/components/ui";

const lobbies = [
  {
    name: "Français 3e – Mme Roy",
    sub: "Publique · Texte · FR",
    count: "18/30",
    cta: "REJOINDRE",
    variant: "green" as const,
    href: "/jouer/km4f7q",
  },
  {
    name: "English club",
    sub: "Public · Scrambled words · EN",
    count: "7/20",
    cta: "REJOINDRE",
    variant: "green" as const,
    href: "/jouer/eng21",
  },
  {
    name: "Défi des accents",
    sub: "Publique · Désordre + accents · FR",
    count: "11/30",
    cta: "REJOINDRE",
    variant: "green" as const,
    href: "/jouer/acc09",
  },
  {
    name: "Bots contre la classe",
    sub: "Publique · Texte · FR · 4 bots",
    count: "9/25",
    cta: "REJOINDRE",
    variant: "green" as const,
    href: "/jouer/bot55",
  },
  {
    name: "Salle du midi",
    sub: "Publique · Caractères ciblés « z » · FR",
    count: "30/30",
    cta: "PLEIN",
    variant: "slate" as const,
    href: "/",
  },
];

export default function Home() {
  return (
    <PixelShell active="lobbys">
      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-16">
        <div className="flex w-full flex-col gap-5 lg:w-[30rem] lg:flex-none">
          <h1 className="font-pixel text-3xl leading-relaxed text-white [text-shadow:4px_4px_0_#000]">
            TAPE PLUS VITE QUE TA CLASSE.
          </h1>
          <p className="text-2xl leading-tight text-[#f1e6c9]">
            Des courses de frappe en direct. Tout le monde tape le même texte, le plus rapide
            monte sur le podium.
          </p>

          <PixelButton href="/jouer/creer" variant="green" className="h-24 text-3xl">
            JOUER
          </PixelButton>
          <p className="-mt-2 text-xl text-[#f1e6c9]">
            Partie rapide: on te place dans un lobby, ou on en crée un et tu deviens le Chef.
          </p>

          <form className="flex items-stretch gap-3">
            <input
              aria-label="Code de la course"
              placeholder="CODE"
              className="pixel-slot font-pixel flex-grow px-4 text-lg tracking-[4px] text-white placeholder:text-white/60"
            />
            <PixelButton variant="slate" type="submit" className="w-52 text-sm">
              ENTRER
            </PixelButton>
          </form>

          <div className="flex gap-3">
            <PixelButton href="/jouer/creer" variant="gold" className="flex-grow text-sm">
              CRÉER UNE COURSE
            </PixelButton>
            <PixelButton href="/connexion" variant="slate" className="flex-grow text-sm">
              COMPTE
            </PixelButton>
          </div>
          <p className="text-xl text-[#c9bb98]">
            Sans compte, tu joues en invité: ton historique s’efface à la fermeture de la page.
          </p>
        </div>

        <PixelPanel className="w-full flex-grow self-start p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-pixel text-sm text-[#2b2b2b]">LOBBYS PUBLICS</span>
            <span className="text-2xl text-[#3a3a3a]">{lobbies.length} salles</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {lobbies.map((l) => (
              <PixelSlot key={l.name} className="flex items-center gap-3.5 px-3.5 py-2.5">
                <div className="min-w-0 flex-grow">
                  <div className="text-2xl leading-none text-white">{l.name}</div>
                  <div className="text-xl text-[#e3e3e3]">{l.sub}</div>
                </div>
                <div className="font-pixel text-xs text-white">{l.count}</div>
                <PixelButton href={l.href} variant={l.variant} className="h-11 w-36 text-[11px]">
                  {l.cta}
                </PixelButton>
              </PixelSlot>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2.5">
            <PixelSlot className="px-3 py-2">
              <div className="font-pixel text-[9px] text-[#ffe08a]">MEILLEUR</div>
              <div className="text-3xl text-white">84 MPM</div>
            </PixelSlot>
            <PixelSlot className="px-3 py-2">
              <div className="font-pixel text-[9px] text-[#ffe08a]">COURSES</div>
              <div className="text-3xl text-white">128</div>
            </PixelSlot>
            <PixelSlot className="px-3 py-2">
              <div className="font-pixel text-[9px] text-[#ffe08a]">PRÉCISION</div>
              <div className="text-3xl text-white">95 %</div>
            </PixelSlot>
          </div>
        </PixelPanel>
      </div>
    </PixelShell>
  );
}
