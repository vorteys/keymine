"use client";

import { useCallback, useEffect, useState } from "react";
import { PixelButton, PixelPanel } from "@/components/ui";
import type { InviteView } from "@/lib/invites";

type ApiInvite = Omit<InviteView, "createdAt"> & { createdAt: string };

// SALLE-04 : l'hôte génère un lien par invité, le copie et suit son statut
// (non utilisé, utilisé par qui, révoqué). `refreshKey` change à chaque mise à jour
// en direct de la salle, ce qui recharge la liste.
export function InvitePanel({ code, refreshKey }: { code: string; refreshKey: unknown }) {
  const [invites, setInvites] = useState<ApiInvite[]>([]);
  const [label, setLabel] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/lobbies/${code}/invites`);
    if (res.ok) setInvites(((await res.json()) as { invites: ApiInvite[] }).invites);
  }, [code]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial puis rechargement à chaque évolution de la salle
    void reload();
  }, [reload, refreshKey]);

  async function generate() {
    setError(null);
    const res = await fetch(`/api/lobbies/${code}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Impossible de créer le lien.");
      return;
    }
    setLabel("");
    await reload();
  }

  async function revoke(inviteId: string) {
    await fetch(`/api/lobbies/${code}/invites`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId }),
    });
    await reload();
  }

  async function copy(token: string) {
    const url = `${window.location.origin}/rejoindre/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(token);
      setTimeout(() => setCopied((current) => (current === token ? null : current)), 2000);
    } catch {
      window.prompt("Copie ce lien :", url);
    }
  }

  const statusText = (i: ApiInvite) =>
    i.status === "used" ? `Utilisé par ${i.usedBy ?? "?"}` : i.status === "revoked" ? "Révoqué" : "Non utilisé";

  return (
    <PixelPanel className="flex flex-col gap-3 p-5">
      <h2 className="font-pixel text-sm text-[#2b2b2b]">LIENS D&rsquo;INVITATION</h2>
      <p className="text-xl text-[#3a3a3a]">
        Un lien par invité, à usage unique. Une salle privée ne s&rsquo;ouvre qu&rsquo;avec un lien.
      </p>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void generate();
        }}
      >
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={40}
          aria-label="Nom de l’invité (facultatif)"
          placeholder="Pour qui ? (facultatif)"
          className="pixel-slot min-w-0 flex-grow px-2.5 text-xl text-white"
        />
        <PixelButton type="submit" variant="gold" className="h-10 px-3 text-[10px]">
          GÉNÉRER
        </PixelButton>
      </form>
      {error && (
        <p role="alert" className="text-xl text-[#9b3a2e]">
          {error}
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {invites.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-2 border-b-2 border-dotted border-[#8b8b8b] pb-2">
            <div className="min-w-0 flex-grow leading-tight">
              <div className="truncate text-xl">{i.label ?? "Invité"}</div>
              <div className="text-lg text-[#3a3a3a]">{statusText(i)}</div>
            </div>
            {i.status !== "revoked" && (
              <>
                <button type="button" onClick={() => void copy(i.token)} className="pixel-chip text-lg">
                  {copied === i.token ? "Copié !" : "Copier"}
                </button>
                <button
                  type="button"
                  onClick={() => void revoke(i.id)}
                  aria-label={`Révoquer le lien ${i.label ?? ""}`}
                  className="pixel-chip text-lg"
                >
                  Révoquer
                </button>
              </>
            )}
          </li>
        ))}
        {invites.length === 0 && <li className="text-xl text-[#3a3a3a]">Aucun lien pour l&rsquo;instant.</li>}
      </ul>
    </PixelPanel>
  );
}
