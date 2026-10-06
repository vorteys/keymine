import { NextResponse } from "next/server";
import { getIdentity } from "@/lib/auth/identity";
import { checkAvatarUpload, processAvatar } from "@/lib/avatar";
import { db } from "@/lib/db";

const REFUSALS = {
  too_large: ["La photo dépasse 2 Mo.", 413],
  empty: ["Aucun fichier reçu.", 400],
  bad_type: ["Format non accepté : JPEG, PNG ou WebP seulement.", 415],
} as const;

// AUTH-04 : téléversement de la photo de profil (comptes seulement, AUTH-03).
export async function POST(request: Request) {
  const identity = await getIdentity();
  if (!identity || identity.kind !== "user") {
    return NextResponse.json({ error: "Connexion requise", code: "account_required" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: REFUSALS.empty[0] }, { status: 400 });
  // Refus avant même de lire le corps si la taille annoncée est déjà trop grande.
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: REFUSALS.too_large[0], code: "too_large" }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkAvatarUpload(bytes);
  if (!check.ok) {
    const [error, status] = REFUSALS[check.reason];
    return NextResponse.json({ error, code: check.reason }, { status });
  }

  let image: Buffer;
  try {
    image = await processAvatar(bytes);
  } catch {
    return NextResponse.json({ error: "Image illisible ou corrompue.", code: "bad_image" }, { status: 422 });
  }

  const now = new Date();
  const url = `/api/avatars/${identity.userId}?v=${now.getTime()}`;
  await db
    .updateTable("users")
    .set({ avatar_data: image, avatar_updated_at: now, avatar_url: url, avatar_source: "upload" })
    .where("id", "=", identity.userId)
    .execute();
  return NextResponse.json({ ok: true, avatarUrl: url });
}

// Retire la photo téléversée (retour à l'avatar généré).
export async function DELETE() {
  const identity = await getIdentity();
  if (!identity || identity.kind !== "user") {
    return NextResponse.json({ error: "Connexion requise", code: "account_required" }, { status: 401 });
  }
  await db
    .updateTable("users")
    .set({ avatar_data: null, avatar_updated_at: null, avatar_url: null })
    .where("id", "=", identity.userId)
    .execute();
  return NextResponse.json({ ok: true });
}
