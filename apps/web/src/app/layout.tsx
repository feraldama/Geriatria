import type { Metadata, Viewport } from "next";
import { Figtree, Noto_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// Tipografías del design system: Figtree (títulos) + Noto Sans (cuerpo).
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});
const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sistema de Geriatría",
  description: "Gestión clínica para atención geriátrica longitudinal",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-font-size="md" className={`${figtree.variable} ${notoSans.variable}`}>
      <body>
        {/* Salto al contenido para usuarios de teclado/lector de pantalla. */}
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Saltar al contenido
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
