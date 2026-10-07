import type { DictKey } from "./i18n-dictionary";
import { isBotLevel } from "./race/bots";

type Translate = (key: DictKey) => string;

/**
 * Nom affiché d'un participant. Le nom d'un bot est enregistré en base dans la langue de l'hôte
 * (« Bot Intermédiaire ») ; à l'écran on le recompose depuis son niveau pour qu'il suive la
 * langue de l'interface (I18N-01), tout en restant clairement identifié comme un bot (BOT-04).
 */
export function participantName(
  t: Translate,
  p: { name: string; isBot?: boolean; botLevel?: string | null },
): string {
  if (p.isBot && p.botLevel && isBotLevel(p.botLevel)) {
    return `${t("bot.prefix")} ${t(`bot.${p.botLevel}` as DictKey)}`;
  }
  return p.name;
}
