// Lance en parallèle le serveur Next.js et le petit serveur temps réel
// WebSocket (realtime/server.ts), pour le développement local.
import { spawn, type ChildProcess } from "node:child_process";

const options = { stdio: "inherit" } as const;
const procs: ChildProcess[] = [
  spawn("bun", ["run", "next", "dev"], options),
  spawn("bun", ["run", "realtime/server.ts"], options),
];

function shutdown(): void {
  for (const p of procs) p.kill();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

for (const p of procs) p.on("exit", shutdown);
