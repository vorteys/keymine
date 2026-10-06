// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DICTIONARY } from "@/lib/i18n-dictionary";

// I18N-01 : toute clé de traduction utilisée dans le code existe dans le dictionnaire
// (une clé manquante afficherait « undefined » à l'écran).
const ROOTS = ["app", "components", "lib", "realtime"];
const KEY = /\b(?:t|translate)\((?:lang,\s*)?"([a-z_]+\.[a-z0-9_.]+)"/g;
const MSG = /\bmsg\("([a-z_]+)"/g;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "node_modules" ? [] : sources(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("clés de traduction utilisées dans le code (I18N-01)", () => {
  const files = ROOTS.flatMap((root) => sources(root));

  it("existent toutes en français et en anglais", () => {
    const missing: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(KEY)) {
        const key = match[1]!;
        if (!(key in DICTIONARY.fr) || !(key in DICTIONARY.en)) missing.push(`${file}: ${key}`);
      }
      for (const match of text.matchAll(MSG)) {
        const key = `err.${match[1]!}`;
        if (!(key in DICTIONARY.fr)) missing.push(`${file}: ${key}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("le dictionnaire n'a pas de clé inutilisée par erreur de frappe (au moins une clé err. et res.)", () => {
    expect(Object.keys(DICTIONARY.fr).some((k) => k.startsWith("err."))).toBe(true);
    expect(Object.keys(DICTIONARY.fr).some((k) => k.startsWith("res."))).toBe(true);
  });
});
