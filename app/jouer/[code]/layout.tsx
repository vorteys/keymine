import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/i18n-server";

export const generateMetadata = pageMetadata("title.lobby");

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
