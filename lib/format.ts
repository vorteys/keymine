import type { SiteLang } from "./i18n-dictionary";

// I18N-03 : dates et nombres formatés selon la langue choisie.
const LOCALES: Record<SiteLang, string> = { fr: "fr-CA", en: "en-CA" };

export function localeOf(lang: SiteLang): string {
  return LOCALES[lang];
}

export function formatNumber(lang: SiteLang, value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat(localeOf(lang), {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatPercent(lang: SiteLang, value: number, fractionDigits = 0): string {
  return `${formatNumber(lang, value, fractionDigits)}${lang === "fr" ? " %" : "%"}`;
}

export function formatDate(lang: SiteLang, date: Date | string, withTime = false): string {
  return new Intl.DateTimeFormat(localeOf(lang), {
    dateStyle: "long",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(new Date(date));
}

/** Durée d'une course : 1:07,4 en français, 1:07.4 en anglais. */
export function formatRaceTime(lang: SiteLang, ms: number): string {
  const total = Math.max(0, ms) / 1000;
  const minutes = Math.floor(total / 60);
  const seconds = total - minutes * 60;
  const secondsText = new Intl.NumberFormat(localeOf(lang), {
    minimumIntegerDigits: 2,
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(seconds);
  return `${minutes}:${secondsText}`;
}

/** Durée maximale d'une course : « 15 secondes », « 5 minutes », « 1 heure » (unité la plus grande qui tombe juste). */
export function formatDuration(lang: SiteLang, seconds: number): string {
  const [unit, value] =
    seconds % 3600 === 0 ? (["hour", seconds / 3600] as const) : seconds % 60 === 0 ? (["minute", seconds / 60] as const) : (["second", seconds] as const);
  return new Intl.NumberFormat(localeOf(lang), { style: "unit", unit, unitDisplay: "long" }).format(value);
}
