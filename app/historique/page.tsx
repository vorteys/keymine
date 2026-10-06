import Link from "next/link";
import { Fragment } from "react";
import { PixelShell } from "@/components/PixelShell";
import { PixelButton, PixelPanel } from "@/components/ui";
import { peekIdentity } from "@/lib/auth/identity";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { loadHistory, parsePage } from "@/lib/history";
import { getRequestLang } from "@/lib/i18n-server";
import { translate, type DictKey } from "@/lib/i18n-dictionary";

export const dynamic = "force-dynamic";

const STATUS_KEY: Record<string, DictKey> = {
  finished: "res.status_finished",
  timeout: "res.status_timeout",
  abandoned: "res.status_abandoned",
};

export default async function HistoriquePage({ searchParams }: PageProps<"/historique">) {
  const lang = await getRequestLang();
  const t = (key: DictKey, p?: Record<string, string | number>) => translate(lang, key, p);
  const identity = await peekIdentity();

  if (!identity || identity.kind !== "user") {
    return (
      <PixelShell active="stats">
        <h1 className="font-pixel mb-6 text-xl text-white [text-shadow:4px_4px_0_#000]">{t("hist.title")}</h1>
        <PixelPanel className="p-6">
          <p className="mb-4 text-2xl">{t("hist.login")}</p>
          <PixelButton href="/connexion" variant="green" className="h-12 px-6 text-xs">
            {t("home.account")}
          </PixelButton>
        </PixelPanel>
      </PixelShell>
    );
  }

  const query = await searchParams;
  const history = await loadHistory(identity.userId, parsePage(query.page));

  return (
    <PixelShell active="stats">
      <h1 className="font-pixel mb-6 text-xl text-white [text-shadow:4px_4px_0_#000]">{t("hist.title")}</h1>
      <PixelPanel className="p-5">
        {history.rows.length === 0 ? (
          <p className="text-2xl">{t("hist.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid min-w-[34rem] grid-cols-[minmax(0,1.6fr)_90px_80px_100px_120px_100px] items-baseline gap-x-3 gap-y-2 text-xl leading-tight">
              {(
                ["hist.col_date", "hist.col_rank", "hist.col_wpm", "hist.col_accuracy", "hist.col_status"] as const
              ).map((key) => (
                <span key={key} className="font-pixel text-[8px] text-[#3a3a3a]">
                  {t(key)}
                </span>
              ))}
              <span />
              {history.rows.map((r) => (
                <Fragment key={r.raceId}>
                  <span>{formatDate(lang, r.playedAt, true)}</span>
                  <span>{r.rank ? t("hist.of", { rank: r.rank, count: r.participantCount }) : "—"}</span>
                  <span>{formatNumber(lang, r.wpm)}</span>
                  <span>{formatPercent(lang, r.accuracy)}</span>
                  <span>{t(STATUS_KEY[r.status] ?? "res.status_other")}</span>
                  <Link
                    href={`/resultats/${r.lobbyCode}?course=${r.raceId}`}
                    className="font-pixel text-[9px] text-[#1c4ea3] underline"
                  >
                    {t("hist.details")}
                  </Link>
                </Fragment>
              ))}
            </div>
          </div>
        )}

        {history.pages > 1 && (
          <nav aria-label={t("hist.title")} className="mt-5 flex flex-wrap items-center justify-between gap-3">
            {history.page > 1 ? (
              <PixelButton href={`/historique?page=${history.page - 1}`} variant="slate" className="h-11 px-4 text-[10px]">
                {t("hist.prev")}
              </PixelButton>
            ) : (
              <span />
            )}
            <span className="text-xl">{t("hist.page", { page: history.page, pages: history.pages })}</span>
            {history.page < history.pages ? (
              <PixelButton href={`/historique?page=${history.page + 1}`} variant="slate" className="h-11 px-4 text-[10px]">
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
