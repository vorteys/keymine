import Link from "next/link";
import { PixelShell } from "@/components/PixelShell";
import { PixelAvatar, PixelButton, PixelPanel, PixelSlot } from "@/components/ui";

const players = [
  { initial: "A", name: "Alexy", tag: "CHEF · TOI", color: "#3d6fc4" },
  { initial: "L", name: "Léa", tag: "PRÊTE", color: "#b03a7a" },
  { initial: "M", name: "Maxime", tag: "PRÊT", color: "#a85512" },
  { initial: "S", name: "Sam", tag: "PRÊT", color: "#17706f" },
  { initial: "I", name: "Inès", tag: "PRÊTE", color: "#7a45b0" },
  { initial: "N", name: "Noah", tag: "PRÊT", color: "#3f7d24" },
  { initial: "Z", name: "Zoé", tag: "PRÊTE", color: "#b63a32" },
  { initial: "B", name: "Bot Intermédiaire", tag: "BOT", color: "#555555" },
  { initial: "B", name: "Bot Expert", tag: "BOT", color: "#555555" },
];

const rules = [
  ["Langue", "Français"],
  ["Texte", "Désordre + accents"],
  ["Longueur", "40 mots"],
  ["Durée max", "5 min"],
  ["Erreurs", "Accumuler (+1 s)"],
  ["Bonus", "Désactivés"],
];

export default async function LobbyPage({ params }: PageProps<"/jouer/[code]">) {
  const { code } = await params;

  return (
    <PixelShell active="jouer">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="flex-grow">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-pixel mb-2.5 text-[10px] text-[#ffd84a]">
                SALLE D&rsquo;ATTENTE · PUBLIQUE · FR
              </div>
              <h1 className="font-pixel text-xl text-white [text-shadow:4px_4px_0_#000]">
                FRANÇAIS 3E – MME ROY
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {code
                .toUpperCase()
                .split("")
                .map((c, i) => (
                  <span
                    key={i}
                    className="pixel-slot font-pixel flex h-14 w-11 items-center justify-center text-xl text-white"
                  >
                    {c}
                  </span>
                ))}
            </div>
          </div>

          <PixelPanel className="p-5">
            <div className="mb-3.5 flex items-center justify-between">
              <span className="font-pixel text-sm text-[#2b2b2b]">
                JOUEURS {players.length} / 30
              </span>
              <span className="text-2xl text-[#3a3a3a]">2 spectateurs</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {players.map((p, i) => (
                <PixelSlot key={i} className="flex h-16 items-center gap-3 px-2.5">
                  <PixelAvatar label={p.initial} color={p.color} className="h-9 w-9 text-sm" />
                  <div className="min-w-0 flex-grow leading-none">
                    <div className="truncate text-2xl text-white">{p.name}</div>
                    <div className="font-pixel mt-1 text-[8px] text-[#ffe08a]">{p.tag}</div>
                  </div>
                </PixelSlot>
              ))}
            </div>
          </PixelPanel>
        </div>

        <div className="flex w-full flex-col gap-5 lg:w-96 lg:flex-none">
          <PixelPanel className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-pixel text-sm text-[#2b2b2b]">RÉGLAGES</span>
              <Link href="/jouer/creer" className="text-2xl text-[#2b2b2b] underline">
                Modifier
              </Link>
            </div>
            {rules.map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between border-b-2 border-dotted border-[#8b8b8b] py-0.5"
              >
                <span className="text-[#3a3a3a]">{k}</span>
                <b className="font-normal">{v}</b>
              </div>
            ))}
          </PixelPanel>

          <PixelPanel className="flex flex-col gap-3 p-5">
            <span className="font-pixel text-sm text-[#2b2b2b]">CHEF DE LA COURSE</span>
            <label htmlFor="host" className="text-2xl text-[#3a3a3a]">
              Transférer le rôle à
            </label>
            <select
              id="host"
              className="pixel-slot h-11 px-2.5 text-3xl text-white"
              defaultValue="Alexy"
            >
              <option>Alexy (toi)</option>
              <option>Léa</option>
              <option>Maxime</option>
            </select>
            <div className="flex gap-2.5">
              <PixelButton href="/jouer/creer" variant="slate" className="h-12 flex-1 text-[11px]">
                + BOT
              </PixelButton>
              <PixelButton href="/" variant="red" className="h-12 flex-1 text-[11px]">
                FERMER LA SALLE
              </PixelButton>
            </div>
          </PixelPanel>

          <div className="border-4 border-black bg-[#fff8dc] px-3.5 py-2.5 text-2xl leading-tight text-black">
            Départ automatique dans 0:24 si le Chef est inactif.
          </div>

          <PixelButton href={`/course/${code}`} variant="green" className="h-24 text-2xl">
            DÉMARRER
          </PixelButton>
          <p className="-mt-3 text-center text-xl text-[#f1e6c9]">
            {players.length} prêts · minimum 2 participants
          </p>
        </div>
      </div>
    </PixelShell>
  );
}
