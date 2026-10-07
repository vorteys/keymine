import { describe, expect, it } from "vitest";
import { DICTIONARY, pickLang, translate } from "@/lib/i18n-dictionary";

describe("dictionnaire d'interface (I18N-01)", () => {
  it("français et anglais ont exactement les mêmes clés", () => {
    expect(Object.keys(DICTIONARY.en).sort()).toEqual(Object.keys(DICTIONARY.fr).sort());
  });

  it("aucune traduction n'est vide et les paramètres {x} correspondent", () => {
    for (const key of Object.keys(DICTIONARY.fr) as (keyof typeof DICTIONARY.fr)[]) {
      const fr = DICTIONARY.fr[key];
      const en = DICTIONARY.en[key];
      expect(fr.trim(), key).not.toBe("");
      expect(en.trim(), key).not.toBe("");
      const params = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();
      expect(params(fr), key).toEqual(params(en));
    }
  });

  it("les libellés en MAJUSCULES (police pixel) n'ont pas d'accents ; les textes courants les gardent", () => {
    for (const key of Object.keys(DICTIONARY.fr) as (keyof typeof DICTIONARY.fr)[]) {
      const sansParametres = DICTIONARY.fr[key].replace(/\{\w+\}/g, "");
      const toutEnMajuscules = !/[a-zà-ÿœ]/.test(sansParametres);
      if (toutEnMajuscules) expect(sansParametres, key).not.toMatch(/[À-ÿŒœ]/);
    }
    // Les textes en police VT323 (mixtes) gardent leurs accents.
    expect(DICTIONARY.fr["profile.history_empty"]).toContain("terminée");
  });

  it("remplace les paramètres", () => {
    expect(translate("fr", "race.room", { code: "ABC234" })).toBe("SALLE ABC234");
    expect(translate("en", "race.room", { code: "ABC234" })).toBe("ROOM ABC234");
  });

  it("choisit la langue : cookie, sinon navigateur (I18N-02)", () => {
    expect(pickLang("en", "fr-CA,fr;q=0.9")).toBe("en");
    expect(pickLang(undefined, "fr-CA,fr;q=0.9")).toBe("fr");
    expect(pickLang(undefined, "de-DE")).toBe("en");
    expect(pickLang("xx", null)).toBe("en");
  });
});
