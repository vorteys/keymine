import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/i18n-server";

export const generateMetadata = pageMetadata("title.invite");

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
