"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PixelButton } from "./ui";

export function QuickPlayButton({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    try {
      const res = await fetch("/api/play/quick", { method: "POST" });
      const data = await res.json();
      if (res.ok) router.push(`/jouer/${data.code}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <PixelButton type="button" onClick={onClick} variant="green" className={className}>
      {pending ? "..." : "JOUER"}
    </PixelButton>
  );
}

export function JoinByCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed) router.push(`/jouer/${trimmed.toUpperCase()}`);
  }

  return (
    <form className="flex items-stretch gap-3" onSubmit={onSubmit}>
      <input
        aria-label="Code de la course"
        placeholder="CODE"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="pixel-slot font-pixel flex-grow px-4 text-lg tracking-[4px] text-white placeholder:text-white/60"
      />
      <PixelButton variant="slate" type="submit" className="w-52 text-sm">
        ENTRER
      </PixelButton>
    </form>
  );
}
