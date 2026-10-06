"use client";

import { useEffect, useState } from "react";
import type { LobbyView } from "@/lib/lobby-snapshot";

// Suivi en direct d'une salle d'attente (SALLE-01, SALLE-02, JOIN-01) :
// WebSocket authentifié par cookie ; si la connexion échoue, repli sur des
// requêtes HTTP régulières (avec battement de présence) pendant que le
// WebSocket est retenté en arrière-plan.

export type LobbyLiveStatus = "connecting" | "live" | "polling" | "closed" | "removed" | "missing";

const POLL_MS = 2_000;
const HEARTBEAT_MS = 15_000;

function realtimeBase(): string {
  return process.env.NEXT_PUBLIC_REALTIME_URL ?? "ws://localhost:4001";
}

export function useLobbyLive(code: string, enabled: boolean) {
  const [view, setView] = useState<LobbyView | null>(null);
  const [status, setStatus] = useState<LobbyLiveStatus>("connecting");

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let terminal = false;
    let ws: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    async function pollOnce() {
      try {
        const res = await fetch(`/api/lobbies/${code}`);
        if (stopped) return;
        if (res.status === 404) {
          terminal = true;
          setStatus("missing");
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as LobbyView;
          setView(data);
          if (data.lobby.status === "closed") {
            terminal = true;
            setStatus("closed");
          }
        }
      } catch {
        // réseau coupé : on réessaiera au prochain tour
      }
    }

    function startFallback() {
      if (pollTimer) return;
      void pollOnce();
      pollTimer = setInterval(() => void pollOnce(), POLL_MS);
      heartbeatTimer = setInterval(() => {
        void fetch(`/api/lobbies/${code}/heartbeat`, { method: "POST" }).catch(() => {});
      }, HEARTBEAT_MS);
    }

    function stopFallback() {
      if (pollTimer) clearInterval(pollTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      pollTimer = null;
      heartbeatTimer = null;
    }

    function connect() {
      if (stopped || terminal) return;
      const socket = new WebSocket(`${realtimeBase()}/lobby?code=${encodeURIComponent(code)}`);
      ws = socket;

      socket.onopen = () => {
        attempts = 0;
        setStatus("live");
        stopFallback();
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(String(event.data)) as { type: string } & Partial<LobbyView>;
          if (data.type === "lobby") {
            const { type: _type, ...rest } = data;
            void _type;
            setView(rest as LobbyView);
          } else if (data.type === "closed") {
            terminal = true;
            setStatus("closed");
          } else if (data.type === "removed") {
            terminal = true;
            setStatus("removed");
          }
        } catch {
          // message illisible : ignoré
        }
      };

      socket.onclose = () => {
        if (stopped || terminal) return;
        setStatus("polling");
        startFallback();
        retryTimer = setTimeout(connect, Math.min(15_000, 1_000 * 2 ** attempts++));
      };
    }

    connect();
    // Un ping applicatif léger garde la connexion ouverte derrière les proxys.
    const pingTimer = setInterval(() => {
      if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: "ping" }));
    }, 25_000);

    return () => {
      stopped = true;
      clearInterval(pingTimer);
      stopFallback();
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
    };
  }, [code, enabled]);

  return { view, status };
}
