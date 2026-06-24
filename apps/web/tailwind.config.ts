import type { Config } from "tailwindcss";

/**
 * Configuración de Tailwind alineada al design system generado por la skill
 * ui-ux-pro-max (estilo "Accessible & Ethical", paleta cian salud + verde).
 * Los colores se exponen como variables CSS en globals.css para poder
 * soportar tema claro/oscuro a futuro sin tocar este archivo.
 */
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        border: "var(--color-border)",
        input: "var(--color-border)",
        ring: "var(--color-ring)",
        primary: {
          DEFAULT: "var(--color-primary)",
          foreground: "var(--color-on-primary)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          foreground: "var(--color-foreground)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-on-primary)",
        },
        muted: {
          DEFAULT: "var(--color-muted)",
          foreground: "var(--color-muted-foreground)",
        },
        destructive: {
          DEFAULT: "var(--color-destructive)",
          foreground: "#FFFFFF",
        },
        card: {
          DEFAULT: "var(--color-card)",
          foreground: "var(--color-foreground)",
        },
        "row-hover": "var(--color-row-hover)",
      },
      fontFamily: {
        // Figtree para títulos, Noto Sans para texto (vía next/font).
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
