import type { Metadata, Viewport } from "next";
import { Capriola, Newsreader } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const capriola = Capriola({ variable: "--font-capriola", subsets: ["latin"], weight: "400" });
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Tally",
  description: "See which companies your money reaches, and how that matches what you care about.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFBF3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${capriola.variable} ${newsreader.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
