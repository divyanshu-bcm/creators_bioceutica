import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Bioceutica Form Builder",
  description: "Create and manage forms",
  icons: {
    icon: "/Small_logo.svg",
    shortcut: "/Small_logo.svg",
    apple: "/Small_logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen" suppressHydrationWarning>
        <Script id="strip-bis-skin-checked" strategy="beforeInteractive">
          {`document.querySelectorAll('[bis_skin_checked]').forEach(function (element) {
  element.removeAttribute('bis_skin_checked');
});`}
        </Script>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
