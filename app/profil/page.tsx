import { PixelShell } from "@/components/PixelShell";
import Link from "next/link";
import { PixelAvatar, PixelButton, PixelKeyboard, PixelSlot } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/format";
import { loadHistory } from "@/lib/history";
import { getRequestLang } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n-dictionary";
import { GuestProfile } from "@/components/GuestProfile";
import { LogoutButton } from "@/components/LogoutButton";
import { db } from "@/lib/db";
import { peekIdentity } from "@/lib/auth/identity";
import { heatmapRowsFromCounts } from "@/lib/heatmap";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const identity = await peekIdentity();

  if (!identity || identity.kind !== "user") {
    return (
      <PixelShell active="stats">
        <h1 className="font-pixel mb-6 text-xl text-white [text-shadow:4px_4px_0_#000]">
          TES STATISTIQUES
        </h1>
        <GuestProfile />
      </PixelShell>
    );
  }

  const user = await db
    .selectFrom("users")
    .selectAll()
    .where("id", "=", identity.userId)
    .executeTakeFirstOrThrow();

  const avgAcc = await db
    .selectFrom("race_participants")
    .select((eb) => eb.fn.avg<number>("accuracy").as("avg_accuracy"))
    .where("user_id", "=", identity.userId)
    .where("status", "=", "finished")
    .executeTakeFirst();

  const avgWpm = await db
    .selectFrom("race_participants")
    .select((eb) => eb.fn.avg<number>("wpm").as("avg_wpm"))
    .where("user_id", "=", identity.userId)
    .where("status", "=", "finished")
    .executeTakeFirst();

  const keyStats = await db
    .selectFrom("key_stats")
    .select(["char", "correct_count", "error_count"])
    .where("user_id", "=", identity.userId)
    .execute();
  const correct: Record<string, number> = {};
  const errors: Record<string, number> = {};
  for (const k of keyStats) {
    correct[k.char] = k.correct_count;
    errors[k.char] = k.error_count;
  }
  const heatmapRows = heatmapRowsFromCounts(correct, errors);

  const progression = await db
    .selectFrom("race_participants")
    .select(["wpm", "created_at"])
    .where("user_id", "=", identity.userId)
    .where("status", "=", "finished")
    .orderBy("created_at", "desc")
    .limit(20)
    .execute();
  const points = [...progression].reverse().filter((p) => p.wpm != null);
  const maxWpm = Math.max(10, ...points.map((p) => p.wpm ?? 0));
  const progressionPoints = points
    .map((p, i) => {
      const x = points.length > 1 ? (i / (points.length - 1)) * 720 : 0;
      const y = 200 - ((p.wpm ?? 0) / maxWpm) * 170;
      return `${Math.round(x)},${Math.round(y)}`;
    })
    .join(" ");

  const lang = await getRequestLang();
  const history = (await loadHistory(identity.userId, 1)).rows.slice(0, 6);

  const rankLabel = (r: number | null) =>
    r === 1 ? "1er" : r === 2 ? "2e" : r === 3 ? "3e" : r ? `${r}e` : "—";

  return (
    <PixelShell active="stats">
      <div className="flex flex-col gap-7 lg:flex-row lg:items-start">
        <div className="flex w-full flex-col gap-6 lg:w-80 lg:flex-none">
          <div className="pixel-panel flex flex-col items-center gap-3 p-6">
            <PixelAvatar
              label={user.display_name[0]?.toUpperCase() ?? "?"}
              color="#3d6fc4"
              className="h-32 w-32 border-[5px] text-5xl"
            />
            <div className="font-pixel text-lg">{user.display_name.toUpperCase()}</div>
            <p className="text-center text-xl leading-tight text-[#3a3a3a]">
              Compte créé le {new Date(user.created_at).toLocaleDateString("fr-CA")}
            </p>
          </div>

          <div className="pixel-panel flex flex-col gap-2.5 p-5">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-sm">SÉRIE</span>
              <span className="text-2xl text-[#3a3a3a]">{user.current_streak_days} jour(s)</span>
            </div>
            <div className="mt-1.5 flex gap-2">
              <PixelSlot className="flex h-16 flex-1 flex-col items-center justify-center gap-1 leading-none">
                <span className="font-pixel text-xs text-[#f0b429]">
                  {Math.round(user.best_wpm)}
                </span>
                <span className="text-lg text-white">MPM</span>
              </PixelSlot>
              <PixelSlot className="flex h-16 flex-1 flex-col items-center justify-center gap-1 leading-none">
                <span className="font-pixel text-xs text-[#f0b429]">{user.total_races}</span>
                <span className="text-lg text-white">COURSES</span>
              </PixelSlot>
              <PixelSlot className="flex h-16 flex-1 flex-col items-center justify-center gap-1 leading-none">
                <span className="font-pixel text-xs text-[#f0b429]">
                  {user.current_streak_days}j
                </span>
                <span className="text-lg text-white">SÉRIE</span>
              </PixelSlot>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-grow flex-col gap-6">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {[
              ["MEILLEUR", `${Math.round(user.best_wpm)} MPM`],
              ["MOYENNE", `${avgWpm?.avg_wpm ? Math.round(avgWpm.avg_wpm) : 0} MPM`],
              ["PRÉCISION", `${avgAcc?.avg_accuracy ? avgAcc.avg_accuracy.toFixed(1) : "100"} %`],
              ["COURSES", String(user.total_races)],
              ["SÉRIE", `${user.current_streak_days} jours`],
            ].map(([label, value]) => (
              <PixelSlot key={label} className="p-2.5 leading-none">
                <b className="font-pixel mb-1 block text-[9px] text-[#ffefb3]">{label}</b>
                <span className="text-3xl text-white">{value}</span>
              </PixelSlot>
            ))}
          </div>

          <div className="pixel-panel p-5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="font-pixel text-sm">PROGRESSION · {points.length} DERNIÈRES COURSES</span>
            </div>
            <div className="border-4 border-black bg-[#1b1b1b] p-2">
              {points.length > 1 ? (
                <svg
                  viewBox="0 0 720 220"
                  width="100%"
                  role="img"
                  aria-label="Courbe de progression de la vitesse en mots par minute sur les dernières courses"
                >
                  <g stroke="#3a3a3a" strokeWidth="1">
                    <line x1="0" y1="50" x2="720" y2="50" />
                    <line x1="0" y1="100" x2="720" y2="100" />
                    <line x1="0" y1="150" x2="720" y2="150" />
                    <line x1="0" y1="200" x2="720" y2="200" />
                  </g>
                  <polyline
                    fill="none"
                    stroke="#7fd36a"
                    strokeWidth="4"
                    points={progressionPoints}
                  />
                  <text x="8" y="30" fill="#ffefb3" fontSize="14" fontFamily="monospace">
                    RECORD {Math.round(user.best_wpm)}
                  </text>
                </svg>
              ) : (
                <p className="p-6 text-center text-2xl text-[#8b8b8b]">
                  Termine quelques courses pour voir ta progression ici.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="pixel-panel flex-1 p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-pixel text-sm">TOUCHES À TRAVAILLER</span>
                <span className="text-xl text-[#3a3a3a]">Rouge: à améliorer · Vert: maîtrisé</span>
              </div>
              <PixelKeyboard rows={heatmapRows} />
            </div>
          </div>

          <div className="pixel-panel p-5">
            <div className="font-pixel mb-2.5 text-sm">HISTORIQUE</div>
            {history.length === 0 && (
              <p className="text-xl text-[#3a3a3a]">Aucune course terminée pour l’instant.</p>
            )}
            {history.map((h) => (
              <Link
                key={h.raceId}
                href={`/resultats/${h.lobbyCode}?course=${h.raceId}`}
                className="flex items-center justify-between border-b-2 border-dotted border-[#8b8b8b] py-1 text-xl hover:bg-[#00000010]"
              >
                <span>{formatDate(lang, h.playedAt)}</span>
                <b className="font-normal">{formatNumber(lang, h.wpm)} MPM</b>
                <span className="font-pixel text-[10px]">{rankLabel(h.rank)}</span>
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <PixelButton href="/historique" variant="gold" className="h-11 px-5 text-[10px]">
              {translate(lang, "res.history")}
            </PixelButton>
            <LogoutButton />
          </div>
        </div>
      </div>
    </PixelShell>
  );
}
