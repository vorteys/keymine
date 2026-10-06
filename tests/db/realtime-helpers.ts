import { spawn, type ChildProcess } from "node:child_process";
import { SignJWT } from "jose";
import WebSocket from "ws";

// Outils communs aux tests d'intégration du serveur temps réel : vrai
// processus, vraie base, vrais cookies signés.
export const SECRET = "secret-de-test-realtime";
export const ORIGIN = "http://localhost:3000";

export type Message = Record<string, unknown> & { type: string };

export type TestServer = { port: number; stop: () => void };

export async function startServer(): Promise<TestServer> {
  const port = 4100 + Math.floor(Math.random() * 800);
  let logs = "";
  const child: ChildProcess = spawn("bun", ["run", "realtime/server.ts"], {
    env: {
      ...process.env,
      REALTIME_PORT: String(port),
      SESSION_SECRET: SECRET,
      NEXT_PUBLIC_SITE_URL: ORIGIN,
      NODE_ENV: "test",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", (d) => (logs += String(d)));
  child.stderr?.on("data", (d) => (logs += String(d)));
  await waitFor(() => (logs.includes("serveur WebSocket") ? true : undefined), 15_000);
  await new Promise((r) => setTimeout(r, 500)); // laisse LISTEN s'établir
  return { port, stop: () => child.kill() };
}

export async function cookie(name: "km_session" | "km_guest", sub: string, extra: Record<string, string> = {}) {
  const token = await new SignJWT(extra)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(SECRET));
  return `${name}=${token}`;
}

export function open(port: number, path: string, headers: Record<string, string>) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}${path}`, { headers });
  const messages: Message[] = [];
  ws.on("message", (raw) => messages.push(JSON.parse(String(raw))));
  const closed = new Promise<number>((resolve) => ws.on("close", (code) => resolve(code)));
  return { ws, messages, closed, last: (type: string) => [...messages].reverse().find((m) => m.type === type) };
}

export async function waitFor<T>(check: () => T | undefined | false | null, ms = 5_000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const value = check();
    if (value) return value;
    if (Date.now() - start > ms) throw new Error("délai dépassé");
    await new Promise((r) => setTimeout(r, 25));
  }
}

export async function waitForAsync<T>(check: () => Promise<T | undefined | false | null>, ms = 8_000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const value = await check();
    if (value) return value;
    if (Date.now() - start > ms) throw new Error("délai dépassé");
    await new Promise((r) => setTimeout(r, 50));
  }
}
