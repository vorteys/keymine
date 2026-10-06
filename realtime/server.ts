// Serveur temps réel de KeyMine (processus séparé de Next.js) : WebSocket
// authentifiés par cookie pour la salle d'attente (/lobby) et la course
// (racine). Voir docs/ARCHITECTURE.md §4 et §5.
import { WebSocketServer, type WebSocket } from "ws";
import { allowedOrigins, identityFromCookies, isAllowedOrigin } from "./auth";
import { attachLobbySocket, setRaceCreatedHandler, startLobbyChannel } from "./lobby-channel";
import { lobbyConnectionQuery, raceConnectionQuery } from "./protocol";
import { attachRaceSocket, loadRoom, resumeUnfinishedRaces } from "./race-room";

const PORT = Number(process.env.REALTIME_PORT ?? 4001);

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) throw new Error("SESSION_SECRET manquant (voir .env.example).");
const ORIGINS = allowedOrigins();

const wss = new WebSocketServer({ port: PORT, maxPayload: 16 * 1024 });
console.log(`[realtime] serveur WebSocket KeyMine sur le port ${PORT}`);

// Détection des connexions mortes : un client qui ne répond pas au ping est coupé.
const alive = new WeakMap<WebSocket, boolean>();
setInterval(() => {
  for (const client of wss.clients) {
    if (alive.get(client) === false) {
      client.terminate();
      continue;
    }
    alive.set(client, false);
    client.ping();
  }
}, 20_000);

wss.on("connection", (socket, request) => {
  alive.set(socket, true);
  socket.on("pong", () => alive.set(socket, true));
  socket.on("error", () => socket.terminate());

  if (!isAllowedOrigin(request.headers.origin, ORIGINS)) {
    socket.close(4403, "origine refusée");
    return;
  }

  void (async () => {
    const identity = await identityFromCookies(request.headers.cookie, SESSION_SECRET);
    if (!identity) {
      socket.close(4401, "non authentifié");
      return;
    }
    const url = new URL(request.url ?? "/", "http://localhost");
    if (url.pathname === "/lobby") {
      const q = lobbyConnectionQuery.safeParse({ code: url.searchParams.get("code") ?? "" });
      if (!q.success) {
        socket.close(1008, "code invalide");
        return;
      }
      await attachLobbySocket(socket, identity, q.data.code);
    } else {
      const q = raceConnectionQuery.safeParse({ race: url.searchParams.get("race") ?? undefined });
      if (!q.success) {
        socket.close(1008, "paramètres invalides");
        return;
      }
      await attachRaceSocket(socket, identity, { race: q.data.race });
    }
  })().catch((error) => {
    console.error("[realtime] connexion", error);
    socket.close(1011, "erreur interne");
  });
});

setRaceCreatedHandler((raceId) => void loadRoom(raceId).catch((e) => console.error("[realtime] course", e)));
void startLobbyChannel().then(() => resumeUnfinishedRaces());
