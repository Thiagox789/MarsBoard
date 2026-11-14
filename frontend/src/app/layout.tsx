import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppProvider } from "@/store/app-store";

const plexSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-plex-sans",
  weight: "100 900",
  display: "swap",
});

const plexMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-plex-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MARSBOARD · Consola de prospección de agua en Marte",
  description:
    "Identificación de depósitos de agua (hielo) en AP-1 para ISRU y producción de propelente CH₄/O₂. NASA Space Apps 2026.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${plexSans.variable} ${plexMono.variable} font-sans antialiased`}
      >
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
