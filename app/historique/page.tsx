import Link from "next/link";
import { PixelShell } from "@/components/PixelShell";
import { PixelButton, PixelPanel } from "@/components/ui";
import { peekIdentity } from "@/lib/auth/identity";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { loadHistory, parsePage } from "@/lib/history";
import { getRequestLang, pageMetadata } from "@/lib/i18n-server";
import { translate, type DictKey } from "@/lib/i18n-dictionary";

export const dynamic = "force-dynamic";
export const generateMetadata = pageMetadata("title.history");

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
            <table className="w-full min-w-[34rem] border-collapse text-left text-xl leading-tight">
              <caption className="sr-only">{t("hist.title")}</caption>
              <thead>
                <tr>
                  {(
                    ["hist.col_date", "hist.col_rank", "hist.col_wpm", "hist.col_accuracy", "hist.col_status"] as const
                  ).map((key) => (
                    <th key={key} scope="col" className="font-pixel pb-2 pr-3 text-[8px] font-normal text-[#3a3a3a]">
                      {t(key)}
                    </th>
                  ))}
                  <th scope="col" className="sr-only">
                    {t("hist.details")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.rows.map((r) => (
                  <tr key={r.raceId} className="border-t-2 border-dotted border-[#8b8b8b]">
                    <th scope="row" className="py-2 pr-3 font-normal">
                      {formatDate(lang, r.playedAt, true)}
                    </th>
                    <td className="pr-3">{r.rank ? t("hist.of", { rank: r.rank, count: r.participantCount }) : "—"}</td>
                    <td className="pr-3">{formatNumber(lang, r.wpm)}</td>
                    <td className="pr-3">{formatPercent(lang, r.accuracy)}</td>
                    <td className="pr-3">{t(STATUS_KEY[r.status] ?? "res.status_other")}</td>
                    <td>
                      <Link
                        href={`/resultats/${r.lobbyCode}?course=${r.raceId}`}
                        className="font-pixel text-[9px] text-[#1c4ea3] underline"
                      >
                        {t("hist.details")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
