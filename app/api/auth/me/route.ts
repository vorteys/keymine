import { NextResponse } from "next/server";
import { peekIdentity } from "@/lib/auth/identity";

export async function GET() {
  const identity = await peekIdentity();
  return NextResponse.json({ identity });
}
