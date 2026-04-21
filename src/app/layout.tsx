import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const aeonik = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-aeonik",
  display: "swap",
});

const gtSuper = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-gt-super",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bioceutica Creators",
  description: "Form builder & creator campaign management",
  icons: {
    icon: "/Small_logo.svg",
    shortcut: "/Small_logo.svg",
    apple: "/Small_logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${aeonik.variable} ${gtSuper.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased min-h-screen" suppressHydrationWarning>
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
