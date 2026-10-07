import Link from "next/link";
import type { ReactNode } from "react";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import type { HistoryRow } from "@/lib/history";
import { translate, type DictKey } from "@/lib/i18n-dictionary";
import type { Language } from "@/db/types";
import { DeleteHistoryButton } from "./DeleteHistoryButton";
import { HistoryIcon, type IconName } from "./icons";
import { ReplayButton } from "./ReplayButton";

// Une course de l'historique : la même carte (mêmes infos, mêmes actions) sur la page Historique
// et dans la liste des courses récentes de la page Stats.

const STATUS_KEY: Record<string, DictKey> = {
  finished: "res.status_finished",
  timeout: "res.status_timeout",
  abandoned: "res.status_abandoned",
};

/** Un champ étiqueté : icône + libellé en petit, valeur en grand (on sait toujours ce que l'on lit). */
function Field({ icon, label, children }: { icon: IconName; label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="font-pixel flex items-center gap-1.5 text-[8px] text-[#3a3a3a]">
        <HistoryIcon name={icon} />
        {label}
      </dt>
      <dd className="mt-1 text-2xl leading-tight break-words">{children}</dd>
    </div>
  );
}

export function HistoryCard({ row: r, lang }: { row: HistoryRow; lang: Language }) {
  const t = (key: DictKey, p?: Record<string, string | number>) => translate(lang, key, p);
  const spectated = r.role === "spectator";
  const abandoned = !spectated && r.status === "abandoned";
  const kindKey: DictKey = spectated
    ? "hist.kind_spectated"
    : abandoned
      ? "hist.kind_abandoned"
      : "hist.kind_played";

  return (
    <li className="history-card border-4 border-black bg-[#f4ecd2] p-3">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
        <Field icon="date" label={t("hist.col_date")}>
          {formatDate(lang, r.playedAt, true)}
        </Field>
        <Field icon="kind" label={t("hist.col_kind")}>
          {t(kindKey)}
        </Field>
        {spectated ? (
          <>
            <Field icon="players" label={t("hist.col_players")}>
              {r.participantCount}
            </Field>
            <Field icon="winner" label={t("hist.col_winner")}>
              {r.winnerName ?? "—"}
              {r.winnerWpm != null && ` · ${formatNumber(lang, r.winnerWpm)} ${t("race.wpm")}`}
            </Field>
          </>
        ) : (
          <>
            {!abandoned && (
              <Field icon="rank" label={t("hist.col_rank")}>
                {r.rank ? t("hist.of", { rank: r.rank, count: r.participantCount }) : "—"}
              </Field>
            )}
            <Field icon="wpm" label={t("hist.col_wpm")}>
              {formatNumber(lang, r.wpm)} {t("race.wpm")}
            </Field>
            <Field icon="accuracy" label={t("hist.col_accuracy")}>
              {formatPercent(lang, r.accuracy)}
            </Field>
            <Field icon="status" label={t("hist.col_status")}>
              {t(STATUS_KEY[r.status] ?? "res.status_other")}
            </Field>
          </>
        )}
      </dl>
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t-2 border-dotted border-[#8b8b8b] pt-3">
        <Link
          href={`/resultats/${r.lobbyCode}?course=${r.raceId}`}
          data-variant="slate"
          className="pixel-btn h-10 gap-2 px-3 text-[9px]"
        >
          <HistoryIcon name="details" />
          {t("hist.details")}
        </Link>
        {!spectated && <ReplayButton raceId={r.raceId} />}
        <DeleteHistoryButton raceId={r.raceId} />
      </div>
    </li>
  );
}
