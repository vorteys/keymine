import "server-only";
import { cookies, headers } from "next/headers";
import { pickLang, type SiteLang } from "./i18n-dictionary";

/** Langue de l'interface pour cette requête (cookie, sinon Accept-Language). */
export async function getRequestLang(): Promise<SiteLang> {
  const [store, requestHeaders] = await Promise.all([cookies(), headers()]);
  return pickLang(store.get("km_lang")?.value, requestHeaders.get("accept-language"));
}
