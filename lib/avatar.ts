import sharp from "sharp";

// AUTH-04 / SEC-02 : photo de profil. Le type est déterminé par le contenu réel
// du fichier (signature binaire), jamais par son nom ni par l'en-tête envoyé par
// le navigateur ; la taille est vérifiée côté serveur ; l'image est décodée puis
// ré-encodée en WebP 256 × 256 (ce qui supprime aussi les métadonnées EXIF).

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 Mo
export const AVATAR_SIZE = 256;
export type ImageType = "jpeg" | "png" | "webp";

export function sniffImageType(bytes: Uint8Array): ImageType | null {
  const startsWith = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  if (startsWith([0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  // WebP : « RIFF » + taille + « WEBP »
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  return null;
}

export type AvatarCheck = { ok: true; type: ImageType } | { ok: false; reason: "too_large" | "empty" | "bad_type" };

export function checkAvatarUpload(bytes: Uint8Array): AvatarCheck {
  if (bytes.byteLength === 0) return { ok: false, reason: "empty" };
  if (bytes.byteLength > AVATAR_MAX_BYTES) return { ok: false, reason: "too_large" };
  const type = sniffImageType(bytes);
  return type ? { ok: true, type } : { ok: false, reason: "bad_type" };
}

/** Décode, recadre en carré, redimensionne et ré-encode en WebP. Lève une erreur si l'image est corrompue. */
export async function processAvatar(bytes: Uint8Array): Promise<Buffer> {
  return sharp(bytes, { limitInputPixels: 24_000_000, failOn: "error" })
    .rotate() // applique l'orientation EXIF avant de la supprimer
    .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" })
    .webp({ quality: 82 })
    .toBuffer();
}
