"use client";

import { PixelAvatar } from "@/components/ui";
import { useLanguage } from "@/lib/i18n";
import type { RaceParticipantView } from "./types";

// COURSE-05 : piste de progression. Chaque participant (humain ou bot) a son
// avatar, son nom, sa position et son MPM ; le mouvement est lissé par une
// transition CSS entre deux mises à jour (4 par seconde) ; le joueur local est
// mis en évidence ; les bots sont clairement étiquetés (BOT-04).

const AVATAR_COLORS = ["#3d6fc4", "#b03a7a", "#a85512", "#17706f", "#7a45b0", "#3f7d24", "#b63a32"];

export function Track({
  participants,
  meId,
  showBotLabel,
}: {
  participants: RaceParticipantView[];
  meId: string | null;
  showBotLabel: string;
}) {
  const { t } = useLanguage();
  const ordered = [...participants].sort((a, b) => a.rank - b.rank);
  return (
    <ol className="flex flex-col gap-2" aria-label={t("race.track_aria")}>
      {ordered.map((p, index) => {
        const isMe = p.id === meId;
        const left = `${Math.min(100, Math.max(0, p.fraction * 100))}%`;
        return (
          <li
            key={p.id}
            data-me={isMe}
            data-status={p.status}
            className={`relative border-4 px-2 py-1.5 ${isMe ? "border-[#ffd84a] bg-[#3a3320]" : "border-black bg-[#2b2b2b]"}`}
          >
            <div className="flex items-center justify-between gap-2 leading-none">
              <span className="flex min-w-0 items-center gap-2 text-xl text-white">
                <span className="font-pixel w-6 text-[11px] text-[#ffe08a]">{p.rank}</span>
                <span className="truncate">
                  {p.name}
                  {isMe && <b className="font-pixel ml-2 text-[9px] text-[#ffd84a]">{t("race.you")}</b>}
                  {p.isBot && (
                    <b className="font-pixel ml-2 border-2 border-[#8b8b8b] px-1 text-[8px] text-[#cfcfcf]">
                      {showBotLabel}
                    </b>
                  )}
                </span>
              </span>
              <span className="text-xl whitespace-nowrap text-white">
                {Math.round(p.wpm)} {t("race.wpm")}
                {p.status === "abandoned" && <span className="ml-2 text-[#ff8f80]">⨯</span>}
                {p.status === "finished" && <span className="ml-2 text-[#7fd36a]">✓</span>}
              </span>
            </div>
            <div className="relative mt-2 h-8 border-2 border-black bg-[#1b1b1b]">
              <div
                className="absolute inset-y-0 left-0 bg-[repeating-linear-gradient(90deg,#4aa233_0_8px,#3a8226_8px_10px)] opacity-60 transition-[width] duration-300 ease-linear"
                style={{ width: left }}
              />
              <div
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-300 ease-linear"
                style={{ left: `clamp(14px, ${left}, calc(100% - 14px))` }}
              >
                <PixelAvatar
                  label={p.name[0]?.toUpperCase() ?? "?"}
                  color={p.isBot ? "#555555" : AVATAR_COLORS[index % AVATAR_COLORS.length]!}
                  src={p.isBot ? null : p.avatarUrl}
                  className={`h-6 w-6 text-[10px] ${isMe ? "ring-2 ring-[#ffd84a]" : ""}`}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
