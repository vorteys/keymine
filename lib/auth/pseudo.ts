import { z } from "zod";

// AUTH-02: pseudonyme d'invité, 3 à 20 caractères. Séparé de guest.ts pour
// pouvoir être testé sans dépendre de next/headers.
export const guestPseudoSchema = z
  .string()
  .trim()
  .min(3, "3 caractères minimum")
  .max(20, "20 caractères maximum")
  .regex(/^[\p{L}\p{N}_ .-]+$/u, "Lettres, chiffres, espaces, _ . - seulement");
