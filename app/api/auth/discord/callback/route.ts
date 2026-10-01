import { NextResponse } from "next/server";
import { consumeOAuthState, loginOrCreateOAuthUser, siteUrl } from "@/lib/auth/oauth";

type DiscordUser = { id: string; username: string; avatar: string | null };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const loginError = () =>
    NextResponse.redirect(
      `${siteUrl()}/connexion?error=${encodeURIComponent("Échec de la connexion Discord")}`,
    );

  const stateOk = await consumeOAuthState(state);
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!stateOk || !code || !clientId || !clientSecret) return loginError();

  try {
    const redirectUri = `${siteUrl()}/api/auth/discord/callback`;
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) return loginError();
    const { access_token } = (await tokenRes.json()) as { access_token: string };

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!userRes.ok) return loginError();
    const discordUser = (await userRes.json()) as DiscordUser;

    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null;

    await loginOrCreateOAuthUser("discord", {
      providerId: discordUser.id,
      username: discordUser.username,
      avatarUrl,
    });

    return NextResponse.redirect(siteUrl());
  } catch {
    return loginError();
  }
}
