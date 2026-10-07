"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PixelButton, PixelLabel } from "@/components/ui";
import { useLanguage } from "@/lib/i18n";

// AUTH-04 / AUTH-05 : modification du pseudonyme et de la photo de profil.
const ACCEPT = "image/jpeg,image/png,image/webp";

export function ProfileEditor({
  displayName,
  hasPhoto,
}: {
  displayName: string;
  hasPhoto: boolean;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const [name, setName] = useState(displayName);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: name }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) return setMessage({ kind: "error", text: data.error ?? t("err.generic") });
    setMessage({ kind: "ok", text: t("profile.saved_name") });
    router.refresh();
  }

  async function upload(file: File) {
    setMessage(null);
    // Contrôle rapide côté navigateur ; le serveur revérifie le type réel et la taille.
    if (file.size > 2 * 1024 * 1024) return setMessage({ kind: "error", text: t("err.too_large") });
    setBusy(true);
    const body = new FormData();
    body.set("file", file);
    const res = await fetch("/api/profile/avatar", { method: "POST", body });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (fileInput.current) fileInput.current.value = "";
    if (!res.ok) return setMessage({ kind: "error", text: data.error ?? t("err.generic") });
    setMessage({ kind: "ok", text: t("profile.saved_photo") });
    router.refresh();
  }

  async function removePhoto() {
    setBusy(true);
    setMessage(null);
    await fetch("/api/profile/avatar", { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex w-full flex-col gap-4 border-t-2 border-dotted border-[#8b8b8b] pt-4">
      <form onSubmit={saveName} className="flex flex-col gap-2">
        <label htmlFor="profile-name">
          <PixelLabel>{t("profile.edit_name")}</PixelLabel>
        </label>
        <div className="flex gap-2">
          <input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={3}
            maxLength={20}
            required
            className="pixel-slot min-w-0 flex-grow px-2.5 py-1.5 text-xl text-white"
          />
          <PixelButton type="submit" variant="green" className="h-10 px-3 text-[10px]">
            {t("profile.ok")}
          </PixelButton>
        </div>
      </form>

      <div className="flex flex-col gap-2">
        <PixelLabel>{t("profile.edit_photo")}</PixelLabel>
        {/* Le champ fichier natif est presque invisible : on le cache et un vrai bouton l'ouvre. */}
        <input
          id="profile-photo"
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          disabled={busy}
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
          className="hidden"
        />
        <PixelButton
          variant="gold"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
          className="h-11 self-start px-4 text-[10px]"
        >
          {t("profile.change_photo")}
        </PixelButton>
        <p className="text-lg text-[#3a3a3a]">{t("profile.photo_hint")}</p>
        {hasPhoto && (
          <button
            type="button"
            onClick={() => void removePhoto()}
            className="pixel-chip self-start text-lg"
          >
            {t("profile.photo_remove")}
          </button>
        )}
      </div>

      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={`text-xl ${message.kind === "error" ? "text-[#9b3a2e]" : "text-[#2f6b18]"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
