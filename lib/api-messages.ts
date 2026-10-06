import "server-only";
import { getRequestLang } from "@/lib/i18n-server";
import type { z } from "zod";
import { DICTIONARY, translate, type DictKey } from "@/lib/i18n-dictionary";

// I18N-01 : les messages d'erreur renvoyés par l'API sont traduits côté serveur
// selon la langue de la requête (cookie km_lang, sinon Accept-Language), pour que
// le client n'ait qu'à les afficher.
export type ErrorKey = DictKey extends infer K ? (K extends `err.${infer E}` ? E : never) : never;

export async function msg(key: ErrorKey, params?: Record<string, string | number>): Promise<string> {
  return translate(await getRequestLang(), `err.${key}` as DictKey, params);
}

/** Premier message d'une erreur Zod : si c'est un code connu (ex. « pseudo_min »), il est traduit ; sinon on retombe sur `fallback`. */
export async function zodMessage(error: z.ZodError, fallback: ErrorKey): Promise<string> {
  const code = error.issues[0]?.message ?? "";
  return `err.${code}` in DICTIONARY.fr ? msg(code as ErrorKey) : msg(fallback);
}
