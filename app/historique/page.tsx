import Link from "next/link";
import { DeleteHistoryButton } from "@/components/history/DeleteHistoryButton";
import { HistoryControls } from "@/components/history/HistoryControls";
import { HistoryIcon } from "@/components/history/icons";
import { ReplayButton } from "@/components/history/ReplayButton";
import { PixelShell } from "@/components/PixelShell";
import { PixelButton, PixelChip, PixelPanel } from "@/components/ui";
import { peekIdentity } from "@/lib/auth/identity";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import {
  HISTORY_SECTIONS,
  loadHistory,
  parseHistoryQuery,
  type HistoryPage,
  type HistoryRow,
  type HistorySection,
} from "@/lib/history";
import { getRequestLang, pageMetadata } from "@/lib/i18n-server";
import { translate, type DictKey } from "@/lib/i18n-dictionary";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const generateMetadata = pageMetadata("title.history");

const STATUS_KEY: Record<string, DictKey> = {
  finished: "res.status_finished",
  timeout: "res.status_timeout",
  abandoned: "res.status_abandoned",
};

const SECTION_KEY: Record<HistorySection, DictKey> = {
  played: "hist.section_played",
  abandoned: "hist.section_abandoned",
  spectated: "hist.section_spectated",
};

const EMPTY_KEY: Record<HistorySection, DictKey> = {
  played: "hist.empty",
  abandoned: "hist.empty_abandoned",
  spectated: "hist.empty_spectated",
};

function href(
  history: Pick<HistoryPage, "section" | "sort" | "dir">,
  page = 1,
  section = history.section,
): string {
  const params = new URLSearchParams({ section, sort: history.sort, dir: history.dir });
  if (page > 1) params.set("page", String(page));
  return `/historique?${params.toString()}`;
}

/** Un champ étiqueté : icône + libellé en petit, valeur en grand (on sait toujours ce que l'on lit). */
function Field({
  icon,
  label,
  children,
}: {
  icon: Parameters<typeof HistoryIcon>[0]["name"];
  label: string;
  children: ReactNode;
}) {
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

export default async function HistoriquePage({ searchParams }: PageProps<"/historique">) {
  const lang = await getRequestLang();
  const t = (key: DictKey, p?: Record<string, string | number>) => translate(lang, key, p);
  const identity = await peekIdentity();

  if (!identity || identity.kind !== "user") {
    return (
      <PixelShell active="stats">
        <h1 className="font-pixel mb-6 text-xl text-white [text-shadow:4px_4px_0_#000]">
          {t("hist.title")}
        </h1>
        <PixelPanel className="p-6">
          <p className="mb-4 text-2xl">{t("hist.login")}</p>
          <PixelButton href="/connexion" variant="green" className="h-12 px-6 text-xs">
            {t("home.account")}
          </PixelButton>
        </PixelPanel>
      </PixelShell>
    );
  }

  const history = await loadHistory(identity.userId, parseHistoryQuery(await searchParams));

  const card = (r: HistoryRow) => (
    <li key={r.raceId} className="border-4 border-black bg-[#f4ecd2] p-3">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
        <Field icon="date" label={t("hist.col_date")}>
          {formatDate(lang, r.playedAt, true)}
        </Field>
        {history.section === "spectated" ? (
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
            {history.section === "played" && (
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
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t-2 border-dotted border-[#8b8b8b] pt-2">
        <Link
          href={`/resultats/${r.lobbyCode}?course=${r.raceId}`}
          className="font-pixel inline-flex min-h-9 items-center text-[9px] text-[#1c4ea3] underline"
        >
          {t("hist.details")}
        </Link>
        <span className="flex flex-wrap items-center gap-4">
          {history.section !== "spectated" && <ReplayButton raceId={r.raceId} />}
          <DeleteHistoryButton raceId={r.raceId} />
        </span>
      </div>
    </li>
  );

  return (
    <PixelShell active="stats">
      <h1 className="font-pixel mb-6 text-xl text-white [text-shadow:4px_4px_0_#000]">
        {t("hist.title")}
      </h1>
      <PixelPanel className="p-5">
        <nav aria-label={t("hist.sections")} className="mb-4 flex flex-wrap gap-2">
          {HISTORY_SECTIONS.map((section) => (
            <Link
              key={section}
              href={href(history, 1, section)}
              aria-current={section === history.section ? "page" : undefined}
            >
              <PixelChip on={section === history.section}>
                {t(SECTION_KEY[section])} ({history.counts[section]})
              </PixelChip>
            </Link>
          ))}
        </nav>

        {history.total > 1 && (
          <div className="mb-4">
            <HistoryControls section={history.section} sort={history.sort} dir={history.dir} />
          </div>
        )}

        {history.rows.length === 0 ? (
          <p className="text-2xl">{t(EMPTY_KEY[history.section])}</p>
        ) : (
          <ul aria-label={t(SECTION_KEY[history.section])} className="flex flex-col gap-3">
            {history.rows.map(card)}
          </ul>
        )}

        {history.pages > 1 && (
          <nav
            aria-label={t("hist.pages")}
            className="mt-5 flex flex-wrap items-center justify-between gap-3"
          >
            {history.page > 1 ? (
              <PixelButton
                href={href(history, history.page - 1)}
                variant="slate"
                className="h-11 px-4 text-[10px]"
              >
                {t("hist.prev")}
              </PixelButton>
            ) : (
              <span />
            )}
            <span className="text-xl">
              {t("hist.page", { page: history.page, pages: history.pages })}
            </span>
            {history.page < history.pages ? (
              <PixelButton
                href={href(history, history.page + 1)}
                variant="slate"
                className="h-11 px-4 text-[10px]"
              >
                {t("hist.next")}
              </PixelButton>
            ) : (
              <span />
            )}
          </nav>
        )}
      </PixelPanel>
    </PixelShell>
  );
}
