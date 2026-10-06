import { randomBytes } from "node:crypto";

/** SALLE-04 : jeton de 32 octets aléatoires (256 bits), en base64url (43 caractères). */
export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}
