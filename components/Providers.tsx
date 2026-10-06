"use client";

import type { ReactNode } from "react";
import { LanguageProvider, type SiteLang } from "@/lib/i18n";
import { ViewerProvider, type Viewer } from "@/lib/viewer";

export function Providers({
  initialLang,
  viewer,
  children,
}: {
  initialLang: SiteLang;
  viewer: Viewer;
  children: ReactNode;
}) {
  return (
    <LanguageProvider initialLang={initialLang}>
      <ViewerProvider viewer={viewer}>{children}</ViewerProvider>
    </LanguageProvider>
  );
}
