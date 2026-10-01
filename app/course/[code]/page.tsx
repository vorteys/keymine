"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PixelAvatar, PixelButton, PixelPanel } from "@/components/ui";

type CharState = "pending" | "correct" | "incorrect" | "current";

type RaceInfo = {
  id: string;
  textContent: string;
  durationSeconds: number;
  startsAt: string;
  status: string;
};

type MeInfo = { participantId: string; role: "participant" | "spectator"; status: string } | null;

type LiveParticipant = {
  id: string;
  name: string;
  isBot: boolean;
  progressChars: number;
  errorCount: number;
  status: "racing" | "finished" | "abandoned";
  wpm: number;
  accuracy: number;
  rank: number | null;
};

const AVATAR_COLORS = ["#3d6fc4", "#b03a7a", "#a85512", "#17706f", "#7a45b0", "#3f7d24", "#b63a32"];

function formatTime(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${String(m).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export default function CoursePage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params.code.toUpperCase();

  const [race, setRace] = useState<RaceInfo | null>(null);
  const [me, setMe] = useState<MeInfo>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [charStates, setCharStates] = useState<CharState[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [phase, setPhase] = useState<"countdown" | "racing" | "finished">("countdown");
  const [overtakeMsg, setOvertakeMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState({ index: 0, errorCount: 0, errorPositions: 0 });
  const [errorMode, setErrorMode] = useState<"accumuler" | "bloquer">("accumuler");

  const errorModeRef = useRef<"accumuler" | "bloquer">("accumuler");
  const indexRef = useRef(0);
  const errorCountRef = useRef(0);
  const errorPositionsRef = useRef<Set<number>>(new Set());
  const keyCorrectRef = useRef<Record<string, number>>({});
  const keyErrorsRef = useRef<Record<string, number>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const prevRankRef = useRef<number | null>(null);
  const redirectedRef = useRef(false);

  // Charge la course (même texte pour tous les participants — TXT-8).
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/lobbies/${code}/race`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setLoadError(data.error);
          return;
        }
        setRace(data.race);
        setMe(data.me);
        setCharStates(new Array(data.race.textContent.length).fill("pending"));
        if (data.lobby?.errorMode) {
          errorModeRef.current = data.lobby.errorMode;
          setErrorMode(data.lobby.errorMode);
        }
      })
      .catch(() => setLoadError("Impossible de charger la course"));
    return () => {
      cancelled = true;
    };
  }, [code]);

  // Horloge locale pour le décompte et le temps restant.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  // Connexion au serveur temps réel (realtime/server.ts — H17).
  useEffect(() => {
    if (!race || !me) return;
    const base = process.env.NEXT_PUBLIC_REALTIME_URL ?? "ws://localhost:4001";
    const url = `${base}/?race=${race.id}&participant=${me.participantId}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "state") {
          setParticipants(data.participants);
          setPhase(data.phase);

          const mine = data.participants.find((p: LiveParticipant) => p.id === me.participantId);
          if (mine?.rank && prevRankRef.current && mine.rank < prevRankRef.current) {
            setOvertakeMsg("TU PROGRESSES AU CLASSEMENT !");
            setTimeout(() => setOvertakeMsg(null), 2200);
          }
          if (mine?.rank) prevRankRef.current = mine.rank;

          if (data.phase === "finished" && !redirectedRef.current) {
            redirectedRef.current = true;
            try {
              const mine = (data.participants as LiveParticipant[]).find(
                (p) => p.id === me.participantId,
              );
              if (mine) {
                const key = "km_guest_history";
                const raw = sessionStorage.getItem(key);
                const history = raw ? JSON.parse(raw) : [];
                history.unshift({
                  code,
                  wpm: mine.wpm,
                  accuracy: mine.accuracy,
                  errors: mine.errorCount,
                  at: new Date().toISOString(),
                });
                sessionStorage.setItem(key, JSON.stringify(history.slice(0, 20)));
              }
            } catch {
              // STAT-8: historique invité en mémoire seulement — si ça échoue
              // (navigation privée, etc.) on ne bloque pas la redirection.
            }
            setTimeout(() => router.push(`/resultats/${code}`), 1200);
          }
        }
      } catch {
        // message invalide, on ignore
      }
    };

    return () => ws.close();
  }, [race, me, code, router]);

  const text = race?.textContent ?? "";
  const startsAtMs = race ? new Date(race.startsAt).getTime() : now;
  const secondsToStart = (startsAtMs - now) / 1000;
  const elapsedMs = now - startsAtMs;
  const secondsLeft = race ? race.durationSeconds - elapsedMs / 1000 : 0;
  const racing = race?.status !== "finished" && secondsToStart <= 0 && phase !== "finished";
  const canType = racing && me?.role === "participant" && me.status === "racing";

  const liveWpm = useMemo(() => {
    if (!race || elapsedMs <= 0) return 0;
    const correct = progress.index - progress.errorPositions;
    return Math.max(0, Math.round(correct / 5 / (elapsedMs / 60_000)));
  }, [progress, race, elapsedMs]);

  const accuracy = useMemo(() => {
    const attempts = progress.index + progress.errorCount;
    if (attempts === 0) return 100;
    return Math.round((100 * (attempts - progress.errorCount)) / attempts);
  }, [progress]);

  function sendProgress() {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== ws.OPEN) return;
    ws.send(
      JSON.stringify({
        type: "progress",
        progressChars: indexRef.current,
        errorCount: errorCountRef.current,
        keyCorrect: keyCorrectRef.current,
        keyErrors: keyErrorsRef.current,
      }),
    );
  }

  function onAbandon() {
    const ws = wsRef.current;
    if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: "abandon" }));
    router.push(`/resultats/${code}`);
  }

  // JEU-5/JEU-6: modes d'erreur, et H6 — pas de retour arrière.
  useEffect(() => {
    if (!canType) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Backspace") {
        e.preventDefault(); // H6: pas de retour arrière
        return;
      }
      if (e.key.length !== 1) return; // touches spéciales ignorées
      e.preventDefault();

      const i = indexRef.current;
      if (i >= text.length) return;
      const expected = text[i]!;
      const correct = e.key === expected;

      if (correct) {
        keyCorrectRef.current[expected] = (keyCorrectRef.current[expected] ?? 0) + 1;
        indexRef.current = i + 1;
        setCharStates((prev) => {
          const next = [...prev];
          next[i] = "correct";
          return next;
        });
        setProgress({
          index: indexRef.current,
          errorCount: errorCountRef.current,
          errorPositions: errorPositionsRef.current.size,
        });
        sendProgress();
      } else {
        keyErrorsRef.current[expected] = (keyErrorsRef.current[expected] ?? 0) + 1;
        errorCountRef.current += 1;

        // JEU-6: bloqué tant que la bonne touche n'est pas tapée.
        // JEU-5: on continue, l'erreur reste rouge jusqu'à la fin.
        setCharStates((prev) => {
          const next = [...prev];
          next[i] = "incorrect";
          return next;
        });

        // mode "bloquer" déduit depuis l'URL de la course n'est pas connu
        // côté client avant le premier fetch — voir errorModeRef ci-dessous.
        if (errorModeRef.current === "bloquer") {
          // reste sur place, l'utilisateur doit retaper la bonne touche
        } else {
          errorPositionsRef.current.add(i);
          indexRef.current = i + 1;
        }
        setProgress({
          index: indexRef.current,
          errorCount: errorCountRef.current,
          errorPositions: errorPositionsRef.current.size,
        });
        sendProgress();
      }
    }

    function onPaste(e: ClipboardEvent) {
      e.preventDefault(); // JEU-9: collage désactivé
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("paste", onPaste);
    };
  }, [canType, text]);

  if (loadError) {
    return (
      <div className="pixel-night flex min-h-screen items-center justify-center p-8 text-center">
        <p className="font-pixel text-white">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="pixel-night min-h-screen">
      <div className="pixel-grass h-5 border-b-4 border-[#2f5d1c]" />

      <header className="flex h-16 items-center gap-6 border-b-4 border-black bg-[#241a10] px-4 sm:px-8">
        <div className="flex items-center gap-1.5">
          <span className="pixel-key">K</span>
          <span className="pixel-key bg-[#7fc45a]">E</span>
          <span className="pixel-key">Y</span>
          <span className="font-pixel ml-2 text-lg text-white [text-shadow:3px_3px_0_#000]">
            MINE
          </span>
        </div>
        <div className="font-pixel flex-grow truncate text-xs text-[#f1e6c9]">
          SALLE {code}
        </div>
        <PixelAvatar label="?" color="#3d6fc4" className="h-9 w-9 text-sm" />
      </header>

      <main className="px-4 py-6 sm:px-8 sm:py-7">
        {!racing && phase !== "finished" && (
          <div className="mb-6 text-center">
            <div className="font-pixel text-5xl text-white [text-shadow:4px_4px_0_#000]">
              {Math.max(0, Math.ceil(secondsToStart))}
            </div>
            <p className="mt-2 text-2xl text-[#f1e6c9]">La course commence…</p>
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-3.5">
          <div className="pixel-slot flex w-48 flex-col gap-1 px-4 py-2">
            <b className="font-pixel text-[9px] text-[#ffefb3]">TEMPS RESTANT</b>
            <span className="font-pixel py-1 text-2xl text-white">{formatTime(secondsLeft)}</span>
          </div>
          <div className="pixel-slot flex w-36 flex-col gap-1 px-4 py-2">
            <b className="font-pixel text-[9px] text-[#ffefb3]">VITESSE</b>
            <span className="text-3xl text-white">{liveWpm} MPM</span>
          </div>
          <div className="pixel-slot flex w-36 flex-col gap-1 px-4 py-2">
            <b className="font-pixel text-[9px] text-[#ffefb3]">PRÉCISION</b>
            <span className="text-3xl text-white">{accuracy} %</span>
          </div>
          <div className="pixel-slot flex w-32 flex-col gap-1 px-4 py-2">
            <b className="font-pixel text-[9px] text-[#ffefb3]">ERREURS</b>
            <span className="text-3xl text-white">{progress.errorCount}</span>
          </div>
          <div className="flex-grow" />
          {me?.role === "participant" && (
            <PixelButton
              type="button"
              onClick={onAbandon}
              variant="red"
              className="h-16 w-full text-base sm:w-64"
            >
              ABANDONNER
            </PixelButton>
          )}
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex-grow">
            <PixelPanel className="p-4">
              <div className="border-4 border-black bg-[#1b1b1b] p-6 text-3xl leading-relaxed break-all sm:text-4xl">
                {text.split("").map((c, i) => {
                  const state: CharState =
                    i === progress.index ? "current" : (charStates[i] ?? "pending");
                  const cls =
                    state === "correct"
                      ? "text-[#7fd36a]"
                      : state === "incorrect"
                        ? "bg-[#b0281c] text-white"
                        : state === "current"
                          ? "bg-[#f0b429] text-[#1b1b1b]"
                          : "text-[#d8d8d8]";
                  return (
                    <span key={i} className={cls}>
                      {c}
                    </span>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-pixel text-[11px] text-white">
                  PROGRESSION {text.length ? Math.round((progress.index / text.length) * 100) : 0} %
                </span>
                <span className="text-xl text-[#3a3a3a]">
                  {errorMode === "bloquer"
                    ? "Bloqué tant que la bonne touche n'est pas tapée."
                    : "Les erreurs restent en rouge jusqu'à la fin."}
                </span>
              </div>
            </PixelPanel>

            {overtakeMsg && (
              <div className="mt-4 flex flex-wrap gap-3">
                <div className="font-pixel border-4 border-black bg-[#ffd84a] px-4 py-2.5 text-[12px] text-[#1b1b1b]">
                  {overtakeMsg}
                </div>
              </div>
            )}
          </div>

          <PixelPanel className="w-full flex-none p-4 lg:w-96">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="font-pixel text-xs text-[#2b2b2b]">CLASSEMENT</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {[...participants]
                .sort((a, b) => b.progressChars - a.progressChars)
                .map((r, i) => {
                  const isMe = me?.participantId === r.id;
                  const pct = text.length ? Math.min(100, (r.progressChars / text.length) * 100) : 0;
                  return (
                    <div
                      key={r.id}
                      className="flex items-center gap-2.5 px-2.5 py-1.5"
                      style={{ background: isMe ? "#f0b429" : "#6b6b6b" }}
                    >
                      <span
                        className="font-pixel w-5 text-[11px]"
                        style={{ color: isMe ? "#1b1b1b" : "#ffffff" }}
                      >
                        {r.rank ?? i + 1}
                      </span>
                      <PixelAvatar
                        label={r.name[0]?.toUpperCase() ?? "?"}
                        color={r.isBot ? "#555555" : AVATAR_COLORS[i % AVATAR_COLORS.length]!}
                        className="h-7 w-7 text-[11px]"
                      />
                      <div className="min-w-0 flex-grow leading-none">
                        <div
                          className="flex justify-between text-xl"
                          style={{ color: isMe ? "#1b1b1b" : "#ffffff" }}
                        >
                          <span className="truncate">{r.name}</span>
                          <span>{r.wpm}</span>
                        </div>
                        <div className="mt-1 h-3 border-2 border-black bg-[#1b1b1b]">
                          <div
                            className="h-full"
                            style={{
                              width: `${pct}%`,
                              background:
                                "repeating-linear-gradient(90deg, #7fd36a 0 8px, #4aa233 8px 10px)",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </PixelPanel>
        </div>
      </main>
    </div>
  );
}
