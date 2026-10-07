// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// AUTH-01 / SEC : le cookie de session est signé, httpOnly, et une valeur falsifiée est refusée.
type Stored = { value: string; options: Record<string, unknown> };
const jar = new Map<string, Stored>();

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)!.value } : undefined),
    set: (name: string, value: string, options: Record<string, unknown> = {}) => void jar.set(name, { value, options }),
    delete: (name: string) => void jar.delete(name),
  }),
}));

import { createSession, destroySession, readSession } from "@/lib/auth/session";

describe("session JWT", () => {
  beforeEach(() => {
    jar.clear();
    process.env.SESSION_SECRET = "secret-de-test-unitaire";
  });

  it("crée un cookie httpOnly signé et relit l'identité", async () => {
    await createSession({ userId: "u-1", username: "alice" }, false);
    const cookie = jar.get("km_session")!;
    expect(cookie.options.httpOnly).toBe(true);
    expect(cookie.options.sameSite).toBe("lax");
    expect(cookie.options.maxAge).toBeUndefined(); // cookie de session
    expect(await readSession()).toEqual({ userId: "u-1", username: "alice" });
  });

  it("« se souvenir de moi » donne une durée de vie de 30 jours", async () => {
    await createSession({ userId: "u-1", username: "alice" }, true);
    expect(jar.get("km_session")!.options.maxAge).toBe(60 * 60 * 24 * 30);
  });

  it("refuse un jeton falsifié ou signé avec un autre secret", async () => {
    await createSession({ userId: "u-1", username: "alice" }, false);
    const token = jar.get("km_session")!.value;
    jar.set("km_session", { value: `${token}x`, options: {} });
    expect(await readSession()).toBeNull();

    jar.set("km_session", { value: token, options: {} });
    process.env.SESSION_SECRET = "un-autre-secret";
    expect(await readSession()).toBeNull();
  });

  it("ne renvoie rien sans cookie, et la déconnexion l'efface", async () => {
    expect(await readSession()).toBeNull();
    await createSession({ userId: "u-1", username: "alice" }, false);
    await destroySession();
    expect(await readSession()).toBeNull();
  });
});
