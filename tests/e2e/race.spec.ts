import { expect, test, type Page } from "@playwright/test";
import { addBotViaApi, createRoomViaApi, joinAsGuest, registerViaApi, uniqueName } from "./helpers";

/**
 * Attend la fin du décompte puis tape le texte affiché. Les bonus peuvent allonger le texte en
 * cours de course (« +3 mots ») : on relit donc le texte après chaque tranche tapée, jusqu'à ce
 * que la page des résultats s'affiche.
 */
async function typeWholeText(page: Page, code: string) {
  const box = page.getByRole("group", { name: "Texte à taper" });
  await expect(box).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("La course commence…")).toBeHidden({ timeout: 15_000 });
  let typed = 0;
  for (let round = 0; round < 40 && !page.url().includes(`/resultats/${code}`); round++) {
    const text = (await box.textContent().catch(() => null)) ?? "";
    if (text.length > typed) {
      // `press` (et non `type`) pour l'ASCII ; les caractères hors clavier US (é, œ, ’…) sont envoyés
      // comme un évènement keydown, sinon la page ne les voit pas.
      for (const char of text.slice(typed)) {
        if (/^[\x20-\x7e]$/.test(char)) await page.keyboard.press(char);
        else await page.evaluate((key) => window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })), char);
      }
      typed = text.length;
    } else {
      await page.waitForTimeout(250);
    }
  }
}

test("course complète : hôte + invité + bot, résultats, rejouer (COURSE-03/04/05, RES-01, COURSE-11)", async ({ browser }) => {
  const hostContext = await browser.newContext({ locale: "fr-CA" });
  const guestContext = await browser.newContext({ locale: "fr-CA" });
  const host = await hostContext.newPage();
  await registerViaApi(host.request, "hote");
  const code = await createRoomViaApi(host.request, { textLength: 10, durationSeconds: 15, comebackBonus: false });
  await addBotViaApi(host.request, code, "noob");
  await host.goto(`/jouer/${code}`);

  const guestName = uniqueName("inv");
  const guest = await joinAsGuest(guestContext, code, guestName);
  await expect(host.getByText(guestName).first()).toBeVisible();

  await host.getByRole("button", { name: "DÉMARRER" }).click();
  await expect(host).toHaveURL(new RegExp(`/course/${code}`), { timeout: 15_000 });
  await expect(guest).toHaveURL(new RegExp(`/course/${code}`), { timeout: 15_000 });

  await Promise.all([typeWholeText(host, code), typeWholeText(guest, code)]);

  await expect(host).toHaveURL(new RegExp(`/resultats/${code}`), { timeout: 30_000 });
  await expect(guest).toHaveURL(new RegExp(`/resultats/${code}`), { timeout: 30_000 });
  // Le classement est un vrai tableau (A11Y-03).
  await expect(host.getByRole("table")).toBeVisible();
  await expect(host.getByRole("table")).toContainText(guestName);

  // L'hôte relance avec les mêmes participants.
  await host.getByRole("button", { name: "REJOUER" }).click();
  await expect(host).toHaveURL(new RegExp(`/jouer/${code}$`), { timeout: 15_000 });
  await expect(host.getByText(guestName).first()).toBeVisible();

  await hostContext.close();
  await guestContext.close();
});

test("l'hôte expulse un invité : il est redirigé hors de la salle et ne peut pas revenir (SALLE-07)", async ({ browser }) => {
  const hostContext = await browser.newContext({ locale: "fr-CA" });
  const guestContext = await browser.newContext({ locale: "fr-CA" });
  const host = await hostContext.newPage();
  await registerViaApi(host.request, "hote");
  const code = await createRoomViaApi(host.request);
  await host.goto(`/jouer/${code}`);
  const guestName = uniqueName("inv");
  const guest = await joinAsGuest(guestContext, code, guestName);

  await host.getByRole("button", { name: `Expulser ${guestName}` }).click();
  await expect(guest).not.toHaveURL(new RegExp(`/jouer/${code}$`), { timeout: 15_000 });

  // Banni : il ne peut pas revenir avec le code.
  const retry = await guestContext.request.post(`/api/lobbies/${code}/join`, { data: {} });
  expect(retry.ok()).toBe(false);

  await hostContext.close();
  await guestContext.close();
});

test("les réglages modifiés par l'hôte se mettent à jour en direct chez l'invité (SALLE-03)", async ({ browser }) => {
  const hostContext = await browser.newContext({ locale: "fr-CA" });
  const guestContext = await browser.newContext({ locale: "fr-CA" });
  const host = await hostContext.newPage();
  await registerViaApi(host.request, "hote");
  const code = await createRoomViaApi(host.request, { textLength: 10 });
  await host.goto(`/jouer/${code}`);
  const guest = await joinAsGuest(guestContext, code, uniqueName("inv"));
  await expect(guest.getByText("10 mots")).toBeVisible();

  const res = await host.request.patch(`/api/lobbies/${code}`, { data: { textLength: 25 } });
  expect(res.ok(), await res.text()).toBe(true);
  await expect(guest.getByText("25 mots")).toBeVisible({ timeout: 10_000 });

  await hostContext.close();
  await guestContext.close();
});
