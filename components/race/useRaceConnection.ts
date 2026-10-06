"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BonusAnnouncement, RaceState } from "./types";

// Connexion WebSocket à la course : état en direct (≥ 4 mises à jour par
// seconde), texte personnel (modifié par les bonus), annonces de bonus, et
// reconnexion automatique (COURSE-08 : le serveur garde 30 s la place).

type ConnectionStatus = "connecting" | "open" | "reconnecting" | "refused";

function realtimeBase(): string {
  return process.env.NEXT_PUBLIC_REALTIME_URL ?? "ws://localhost:4001";
}

type Options = {
  /** Identifiant du participant local (pour détecter une remontée au classement). */
  meId: string | null;
  /** Texte personnel reçu (au départ, à la reconnexion, après un bonus) — appelé hors rendu. */
  onText?: (value: string, progress: number) => void;
  /** Course terminée — appelé une seule fois avec l'état final. */
  onFinished?: (state: RaceState) => void;
};

export function useRaceConnection(raceId: string | null, options: Options) {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });
  const lastRank = useRef<number | null>(null);
  const [overtakeAt, setOvertakeAt] = useState(0);

  const [state, setState] = useState<RaceState | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<BonusAnnouncement[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [clockOffset, setClockOffset] = useState(0); // heure serveur − heure locale
  const socketRef = useRef<WebSocket | null>(null);
  const announcementId = useRef(0);

  useEffect(() => {
    if (!raceId) return;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let finished = false;

    function connect() {
      if (stopped) return;
      const socket = new WebSocket(`${realtimeBase()}/?race=${encodeURIComponent(raceId!)}`);
      socketRef.current = socket;

      socket.onopen = () => setStatus("open");

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(String(event.data)) as { type: string } & Record<string, unknown>;
          if (data.type === "state") {
            const s = data as unknown as RaceState & { serverNow: number };
            setClockOffset(s.serverNow - Date.now());
            const next: RaceState = { phase: s.phase, startsAt: s.startsAt, endsAt: s.endsAt, participants: s.participants };
            setState(next);
            const me = optionsRef.current.meId ? s.participants.find((p) => p.id === optionsRef.current.meId) : undefined;
            if (me) {
              if (lastRank.current !== null && me.rank < lastRank.current) setOvertakeAt(Date.now());
              lastRank.current = me.rank;
            }
            if (s.phase === "finished" && !finished) {
              finished = true;
              optionsRef.current.onFinished?.(next);
            }
          } else if (data.type === "text") {
            setText(String(data.text));
            optionsRef.current.onText?.(String(data.text), Number(data.progress));
          } else if (data.type === "bonus") {
            const id = ++announcementId.current;
            const entry: BonusAnnouncement = {
              id,
              bonus: data.bonus as BonusAnnouncement["bonus"],
              label: String(data.label),
              at: Date.now(),
            };
            setAnnouncements((list) => [...list.slice(-4), entry]);
          }
        } catch {
          // message illisible : ignoré
        }
      };

      socket.onclose = (event) => {
        if (stopped || finished) return;
        if (event.code === 4401 || event.code === 4403) {
          setStatus("refused");
          return;
        }
        setStatus("reconnecting");
        retry = setTimeout(connect, 1_000);
      };
    }

    connect();
    return () => {
      stopped = true;
      if (retry) clearTimeout(retry);
      socketRef.current?.close();
    };
  }, [raceId]);

  const send = useCallback((message: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }, []);

  return { state, text, announcements, status, clockOffset, overtakeAt, send };
}
