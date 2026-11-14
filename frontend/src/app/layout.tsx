import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/store/app-store";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-plex-sans",
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
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
