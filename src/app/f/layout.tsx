"use client";

import { useEffect } from "react";

// Public form layout — always forces light mode regardless of user's dashboard preference.
// ThemeProvider at root reads localStorage and may add 'dark' to <html>; we undo that here.
export default function PublicFormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  return <>{children}</>;
}
