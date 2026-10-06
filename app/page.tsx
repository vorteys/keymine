import { PixelShell } from "@/components/PixelShell";
import { PixelButton, PixelSlot } from "@/components/ui";
import { PublicLobbies } from "@/components/PublicLobbies";
import { listPublicLobbies } from "@/lib/public-lobbies";
import { JoinByCodeForm, QuickPlayButton } from "@/components/HomeActions";
import { db } from "@/lib/db";
import { peekIdentity } from "@/lib/auth/identity";

export const dynamic = "force-dynamic";

async function getMiniStats() {
  const identity = await peekIdentity();
  if (!identity || identity.kind !== "user") return null;

  const user = await db
    .selectFrom("users")
    .select(["best_wpm", "total_races"])
    .where("id", "=", identity.userId)
    .executeTakeFirst();
  if (!user) return null;

  const acc = await db
    .selectFrom("race_participants")
    .select((eb) => eb.fn.avg<number>("accuracy").as("avg_accuracy"))
    .where("user_id", "=", identity.userId)
    .where("status", "=", "finished")
    .executeTakeFirst();

  return {
    bestWpm: Math.round(user.best_wpm),
    totalRaces: user.total_races,
    accuracy: acc?.avg_accuracy ? Math.round(acc.avg_accuracy) : null,
  };
}

export default async function Home() {
  const [lobbies, stats] = await Promise.all([listPublicLobbies(), getMiniStats()]);

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

          <QuickPlayButton className="h-24 text-3xl" />
          <p className="-mt-2 text-xl text-[#f1e6c9]">
            Partie rapide: on te place dans un lobby, ou on en crée un et tu deviens le Chef.
          </p>

          <JoinByCodeForm />

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

        <div className="flex w-full flex-grow flex-col gap-3">
          <PublicLobbies initial={lobbies} />

          <div className="mt-3 grid grid-cols-3 gap-2.5">
            <PixelSlot className="px-3 py-2">
              <div className="font-pixel text-[9px] text-[#ffe08a]">MEILLEUR</div>
              <div className="text-3xl text-white">{stats ? `${stats.bestWpm} MPM` : "—"}</div>
            </PixelSlot>
            <PixelSlot className="px-3 py-2">
              <div className="font-pixel text-[9px] text-[#ffe08a]">COURSES</div>
              <div className="text-3xl text-white">{stats ? stats.totalRaces : "—"}</div>
            </PixelSlot>
            <PixelSlot className="px-3 py-2">
              <div className="font-pixel text-[9px] text-[#ffe08a]">PRÉCISION</div>
              <div className="text-3xl text-white">
                {stats?.accuracy != null ? `${stats.accuracy} %` : "—"}
              </div>
            </PixelSlot>
          </div>
        </div>
      </div>
    </PixelShell>
  );
}
