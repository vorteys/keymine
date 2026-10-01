import { expect, test } from "@playwright/test";

test("la page d'accueil affiche le bouton JOUER et la liste des lobbys", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /tape plus vite/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "JOUER" })).toBeVisible();
  await expect(page.getByText("LOBBYS PUBLICS")).toBeVisible();
});

test("créer une course mène à la salle d'attente", async ({ page }) => {
  await page.goto("/jouer/creer");
  await expect(page.getByRole("heading", { name: "CRÉER UNE COURSE" })).toBeVisible();
  await page.getByRole("link", { name: "CRÉER LA SALLE" }).click();
  await expect(page.getByRole("heading", { name: /mme roy/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "DÉMARRER" })).toBeVisible();
});
