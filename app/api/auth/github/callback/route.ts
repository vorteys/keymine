import { NextResponse } from "next/server";
import { consumeOAuthState, loginOrCreateOAuthUser, siteUrl } from "@/lib/auth/oauth";

type GitHubUser = { id: number; login: string; avatar_url: string | null };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const loginError = () =>
    NextResponse.redirect(
      `${siteUrl()}/connexion?error=${encodeURIComponent("Échec de la connexion GitHub")}`,
    );

  const stateOk = await consumeOAuthState(state);
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!stateOk || !code || !clientId || !clientSecret) return loginError();

  try {
    const redirectUri = `${siteUrl()}/api/auth/github/callback`;
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) return loginError();
    const { access_token } = (await tokenRes.json()) as { access_token?: string };
    if (!access_token) return loginError();

    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${access_token}`, "User-Agent": "KeyMine" },
    });
    if (!userRes.ok) return loginError();
    const githubUser = (await userRes.json()) as GitHubUser;

    await loginOrCreateOAuthUser("github", {
      providerId: String(githubUser.id),
      username: githubUser.login,
      avatarUrl: githubUser.avatar_url,
    });

    return NextResponse.redirect(siteUrl());
  } catch {
    return loginError();
  }
}
