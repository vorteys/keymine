import Link from "next/link";
import { PixelShell } from "@/components/PixelShell";
import { PixelButton, PixelPanel, PixelSlot } from "@/components/ui";
import { JoinByCodeForm, QuickPlayButton } from "@/components/HomeActions";
import { db } from "@/lib/db";
import { peekIdentity } from "@/lib/auth/identity";

export const dynamic = "force-dynamic";

async function getPublicLobbies() {
  const lobbies = await db
    .selectFrom("lobbies")
    .where("status", "=", "lobby")
    .where("access", "=", "public")
    .select((eb) => [
      "code",
      "name",
      "language",
      "text_type",
      "complexity",
      "max_players",
      eb
        .selectFrom("lobby_players")
        .select((inner) => inner.fn.countAll<number>().as("count"))
        .whereRef("lobby_players.lobby_id", "=", "lobbies.id")
        .where("role", "=", "participant")
        .as("player_count"),
    ])
    .orderBy("created_at", "desc")
    .limit(5)
    .execute();

  return lobbies.map((l) => ({
    name: l.name,
    sub: `Publique · ${l.text_type} · ${l.language.toUpperCase()}`,
    count: `${Number(l.player_count ?? 0)}/${l.max_players}`,
    full: Number(l.player_count ?? 0) >= l.max_players,
    href: `/jouer/${l.code}`,
  }));
}

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
  const [lobbies, stats] = await Promise.all([getPublicLobbies(), getMiniStats()]);

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

        <PixelPanel className="w-full flex-grow self-start p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-pixel text-sm text-[#2b2b2b]">LOBBYS PUBLICS</span>
            <span className="text-2xl text-[#3a3a3a]">{lobbies.length} salles</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {lobbies.length === 0 && (
              <p className="text-2xl text-[#3a3a3a]">
                Aucune salle publique pour l’instant. Lance la première avec « Créer une course »!
              </p>
            )}
            {lobbies.map((l) => (
              <PixelSlot key={l.href} className="flex items-center gap-3.5 px-3.5 py-2.5">
                <div className="min-w-0 flex-grow">
                  <div className="text-2xl leading-none text-white">{l.name}</div>
                  <div className="text-xl text-[#e3e3e3]">{l.sub}</div>
                </div>
                <div className="font-pixel text-xs text-white">{l.count}</div>
                <Link
                  href={l.href}
                  className="pixel-btn h-11 w-36 text-[11px]"
                  data-variant={l.full ? "slate" : "green"}
                >
                  {l.full ? "PLEIN" : "REJOINDRE"}
                </Link>
              </PixelSlot>
            ))}
          </div>

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
        </PixelPanel>
      </div>
    </PixelShell>
  );
}
