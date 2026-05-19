"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { applyTheme, loadTheme } from "@/lib/ui/theme";

export default function ThemeRouteSync() {
  const pathname = usePathname();

  useEffect(() => {
    applyTheme(loadTheme());
  }, [pathname]);

  return null;
}
