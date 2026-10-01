"use client";

import { useEffect, useState } from "react";
import { PixelButton, PixelPanel, PixelSlot } from "@/components/ui";

type GuestRace = { code: string; wpm: number; accuracy: number; errors: number; at: string };

// STAT-8: en invité, les stats ne vivent que le temps de l'onglet (AUTH-8).
export function GuestProfile() {
  const [history, setHistory] = useState<GuestRace[]>([]);

  useEffect(() => {
    // sessionStorage n'existe que côté navigateur: on ne peut pas le lire
    // pendant le rendu serveur sans provoquer un mismatch d'hydratation, d'où
    // cette lecture différée après le montage.
    try {
      const raw = sessionStorage.getItem("km_guest_history");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      // navigation privée ou stockage bloqué: on affiche juste une liste vide
    }
  }, []);

  const best = history.reduce((m, r) => Math.max(m, r.wpm), 0);

  return (
    <div className="flex flex-col gap-6">
      <PixelPanel className="p-6 text-center">
        <p className="text-2xl leading-tight text-[#3a3a3a]">
          Tu joues en invité: ces stats restent dans cet onglet et disparaîtront si tu le fermes.
          Connecte-toi pour les garder pour de bon.
        </p>
        <PixelButton href="/connexion" variant="green" className="mx-auto mt-4 h-14 px-8 text-sm">
          CRÉER UN COMPTE
        </PixelButton>
      </PixelPanel>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <PixelSlot className="p-2.5 leading-none">
          <b className="font-pixel mb-1 block text-[9px] text-[#ffefb3]">MEILLEUR</b>
          <span className="text-3xl text-white">{best} MPM</span>
        </PixelSlot>
        <PixelSlot className="p-2.5 leading-none">
          <b className="font-pixel mb-1 block text-[9px] text-[#ffefb3]">COURSES (SESSION)</b>
          <span className="text-3xl text-white">{history.length}</span>
        </PixelSlot>
      </div>

      <PixelPanel className="p-5">
        <div className="font-pixel mb-2.5 text-sm">COURSES DE CETTE SESSION</div>
        {history.length === 0 && (
          <p className="text-xl text-[#3a3a3a]">Aucune course terminée pour l’instant.</p>
        )}
        {history.map((h, i) => (
          <div
            key={i}
            className="flex items-center justify-between border-b-2 border-dotted border-[#8b8b8b] py-1 text-xl"
          >
            <span>Salle {h.code}</span>
            <span className="text-[#3a3a3a]">{Math.round(h.wpm)} MPM</span>
            <span className="text-[#3a3a3a]">{Math.round(h.accuracy)} %</span>
          </div>
        ))}
      </PixelPanel>
    </div>
  );
}
