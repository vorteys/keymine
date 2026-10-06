import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { getRequestLang } from "@/lib/i18n-server";
import { translate } from "@/lib/i18n-dictionary";

const pressStart = localFont({
  src: "./fonts/press-start-2p.woff2",
  variable: "--font-press-start",
  weight: "400",
  display: "swap",
});

const vt323 = localFont({
  src: "./fonts/vt323.woff2",
  variable: "--font-vt323",
  weight: "400",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getRequestLang();
  return {
    title: { default: "KeyMine", template: "%s · KeyMine" },
    description: translate(lang, "meta.description"),
  };
}

// DES-05: le thème est posé avant le premier rendu (pas de flash du mauvais
// thème). Priorité : choix enregistré, sinon préférence système.
const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem("km_theme");var t=(s==="light"||s==="dark")?s:(window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="dark";}})();`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await getRequestLang();
  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={`${pressStart.variable} ${vt323.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <Providers initialLang={lang}>{children}</Providers>
      </body>
    </html>
  );
}
