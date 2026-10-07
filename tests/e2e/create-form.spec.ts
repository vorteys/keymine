import { expect, test } from "@playwright/test";
import { createRoomViaApi, registerViaApi } from "./helpers";

// CONF-06, CONF-07, CONF-09 : formulaire de création (bonus par type, accents par type,
// cartes de lettres et de symboles à trois états).

test("le formulaire de création enregistre bonus, accents, lettres et symboles choisis", async ({
  page,
}) => {
  await registerViaApi(page.request, "forme");
  await page.goto("/jouer/creer");

  // Bonus : on ne garde que le brouillard.
  await page.getByRole("button", { name: /^-3 MOTS/ }).click();
  await page.getByRole("button", { name: /^\+3 MOTS/ }).click();

  await page.getByRole("button", { name: /ALEATOIRE/ }).click();
  await page.getByRole("button", { name: "Ponctuation" }).click();

  // Lettres : Z souvent (1 clic), E jamais (2 clics), K : 3 clics = retour au neutre.
  const letters = page.getByRole("group", { name: "LETTRES" });
  await letters.getByRole("button", { name: /^Z : / }).click();
  await letters.getByRole("button", { name: /^E : / }).click({ clickCount: 2 });
  await letters.getByRole("button", { name: /^K : / }).click({ clickCount: 3 });
  await expect(letters.getByRole("button", { name: "Z : souvent" })).toBeVisible();
  await expect(letters.getByRole("button", { name: "E : jamais" })).toBeVisible();
  await expect(letters.getByRole("button", { name: "K : neutre" })).toBeVisible();

  // Symboles : @ souvent, l'apostrophe jamais.
  const symbols = page.getByRole("group", { name: "SYMBOLES" });
  await symbols.getByRole("button", { name: /^@ : / }).click();
  await symbols.getByRole("button", { name: /^' : / }).click({ clickCount: 2 });

  // Accents : cédille souvent, tréma jamais.
  const accents = page.getByRole("group", { name: "TYPES D'ACCENTS" });
  await accents.getByRole("button", { name: /^CEDILLE : / }).click();
  await accents.getByRole("button", { name: /^TREMA : / }).click({ clickCount: 2 });

  // L'aperçu respecte les choix : jamais de « e », jamais de tréma.
  const preview = page.getByTestId("text-preview");
  await expect(preview).not.toHaveText("…");
  expect((await preview.textContent()) ?? "").not.toMatch(/[eEëï]/);

  await page.getByRole("button", { name: "CREER LA SALLE" }).click();
  await page.waitForURL(/\/jouer\/[A-Z0-9]{6}/);
  const code = page.url().split("/").pop()!;

  const lobby = await (await page.request.get(`/api/lobbies/${code}`)).json();
  expect(lobby.lobby).toMatchObject({
    textType: "aleatoire",
    punctuation: true,
    comebackBonus: true,
    bonusKinds: ["fog"],
    includeChars: ["z", "@"],
    excludeChars: ["e", "'"],
    accentWanted: ["cedille"],
    accentForbidden: ["trema"],
  });
});

test("décocher tous les types de bonus coupe l'interrupteur général", async ({ page }) => {
  await registerViaApi(page.request, "bonus");
  await page.goto("/jouer/creer");
  const master = page.getByRole("checkbox", { name: "Bonus de remontée activés" });
  await expect(master).toBeChecked();
  for (const name of [/^-3 MOTS/, /^\+3 MOTS/, /^BROUILLARD/]) {
    await page.getByRole("button", { name }).click();
  }
  await expect(master).not.toBeChecked();
  await expect(page.getByRole("button", { name: /^BROUILLARD/ })).toBeDisabled();
  await master.check();
  await expect(page.getByRole("button", { name: /^BROUILLARD/ })).toBeEnabled();
  await expect(page.getByRole("button", { name: /^-3 MOTS/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("en texte cohérent, les cartes de lettres et de symboles sont désactivées", async ({
  page,
}) => {
  await registerViaApi(page.request, "coher");
  await page.goto("/jouer/creer");
  await page.getByRole("button", { name: "Ponctuation" }).click();
  await expect(
    page.getByRole("group", { name: "LETTRES" }).getByRole("button", { name: /^Q : / }),
  ).toBeDisabled();
  await expect(
    page.getByRole("group", { name: "SYMBOLES" }).getByRole("button", { name: /^@ : / }),
  ).toBeDisabled();
  // Les types d'accents restent utilisables : un accent interdit s'applique aussi aux passages.
  await expect(
    page.getByRole("group", { name: "TYPES D'ACCENTS" }).getByRole("button").first(),
  ).toBeEnabled();
});

// SALLE-06 : dans une salle, la page de création ne montre pas le formulaire.
test("déjà dans une salle : pas de formulaire, on retourne dans la salle ou on la quitte", async ({
  page,
}) => {
  await registerViaApi(page.request, "dejala");
  const code = await createRoomViaApi(page.request, {});
  await page.goto("/jouer/creer");
  await expect(page.getByRole("heading", { name: "TU ES DEJA DANS UNE SALLE" })).toBeVisible();
  await expect(page.getByText(code)).toBeVisible();
  await expect(page.getByRole("button", { name: "CREER LA SALLE" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "RETOURNER A LA SALLE" })).toHaveAttribute(
    "href",
    `/jouer/${code}`,
  );

  await page.getByRole("button", { name: "QUITTER LA SALLE" }).click();
  await expect(page.getByRole("button", { name: "CREER LA SALLE" })).toBeVisible();
});
