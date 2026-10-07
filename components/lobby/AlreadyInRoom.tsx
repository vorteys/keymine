"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PixelButton, PixelPanel } from "@/components/ui";
import { useLanguage } from "@/lib/i18n";

// SALLE-06 : on ne crée pas une deuxième salle quand on est déjà dans une. Plutôt que de laisser remplir
// tout le formulaire pour être renvoyé ensuite, la page de création propose directement de retourner
// dans la salle en cours, ou de la quitter.

export function AlreadyInRoom({ code }: { code: string }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function leave() {
    setBusy(true);
    await fetch(`/api/lobbies/${code}/leave`, { method: "POST" }).catch(() => null);
    router.refresh();
    setBusy(false);
  }

  return (
    <PixelPanel className="max-w-2xl p-6">
      <h2 className="font-pixel mb-3 text-sm text-[#2b2b2b]">{t("create.in_room_title")}</h2>
      <p className="mb-5 text-2xl text-[#2b2b2b]">{t("create.in_room_text", { code })}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <PixelButton variant="green" href={`/jouer/${code}`} className="h-12 flex-1 px-5 text-xs">
          {t("create.in_room_back")}
        </PixelButton>
        <PixelButton
          variant="slate"
          onClick={() => void leave()}
          disabled={busy}
          className="h-12 flex-1 px-5 text-xs"
        >
          {t("create.in_room_leave")}
        </PixelButton>
      </div>
    </PixelPanel>
  );
}
