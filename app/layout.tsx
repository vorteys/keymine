import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/Providers";

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

export const metadata: Metadata = {
  title: "KeyMine",
  description: "Courses de frappe en temps réel pour la classe.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${pressStart.variable} ${vt323.variable}`}>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
