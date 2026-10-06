import { NextResponse } from "next/server";
import { listPublicLobbies, publicLobbyFilters } from "@/lib/public-lobbies";
import { sweepLobbies } from "@/lib/lobby-sweep";

// JOIN-02 : liste des salles publiques, filtrable ; le client la rafraîchit seul.
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const filters = publicLobbyFilters.safeParse({
    language: params.language || undefined,
    complexity: params.complexity || undefined,
  });
  if (!filters.success) return NextResponse.json({ error: "Filtre invalide" }, { status: 400 });
  await sweepLobbies();
  return NextResponse.json({ lobbies: await listPublicLobbies(filters.data) }, { headers: { "Cache-Control": "no-store" } });
}
