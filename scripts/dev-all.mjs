#!/usr/bin/env bun
// Lance en parallèle le serveur Next.js et le petit serveur temps réel
// WebSocket (realtime/server.ts), pour le développement local.
const procs = [
  Bun.spawn(["bun", "run", "next", "dev"], { stdout: "inherit", stderr: "inherit", stdin: "inherit" }),
  Bun.spawn(["bun", "run", "realtime/server.ts"], {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  }),
];

const shutdown = () => {
  for (const p of procs) p.kill();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await Promise.race(procs.map((p) => p.exited));
shutdown();
