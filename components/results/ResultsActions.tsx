"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PixelButton } from "@/components/ui";
import { useLobbyLive } from "@/components/useLobbyLive";
import { useLanguage } from "@/lib/i18n";

// COURSE-11 : sur l'écran des résultats, l'hôte peut relancer une course avec
// les mêmes participants ou fermer la salle ; les autres joueurs retournent
// dans la salle (où ils attendent la relance) ou quittent.
export function ResultsActions({
  code,
  isHost,
  hasHistory,
  roomOpen,
}: {
  code: string;
  isHost: boolean;
  hasHistory: boolean;
  /** La salle existe encore et n'est pas fermée : on peut y revenir. */
  roomOpen: boolean;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function call(path: string, method: "POST" | "DELETE", next: string) {
    setBusy(true);
    setError(false);
    try {
      const response = await fetch(path, { method });
      if (!response.ok) throw new Error(String(response.status));
      router.push(next);
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  // Les non-hôtes suivent la salle : dès que l'hôte relance (RÉSULTATS → EN_ATTENTE),
  // ils retournent automatiquement dans la salle d'attente.
  const { view } = useLobbyLive(code, roomOpen && !isHost);
  const lobbyStatus = view?.lobby.status;
  useEffect(() => {
    if (lobbyStatus === "lobby" || lobbyStatus === "countdown") router.push(`/jouer/${code}`);
  }, [lobbyStatus, code, router]);

  const busyClass = busy ? "pointer-events-none opacity-50" : "";

  return (
    <div className="pixel-dark mt-8 border-t-4 border-black bg-[#241a10] px-4 py-5">
      {error && (
        <p role="alert" className="mb-3 text-right text-xl text-[#ff9a8a]">
          {t("res.action_error")}
        </p>
      )}
      {roomOpen && !isHost && (
        <p className="mb-3 text-right text-xl text-[#f1e6c9]">{t("res.replay_wait")}</p>
      )}
      <div className="flex flex-wrap justify-end gap-3.5">
        {hasHistory && (
          <PixelButton href="/historique" variant="gold" className="h-13 px-5 text-xs">
            {t("res.history")}
          </PixelButton>
        )}
        <PixelButton href="/profil" variant="gold" className="h-13 px-5 text-xs">
          {t("res.my_stats")}
        </PixelButton>
        <PixelButton href="/" variant="slate" className="h-13 px-5 text-xs">
          {t("res.home")}
        </PixelButton>
        {roomOpen && isHost && (
          <>
            <PixelButton
              variant="red"
              className={`h-13 px-5 text-xs ${busyClass}`}
              onClick={() => call(`/api/lobbies/${code}`, "DELETE", "/")}
            >
              {t("res.close_room")}
            </PixelButton>
            <PixelButton
              variant="green"
              className={`h-13 px-7 text-sm ${busyClass}`}
              onClick={() => call(`/api/lobbies/${code}/rematch`, "POST", `/jouer/${code}`)}
            >
              {t("res.replay")}
            </PixelButton>
          </>
        )}
      </div>
    </div>
  );
}
