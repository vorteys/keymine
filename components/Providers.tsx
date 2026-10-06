"use client";

import type { ReactNode } from "react";
import { LanguageProvider, type SiteLang } from "@/lib/i18n";

export function Providers({ initialLang, children }: { initialLang: SiteLang; children: ReactNode }) {
  return <LanguageProvider initialLang={initialLang}>{children}</LanguageProvider>;
}
