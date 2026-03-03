"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Theme = "light" | "dark";

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: "light", toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboardRoute = pathname?.startsWith("/dashboard") ?? false;
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem("bc_theme") as Theme | null) === "dark"
      ? "dark"
      : "light";
  });

  // Keep localStorage and <html>.dark in sync with theme.
  // Also re-apply on route changes to recover from route-specific class mutations.
  useEffect(() => {
    localStorage.setItem("bc_theme", theme);
    document.documentElement.classList.toggle(
      "dark",
      isDashboardRoute && theme === "dark",
    );
  }, [theme, pathname, isDashboardRoute]);

  function toggle() {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
