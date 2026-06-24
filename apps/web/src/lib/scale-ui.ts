import type { ScaleLevel } from "@geriatria/schemas";

// Variante de Badge según el nivel clínico de la interpretación.
export const LEVEL_BADGE: Record<ScaleLevel, "accent" | "warning" | "destructive"> = {
  good: "accent",
  warning: "warning",
  bad: "destructive",
};
