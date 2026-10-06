import { expect, test } from "@playwright/test";
import { PASSWORD, uniqueName } from "./helpers";

// TEST-03 : connexion par nom d'utilisateur et mot de passe (pas d'OAuth).
test("créer un compte, se déconnecter, se reconnecter", async ({ page }) => {
  const username = uniqueName("e2e");
  await page.goto("/connexion");
  await page.getByRole("button", { name: "CRÉER UN COMPTE" }).first().click();
  await page.getByLabel("NOM D'UTILISATEUR").fill(username);
  await page.getByLabel("MOT DE PASSE").fill(PASSWORD);
  await page.getByRole("button", { name: "CRÉER LE COMPTE" }).click();
  await expect(page).toHaveURL("/");

  await page.goto("/profil");
  await expect(page.getByText(username.toUpperCase())).toBeVisible();
  await page.getByRole("button", { name: "DÉCONNEXION" }).click();

  await page.goto("/connexion");
  await page.getByLabel("NOM D'UTILISATEUR").fill(username);
  await page.getByLabel("MOT DE PASSE").fill(PASSWORD);
  await page.getByRole("button", { name: "CONNEXION" }).last().click();
  await expect(page).toHaveURL("/");
  await page.goto("/profil");
  await expect(page.getByText(username.toUpperCase())).toBeVisible();
});

test("un mauvais mot de passe affiche un message d'erreur traduit", async ({ page }) => {
  await page.goto("/connexion");
  await page.getByLabel("NOM D'UTILISATEUR").fill("personne-inconnue");
  await page.getByLabel("MOT DE PASSE").fill("mauvais-mot-de-passe");
  await page.getByRole("button", { name: "CONNEXION" }).last().click();
  await expect(page.getByText("Nom d'utilisateur ou mot de passe incorrect.")).toBeVisible();
});

test("un invité ne peut pas créer de salle (AUTH-03)", async ({ request }) => {
  await request.post("/api/auth/guest", { data: { pseudo: uniqueName("inv") } });
  const res = await request.post("/api/lobbies", { data: {} });
  expect(res.status()).toBe(403);
  expect((await res.json()).code).toBe("account_required");
});
