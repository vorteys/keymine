"use client";

import { useRouter } from "next/navigation";
import { PixelButton } from "./ui";

export function LogoutButton() {
  const router = useRouter();
  async function onClick() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <PixelButton type="button" onClick={onClick} variant="slate" className="h-11 px-5 text-[11px]">
      SE DÉCONNECTER
    </PixelButton>
  );
}
