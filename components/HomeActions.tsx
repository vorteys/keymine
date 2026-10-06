"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PixelButton } from "./ui";
import { useRoomEntry } from "./useRoomEntry";
import { useLanguage } from "@/lib/i18n";

/** JOIN-03: bouton « Faire une course » (partie rapide). */
export function QuickPlayButton({ className }: { className?: string }) {
  const router = useRouter();
  const { t } = useLanguage();
  const { run, pending, panel } = useRoomEntry((code) => router.push(`/jouer/${code}`));

  return (
    <>
      <PixelButton
        type="button"
        onClick={() => void run(() => fetch("/api/play/quick", { method: "POST" }))}
        variant="green"
        className={className}
      >
        {pending ? "..." : t("home.play")}
      </PixelButton>
      {panel}
    </>
  );
}

/** JOIN-01: rejoindre par code depuis la page d'accueil. */
export function JoinByCodeForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const [code, setCode] = useState("");
  const { run, pending, panel } = useRoomEntry((entered) => router.push(`/jouer/${entered}`));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    void run(async () => {
      const res = await fetch(`/api/lobbies/${trimmed}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      // On renvoie le code de la salle pour que le hook sache où naviguer.
      const body = (await res.clone().json().catch(() => ({}))) as Record<string, unknown>;
      return res.ok
        ? new Response(JSON.stringify({ ...body, code: trimmed }), { status: 200 })
        : res;
    });
  }

  return (
    <>
      <form className="flex items-stretch gap-3" onSubmit={onSubmit}>
        <input
          aria-label={t("entry.code_label")}
          placeholder={t("entry.code_placeholder")}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={8}
          className="pixel-slot font-pixel min-w-0 flex-grow px-4 text-lg tracking-[4px] text-white placeholder:text-white/60"
        />
        <PixelButton variant="slate" type="submit" className="w-32 shrink-0 text-sm sm:w-52">
          {pending ? "..." : t("entry.join")}
        </PixelButton>
      </form>
      {panel}
    </>
  );
}
