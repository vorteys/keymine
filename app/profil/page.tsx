import { PixelShell } from "@/components/PixelShell";
import Link from "next/link";
import { PixelAvatar, PixelButton, PixelKeyboard, PixelSlot } from "@/components/ui";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { loadHistory } from "@/lib/history";
import { loadProfileStats } from "@/lib/stats";
import { ProfileEditor } from "@/components/ProfileEditor";
import { getRequestLang, pageMetadata } from "@/lib/i18n-server";
import { translate, type DictKey } from "@/lib/i18n-dictionary";
import { GuestProfile } from "@/components/GuestProfile";
import { LogoutButton } from "@/components/LogoutButton";
import { db } from "@/lib/db";
import { peekIdentity } from "@/lib/auth/identity";
import { heatmapRowsFromCounts } from "@/lib/heatmap";

export const dynamic = "force-dynamic";
export const generateMetadata = pageMetadata("title.profile");

export default async function ProfilPage() {
  const [identity, lang] = await Promise.all([peekIdentity(), getRequestLang()]);
  const t = (key: DictKey, params?: Record<string, string | number>) => translate(lang, key, params);

  if (!identity || identity.kind !== "user") {
    return (
      <PixelShell active="stats">
        <h1 className="font-pixel mb-6 text-xl text-white [text-shadow:4px_4px_0_#000]">
          {t("guest.title")}
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

  const stats = await loadProfileStats(identity.userId);

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

  const history = (await loadHistory(identity.userId, 1)).rows.slice(0, 6);

  const rankLabel = (r: number | null) => (r ? `#${r}` : "—");

  return (
    <PixelShell active="stats">
      <div className="flex flex-col gap-7 lg:flex-row lg:items-start">
        <div className="flex w-full flex-col gap-6 lg:w-80 lg:flex-none">
          <div className="pixel-panel flex flex-col items-center gap-3 p-6">
            <PixelAvatar
              label={user.display_name[0]?.toUpperCase() ?? "?"}
              color="#3d6fc4"
              src={user.avatar_url}
              className="h-32 w-32 border-[5px] text-5xl"
            />
            <div className="font-pixel text-lg">{user.display_name.toUpperCase()}</div>
            <p className="text-center text-xl leading-tight text-[#3a3a3a]">
              {t("profile.created", { date: formatDate(lang, user.created_at) })}
            </p>
            <ProfileEditor displayName={user.display_name} hasPhoto={user.avatar_source === "upload" && user.avatar_url !== null} />
          </div>

          <div className="pixel-panel flex flex-col gap-2.5 p-5">
            <div className="flex items-center justify-between">
              <span className="font-pixel text-sm">{t("profile.streak")}</span>
              <span className="text-2xl text-[#3a3a3a]">{t("profile.streak_days", { count: user.current_streak_days })}</span>
            </div>
            <div className="mt-1.5 flex gap-2">
              <PixelSlot className="flex h-16 flex-1 flex-col items-center justify-center gap-1 leading-none">
                <span className="font-pixel text-xs text-[#fff6d6]">
                  {Math.round(user.best_wpm)}
                </span>
                <span className="text-lg text-white">{t("race.wpm")}</span>
              </PixelSlot>
              <PixelSlot className="flex h-16 flex-1 flex-col items-center justify-center gap-1 leading-none">
                <span className="font-pixel text-xs text-[#fff6d6]">{user.total_races}</span>
                <span className="text-lg text-white">{t("profile.races")}</span>
              </PixelSlot>
              <PixelSlot className="flex h-16 flex-1 flex-col items-center justify-center gap-1 leading-none">
                <span className="font-pixel text-xs text-[#fff6d6]">
                  {user.current_streak_days}j
                </span>
                <span className="text-lg text-white">{t("profile.streak")}</span>
              </PixelSlot>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-grow flex-col gap-6">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {[
              [t("profile.best"), `${formatNumber(lang, stats.bestWpm)} ${t("race.wpm")}`],
              [t("profile.average"), `${stats.avgWpm != null ? formatNumber(lang, stats.avgWpm) : "—"} ${t("race.wpm")}`],
              [t("profile.accuracy"), stats.avgAccuracy != null ? formatPercent(lang, stats.avgAccuracy, 1) : "—"],
              [t("profile.races"), formatNumber(lang, stats.races)],
              [t("profile.wins"), formatNumber(lang, stats.wins)],
              [t("profile.streak"), t("profile.streak_days", { count: user.current_streak_days })],
            ].map(([label, value]) => (
              <PixelSlot key={label} className="p-2.5 leading-none">
                <b className="font-pixel mb-1 block text-[9px] text-[#ffefb3]">{label}</b>
                <span className="text-3xl text-white">{value}</span>
              </PixelSlot>
            ))}
          </div>

          <div className="pixel-panel p-5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="font-pixel text-sm">{t("profile.progress", { count: points.length })}</span>
            </div>
            <div className="border-4 border-black bg-[#1b1b1b] p-2">
              {points.length > 1 ? (
                <svg
                  viewBox="0 0 720 220"
                  width="100%"
                  role="img"
                  aria-label={t("profile.progress_aria")}
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
                    {t("profile.record", { value: Math.round(user.best_wpm) })}
                  </text>
                </svg>
              ) : (
                <p className="p-6 text-center text-2xl text-[#8b8b8b]">
                  {t("profile.progress_empty")}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="pixel-panel flex-1 p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-pixel text-sm">{t("profile.worst_keys")}</span>
                <span className="text-xl text-[#3a3a3a]">{t("res.heatmap_legend")}</span>
              </div>
              <PixelKeyboard rows={heatmapRows} />
            </div>
          </div>

          <div className="pixel-panel p-5">
            <div className="font-pixel mb-2.5 text-sm">{t("profile.history")}</div>
            {history.length === 0 && (
              <p className="text-xl text-[#3a3a3a]">{t("profile.history_empty")}</p>
            )}
            {history.map((h) => (
              <Link
                key={h.raceId}
                href={`/resultats/${h.lobbyCode}?course=${h.raceId}`}
                className="flex items-center justify-between border-b-2 border-dotted border-[#8b8b8b] py-1 text-xl hover:bg-[#00000010]"
              >
                <span>{formatDate(lang, h.playedAt)}</span>
                <b className="font-normal">{formatNumber(lang, h.wpm)} {t("race.wpm")}</b>
                <span className="font-pixel text-[10px]">{rankLabel(h.rank)}</span>
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <PixelButton href="/historique" variant="gold" className="h-11 px-5 text-[10px]">
              {t("res.history")}
            </PixelButton>
            <LogoutButton />
          </div>
        </div>
      </div>
    </PixelShell>
  );
}
