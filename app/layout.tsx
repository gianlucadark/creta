import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Geist_Mono,
  Instrument_Sans,
} from "next/font/google";
import { CommandPalette } from "@/components/CommandPalette";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "Creta - Spazio interno",
    template: "%s - Creta",
  },
  description:
    "Spazio interno aziendale per news, strumenti, documenti e risorse operative.",
  // Sito interno condiviso via URL: fuori dai motori di ricerca.
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${instrumentSans.variable} ${geistMono.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <CommandPalette />
      </body>
    </html>
  );
}
