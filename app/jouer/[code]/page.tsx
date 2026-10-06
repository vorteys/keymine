"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PixelShell } from "@/components/PixelShell";
import { PixelAvatar, PixelButton, PixelPanel, PixelSlot } from "@/components/ui";
import { useRoomEntry } from "@/components/useRoomEntry";
import type { BotLevel } from "@/db/types";

type Player = {
  id: string;
  name: string;
  role: "participant" | "spectator";
  isBot: boolean;
  botLevel: BotLevel | null;
  isSelf: boolean;
};

type LobbyData = {
  code: string;
  name: string;
  access: string;
  language: string;
  maxPlayers: number;
  durationSeconds: number;
  textMode: string;
  errorMode: string;
  status: string;
  isHost: boolean;
};

const DURATION_LABEL = (s: number) =>
  s >= 3600 ? `${Math.round(s / 3600)} h` : `${Math.round(s / 60)} min`;

const TEXT_MODE_LABEL: Record<string, string> = {
  texte: "Texte",
  desordre: "Désordre",
  accents: "Accents",
  cible: "Caractères ciblés",
};

const AVATAR_COLORS = ["#3d6fc4", "#b03a7a", "#a85512", "#17706f", "#7a45b0", "#3f7d24", "#b63a32"];

export default function LobbyPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = params.code.toUpperCase();

  const [lobby, setLobby] = useState<LobbyData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const joined = useRef(false);
  const { run, panel } = useRoomEntry(() => setEntered(true));

  // Entrée dans la salle (pseudo d'invité, déjà dans une autre salle… gérés par le hook).
  useEffect(() => {
    if (joined.current) return;
    joined.current = true;
    void run(() =>
      fetch(`/api/lobbies/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "participant" }),
      }),
    );
  }, [code, run]);

  useEffect(() => {
    if (!entered) return;
    let cancelled = false;

    async function poll() {
      const res = await fetch(`/api/lobbies/${code}`);
      if (cancelled) return;
      if (!res.ok) {
        setError("Salle introuvable");
        return;
      }
      const data = await res.json();
      setLobby(data.lobby);
      setPlayers(data.players);
      if (data.activeRace) {
        router.push(`/course/${code}`);
      }
    }

    async function heartbeat() {
      await fetch(`/api/lobbies/${code}/heartbeat`, { method: "POST" }).catch(() => {});
    }

    void poll();
    const pollId = setInterval(poll, 1500);
    const hbId = setInterval(heartbeat, 15_000);
    return () => {
      cancelled = true;
      clearInterval(pollId);
      clearInterval(hbId);
    };
  }, [code, router, entered]);

  async function addBot(level: BotLevel) {
    await fetch(`/api/lobbies/${code}/bots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level }),
    });
  }

  async function start() {
    const res = await fetch(`/api/lobbies/${code}/start`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Impossible de démarrer");
      return;
    }
    router.push(`/course/${code}`);
  }

  async function closeLobby() {
    await fetch(`/api/lobbies/${code}`, { method: "DELETE" });
    router.push("/");
  }

  const participants = players.filter((p) => p.role === "participant");
  const spectators = players.filter((p) => p.role === "spectator");

  return (
    <PixelShell active="jouer">
      {panel && <div className="mb-6">{panel}</div>}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="flex-grow">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="font-pixel mb-2.5 text-[10px] text-[#ffd84a]">
                SALLE D&rsquo;ATTENTE · {(lobby?.access ?? "public").toUpperCase()} ·{" "}
                {(lobby?.language ?? "fr").toUpperCase()}
              </div>
              <h1 className="font-pixel text-xl text-white [text-shadow:4px_4px_0_#000]">
                {lobby?.name.toUpperCase() ?? "…"}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {code.split("").map((c, i) => (
                <span
                  key={i}
                  className="pixel-slot font-pixel flex h-14 w-11 items-center justify-center text-xl text-white"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          <PixelPanel className="p-5">
            <div className="mb-3.5 flex items-center justify-between">
              <span className="font-pixel text-sm text-[#2b2b2b]">
                JOUEURS {participants.length} / {lobby?.maxPlayers ?? "…"}
              </span>
              <span className="text-2xl text-[#3a3a3a]">{spectators.length} spectateurs</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {participants.map((p, i) => (
                <PixelSlot key={p.id} className="flex h-16 items-center gap-3 px-2.5">
                  <PixelAvatar
                    label={p.name[0]?.toUpperCase() ?? "?"}
                    color={p.isBot ? "#555555" : AVATAR_COLORS[i % AVATAR_COLORS.length]!}
                    className="h-9 w-9 text-sm"
                  />
                  <div className="min-w-0 flex-grow leading-none">
                    <div className="truncate text-2xl text-white">{p.name}</div>
                    <div className="font-pixel mt-1 text-[8px] text-[#ffe08a]">
                      {p.isBot ? "BOT" : p.isSelf ? "TOI" : "PRÊT"}
                    </div>
                  </div>
                </PixelSlot>
              ))}
            </div>
          </PixelPanel>
        </div>

        <div className="flex w-full flex-col gap-5 lg:w-96 lg:flex-none">
          <PixelPanel className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-pixel text-sm text-[#2b2b2b]">RÉGLAGES</span>
              {lobby?.isHost && (
                <Link href="/jouer/creer" className="text-2xl text-[#2b2b2b] underline">
                  Nouvelle salle
                </Link>
              )}
            </div>
            {[
              ["Langue", (lobby?.language ?? "fr").toUpperCase()],
              ["Texte", TEXT_MODE_LABEL[lobby?.textMode ?? "texte"]],
              ["Durée max", DURATION_LABEL(lobby?.durationSeconds ?? 300)],
              ["Erreurs", lobby?.errorMode === "bloquer" ? "Bloquer" : "Accumuler"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between border-b-2 border-dotted border-[#8b8b8b] py-0.5"
              >
                <span className="text-[#3a3a3a]">{k}</span>
                <b className="font-normal">{v}</b>
              </div>
            ))}
          </PixelPanel>

          {lobby?.isHost && (
            <PixelPanel className="flex flex-col gap-3 p-5">
              <span className="font-pixel text-sm text-[#2b2b2b]">HÔTE DE LA COURSE</span>
              <p className="text-xl text-[#3a3a3a]">
                Transféré automatiquement si tu es inactif plus de 60 s.
              </p>
              <div className="flex flex-wrap gap-2">
                {(["debutant", "intermediaire", "expert", "impossible"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => addBot(lvl)}
                    className="pixel-chip text-lg"
                  >
                    + {lvl.toUpperCase()}
                  </button>
                ))}
              </div>
              <PixelButton type="button" onClick={closeLobby} variant="red" className="h-12 text-[11px]">
                FERMER LA SALLE
              </PixelButton>
            </PixelPanel>
          )}

          {error && (
            <div className="border-4 border-black bg-[#f39a8c] px-3.5 py-2.5 text-xl text-black">
              {error}
            </div>
          )}

          {lobby?.isHost ? (
            <PixelButton type="button" onClick={start} variant="green" className="h-24 text-2xl">
              DÉMARRER
            </PixelButton>
          ) : (
            <div className="border-4 border-black bg-[#fff8dc] px-3.5 py-2.5 text-center text-2xl text-black">
              En attente que l&rsquo;hôte démarre la course…
            </div>
          )}
          <p className="-mt-3 text-center text-xl text-[#f1e6c9]">
            {participants.length} prêts · minimum 2 participants
          </p>
        </div>
      </div>
    </PixelShell>
  );
}
