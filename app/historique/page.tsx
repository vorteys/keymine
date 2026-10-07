import Link from "next/link";
import { HistoryCard } from "@/components/history/HistoryCard";
import { HistoryControls } from "@/components/history/HistoryControls";
import { PixelShell } from "@/components/PixelShell";
import { PixelButton, PixelChip, PixelPanel } from "@/components/ui";
import { peekIdentity } from "@/lib/auth/identity";
import {
  HISTORY_SECTIONS,
  loadHistory,
  parseHistoryQuery,
  type HistoryPage,
  type HistorySection,
} from "@/lib/history";
import { getRequestLang, pageMetadata } from "@/lib/i18n-server";
import { translate, type DictKey } from "@/lib/i18n-dictionary";

export const dynamic = "force-dynamic";
export const generateMetadata = pageMetadata("title.history");

const SECTION_KEY: Record<HistorySection, DictKey> = {
  all: "hist.section_all",
  played: "hist.section_played",
  abandoned: "hist.section_abandoned",
  spectated: "hist.section_spectated",
};

const EMPTY_KEY: Record<HistorySection, DictKey> = {
  all: "hist.empty",
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
            {history.rows.map((r) => (
              <HistoryCard key={r.raceId} row={r} lang={lang} />
            ))}
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
