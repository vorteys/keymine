import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { registerViaApi } from "./helpers";

// A11Y-01 / A11Y-04 : aucune violation axe de gravité « serious » ou « critical »
// (contrastes, noms accessibles, structure) dans les deux thèmes.
const PAGES = ["/", "/connexion", "/jouer/creer"];
const THEMES = ["dark", "light"] as const;

for (const theme of THEMES) {
  for (const path of PAGES) {
    test(`axe : ${path} (thème ${theme})`, async ({ browser }) => {
      const context = await browser.newContext({ colorScheme: theme, locale: "fr-CA" });
      const page = await context.newPage();
      await registerViaApi(page.request);
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(
        blocking.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`),
      ).toEqual([]);
      await context.close();
    });
  }
}

test("axe : profil et historique (compte connecté, thème clair)", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "light", locale: "fr-CA" });
  const page = await context.newPage();
  await registerViaApi(page.request);
  for (const path of ["/profil", "/historique"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(
      blocking.map((v) => `${path} ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`),
    ).toEqual([]);
  }
  await context.close();
});
