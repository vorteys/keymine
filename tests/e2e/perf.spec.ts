import { expect, test } from "@playwright/test";
import { addBotViaApi, createRoomViaApi, registerViaApi } from "./helpers";

// PERF-03 : la piste reste fluide avec la capacité maximale (30 participants).
test("course à 30 participants : la piste reste fluide (PERF-03)", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await registerViaApi(page.request, "perf");
  const code = await createRoomViaApi(page.request, { maxPlayers: 30, durationSeconds: 30 });
  for (let i = 0; i < 29; i++) await addBotViaApi(page.request, code, ["noob", "intermediaire", "expert"][i % 3]);

  await page.addInitScript(() => {
    const w = window as unknown as { __longTasks: number[] };
    w.__longTasks = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) w.__longTasks.push(entry.duration);
    }).observe({ entryTypes: ["longtask"] });
  });
  await page.goto(`/jouer/${code}`);
  await page.getByRole("button", { name: "DÉMARRER" }).click();
  await expect(page).toHaveURL(new RegExp(`/course/${code}`), { timeout: 15_000 });
  await expect(page.getByText("La course commence…")).toBeHidden({ timeout: 15_000 });
  await expect(page.getByRole("list", { name: "Piste de progression" }).getByRole("listitem")).toHaveCount(30);

  const stats = await page.evaluate(
    () =>
      new Promise<{ fps: number; worstLongTask: number }>((resolve) => {
        const durationMs = 6000;
        const start = performance.now();
        let frames = 0;
        const tick = () => {
          frames += 1;
          if (performance.now() - start < durationMs) requestAnimationFrame(tick);
          else {
            const tasks = (window as unknown as { __longTasks: number[] }).__longTasks;
            resolve({ fps: (frames * 1000) / durationMs, worstLongTask: Math.max(0, ...tasks) });
          }
        };
        requestAnimationFrame(tick);
      }),
  );
  expect(stats.fps, `fps mesurés : ${stats.fps}`).toBeGreaterThanOrEqual(30);
  expect(stats.worstLongTask, "aucune tâche de plus de 250 ms").toBeLessThan(250);
});
