import { describe, expect, it } from "vitest";
import { participantName } from "@/lib/bot-name";
import { translate } from "@/lib/i18n-dictionary";

// I18N-01 / BOT-04 : le nom d'un bot suit la langue de l'interface et reste identifié comme bot.
describe("nom affiché d'un participant", () => {
  const fr = (key: Parameters<typeof translate>[1]) => translate("fr", key);
  const en = (key: Parameters<typeof translate>[1]) => translate("en", key);

  it("recompose le nom d'un bot depuis son niveau, dans la langue de l'interface", () => {
    const bot = { name: "Bot Intermédiaire", isBot: true, botLevel: "intermediaire" };
    expect(participantName(fr, bot)).toBe("Bot Intermédiaire");
    expect(participantName(en, bot)).toBe("Bot Intermediate");
  });

  it("garde tel quel le nom d'un humain, même s'il ressemble à un bot", () => {
    expect(participantName(en, { name: "Bot Expert", isBot: false, botLevel: null })).toBe("Bot Expert");
    expect(participantName(en, { name: "Camille" })).toBe("Camille");
  });

  it("retombe sur le nom enregistré si le niveau est inconnu", () => {
    expect(participantName(en, { name: "Bot Ancien", isBot: true, botLevel: "legendaire" })).toBe("Bot Ancien");
  });
});
