import { Fragment } from "react";
import { redirect } from "next/navigation";
import { PixelShell } from "@/components/PixelShell";
import { PixelAvatar, PixelButton, PixelKeyboard, PixelPanel } from "@/components/ui";
import { db } from "@/lib/db";
import { peekIdentity } from "@/lib/auth/identity";
import { heatmapRowsFromCounts } from "@/lib/heatmap";
import { getLobbyByCode } from "@/lib/lobby";

const PODIUM_STYLE = [
  { height: "h-44", bg: "bg-[#f0b429]", text: "text-[#1b1e13]", size: "text-4xl", avatar: "h-14 w-14 text-2xl", label: "1" },
  { height: "h-32", bg: "bg-[#a8a8a8]", text: "text-[#1b1b1b]", size: "text-3xl", avatar: "h-13 w-13 text-xl", label: "2" },
  { height: "h-24", bg: "bg-[#9a6b3c]", text: "text-white", size: "text-2xl", avatar: "h-13 w-13 text-xl", label: "3" },
];

export default async function ResultatsPage({ params }: PageProps<"/resultats/[code]">) {
  const { code } = await params;
  const lobby = await getLobbyByCode(code);
  if (!lobby) {
    return (
      <PixelShell active="lobbys">
        <p className="font-pixel text-white">Salle introuvable.</p>
      </PixelShell>
    );
  }

  const race = await db
    .selectFrom("races")
    .selectAll()
    .where("lobby_id", "=", lobby.id)
    .orderBy("created_at", "desc")
    .executeTakeFirst();

  if (!race) {
    return (
      <PixelShell active="lobbys">
        <p className="font-pixel text-white">Aucune course pour cette salle pour l’instant.</p>
      </PixelShell>
    );
  }
  if (race.status !== "finished") {
    redirect(`/course/${code}`);
  }

  const participants = await db
    .selectFrom("race_participants")
    .selectAll()
    .where("race_id", "=", race.id)
    .where("role", "=", "participant")
    .orderBy("rank", "asc")
    .execute();

  const identity = await peekIdentity();
  const me = participants.find(
    (p) =>
      (identity?.kind === "user" && p.user_id === identity.userId) ||
      (identity?.kind === "guest" && p.guest_id === identity.guestId),
  );

  let avgWpm: number | null = null;
  if (me?.user_id) {
    const avg = await db
      .selectFrom("race_participants")
      .select((eb) => eb.fn.avg<number>("wpm").as("avg_wpm"))
      .where("user_id", "=", me.user_id)
      .where("status", "=", "finished")
      .where("race_id", "!=", race.id)
      .executeTakeFirst();
    avgWpm = avg?.avg_wpm ?? null;
  }

  const podium = participants.slice(0, 3);
  const heatmapRows = me
    ? heatmapRowsFromCounts(
        (me.key_correct as Record<string, number> | null) ?? {},
        (me.key_errors as Record<string, number> | null) ?? {},
      )
    : null;

  const worstKeys = heatmapRows
    ? heatmapRows
        .flatMap((r) => r.keys)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3)
    : [];

  return (
    <PixelShell active="lobbys">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-pixel text-xl text-white [text-shadow:4px_4px_0_#000]">
          COURSE TERMINÉE
        </h1>
        <span className="text-2xl text-[#f1e6c9]">
          Salle {code} · {participants.length} participants
        </span>
      </div>

      <div className="flex flex-col gap-7 lg:flex-row lg:items-start">
        <div className="flex w-full flex-col gap-6 lg:w-[32rem] lg:flex-none">
          <PixelPanel className="p-5">
            <div className="font-pixel mb-3.5 text-sm text-[#2b2b2b]">PODIUM</div>
            <div className="flex h-72 items-end justify-center gap-2.5">
              {[podium[1], podium[0], podium[2]].map((p, i) => {
                const style = [PODIUM_STYLE[1], PODIUM_STYLE[0], PODIUM_STYLE[2]][i]!;
                if (!p) return <div key={i} className="w-36" />;
                return (
                  <div key={p.id} className="flex w-36 flex-col items-center gap-1">
                    <PixelAvatar
                      label={p.display_name[0]?.toUpperCase() ?? "?"}
                      color={p.is_bot ? "#555555" : "#3d6fc4"}
                      className={`${style.avatar}`}
                    />
                    <div className="truncate text-2xl leading-none">{p.display_name}</div>
                    <div className="text-xl leading-none text-[#3a3a3a]">
                      {p.wpm ? Math.round(p.wpm) : 0} MPM
                    </div>
                    <div
                      className={`font-pixel flex w-full items-center justify-center border-4 border-black ${style.height} ${style.bg} ${style.text} ${style.size}`}
                    >
                      {style.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </PixelPanel>

          {me && (
            <PixelPanel className="p-5">
              <div className="flex items-center justify-between">
                <span className="font-pixel text-sm text-[#2b2b2b]">TON RÉSULTAT</span>
                {avgWpm != null && (
                  <span className="font-pixel border-4 border-black bg-[#3f7d24] px-2 py-1.5 text-[9px] text-white">
                    {me.wpm && me.wpm >= avgWpm ? "+" : ""}
                    {me.wpm ? Math.round(me.wpm - avgWpm) : 0} MPM VS TA MOYENNE
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2.5">
                <div className="pixel-slot px-3 py-2 leading-none">
                  <div className="font-pixel text-[9px] text-[#ffefb3]">VITESSE</div>
                  <div className="mt-1 text-4xl text-white">{Math.round(me.wpm ?? 0)} MPM</div>
                </div>
                <div className="pixel-slot px-3 py-2 leading-none">
                  <div className="font-pixel text-[9px] text-[#ffefb3]">PRÉCISION</div>
                  <div className="mt-1 text-4xl text-white">{Math.round(me.accuracy ?? 100)} %</div>
                </div>
                <div className="pixel-slot px-3 py-2 leading-none">
                  <div className="font-pixel text-[9px] text-[#ffefb3]">ERREURS</div>
                  <div className="mt-1 text-4xl text-white">{me.error_count}</div>
                </div>
              </div>
            </PixelPanel>
          )}
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
              {participants.map((p) => (
                <Fragment key={p.id}>
                  <span className="font-pixel pt-1 text-[11px]">{p.rank ?? "—"}</span>
                  <span>
                    {p.display_name}
                    {p.status === "abandoned" ? " (abandon)" : ""}
                  </span>
                  <span>{Math.round(p.wpm ?? 0)}</span>
                  <span>{Math.round(p.accuracy ?? 0)} %</span>
                  <span>{p.error_count}</span>
                </Fragment>
              ))}
            </div>
          </PixelPanel>

          {heatmapRows && (
            <PixelPanel className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-pixel text-sm text-[#2b2b2b]">HEATMAP DU CLAVIER</span>
                <span className="text-xl text-[#3a3a3a]">Rouge: à améliorer · Vert: maîtrisé</span>
              </div>
              <PixelKeyboard rows={heatmapRows} />
              {worstKeys.length > 0 && (
                <p className="mt-2.5 text-xl">
                  À travailler en priorité:{" "}
                  {worstKeys.map(([letter, pct]) => (
                    <b
                      key={letter}
                      className="mr-1.5 border-2 border-black bg-[#ff7b6b] px-1.5 font-normal"
                    >
                      {letter} ({pct}%)
                    </b>
                  ))}
                </p>
              )}
            </PixelPanel>
          )}
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
