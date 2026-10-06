"use client";

import { useState } from "react";
import { PixelButton, PixelPanel } from "@/components/ui";
import type { LobbyView } from "@/lib/lobby-snapshot";
import { SettingsForm } from "./SettingsForm";
import { settingsFromLobby, settingsToPayload, type SettingsState } from "./settings";

// CONF-12 : l'hôte modifie la configuration dans la salle d'attente ; les
// autres joueurs voient le changement en direct (notification Postgres → WebSocket).
export function HostSettingsEditor({
  code,
  lobby,
  onClose,
}: {
  code: string;
  lobby: LobbyView["lobby"];
  onClose: () => void;
}) {
  const [value, setValue] = useState<SettingsState>(() => settingsFromLobby(lobby));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/lobbies/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsToPayload(value)),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string; code?: string } | null;
        setError(
          data?.code === "capacity_too_low"
            ? "La capacité ne peut pas être inférieure au nombre de participants."
            : (data?.error ?? "Impossible d’enregistrer les réglages."),
        );
        return;
      }
      onClose();
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PixelPanel className="mb-6 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-pixel text-sm text-[#2b2b2b]">MODIFIER LES RÉGLAGES</h2>
      </div>
      <SettingsForm value={value} onChange={(patch) => setValue((prev) => ({ ...prev, ...patch }))} />
      {error && (
        <p role="alert" className="mt-4 border-4 border-black bg-[#f39a8c] px-3.5 py-2.5 text-xl text-black">
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <PixelButton variant="slate" onClick={onClose} className="h-12 px-5 text-[11px]">
          ANNULER
        </PixelButton>
        <PixelButton variant="green" onClick={() => void save()} className="h-12 px-6 text-[11px]">
          {saving ? "..." : "ENREGISTRER"}
        </PixelButton>
      </div>
    </PixelPanel>
  );
}
