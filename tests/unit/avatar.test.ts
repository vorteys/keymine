// @vitest-environment node
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { AVATAR_MAX_BYTES, AVATAR_SIZE, checkAvatarUpload, processAvatar, sniffImageType } from "@/lib/avatar";

// AUTH-04 / SEC-02 : validation du type réel et de la taille, redimensionnement.
const solid = (format: "png" | "jpeg" | "webp", width = 600, height = 300) =>
  sharp({ create: { width, height, channels: 3, background: { r: 200, g: 80, b: 40 } } })
    [format]()
    .toBuffer();

describe("détection du type réel (SEC-02)", () => {
  it("reconnaît JPEG, PNG et WebP d'après leur contenu", async () => {
    expect(sniffImageType(await solid("jpeg"))).toBe("jpeg");
    expect(sniffImageType(await solid("png"))).toBe("png");
    expect(sniffImageType(await solid("webp"))).toBe("webp");
  });

  it("refuse un fichier dont le contenu n'est pas une image acceptée, quel que soit son nom", () => {
    const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0]);
    expect(sniffImageType(html)).toBeNull();
    expect(sniffImageType(gif)).toBeNull();
    expect(checkAvatarUpload(html)).toEqual({ ok: false, reason: "bad_type" });
  });

  it("refuse un RIFF qui n'est pas du WebP (ex. WAV)", () => {
    const wav = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]);
    expect(sniffImageType(wav)).toBeNull();
  });
});

describe("taille maximale de 2 Mo (AUTH-04)", () => {
  it("accepte à la limite, refuse au-delà, refuse le vide", () => {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const atLimit = new Uint8Array(AVATAR_MAX_BYTES);
    atLimit.set(png);
    const over = new Uint8Array(AVATAR_MAX_BYTES + 1);
    over.set(png);
    expect(checkAvatarUpload(atLimit)).toEqual({ ok: true, type: "png" });
    expect(checkAvatarUpload(over)).toEqual({ ok: false, reason: "too_large" });
    expect(checkAvatarUpload(new Uint8Array())).toEqual({ ok: false, reason: "empty" });
  });
});

describe("redimensionnement (AUTH-04)", () => {
  it("produit un WebP carré de 256 px, quel que soit le format et les dimensions d'origine", async () => {
    for (const format of ["png", "jpeg", "webp"] as const) {
      const out = await processAvatar(await solid(format, 1200, 400));
      const meta = await sharp(out).metadata();
      expect(meta).toMatchObject({ format: "webp", width: AVATAR_SIZE, height: AVATAR_SIZE });
    }
  });

  it("agrandit aussi une petite image pour un affichage homogène", async () => {
    const meta = await sharp(await processAvatar(await solid("png", 40, 40))).metadata();
    expect(meta).toMatchObject({ width: AVATAR_SIZE, height: AVATAR_SIZE });
  });

  it("rejette une image corrompue (signature valide mais données tronquées)", async () => {
    const png = await solid("png");
    await expect(processAvatar(png.subarray(0, 30))).rejects.toThrow();
  });
});
