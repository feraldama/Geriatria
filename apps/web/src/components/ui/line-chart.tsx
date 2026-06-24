"use client";

import * as React from "react";
import { formatDate } from "@geriatria/schemas";

export interface LinePoint {
  date: string; // ISO
  value: number;
}

interface LineChartProps {
  points: LinePoint[]; // se asumen ordenados por fecha ascendente
  max: number;
  min?: number;
  /** Color del trazo (por defecto, primario). */
  color?: string;
  height?: number;
  ariaLabel?: string;
}

/**
 * Gráfico de líneas SVG, responsivo y sin dependencias. Muestra la evolución
 * de un valor en el tiempo, con puntos y tooltip al pasar el mouse. Pensado
 * para graficar la evolución de las escalas geriátricas.
 */
export function LineChart({
  points,
  max,
  min = 0,
  color = "var(--color-primary)",
  height = 160,
  ariaLabel,
}: LineChartProps) {
  const [hover, setHover] = React.useState<number | null>(null);

  // ViewBox de coordenadas internas; el SVG escala al ancho disponible.
  const W = 600;
  const H = height;
  const padL = 32;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const range = Math.max(1, max - min);

  const x = (i: number) =>
    padL + (points.length <= 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => padT + plotH - ((v - min) / range) * plotH;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.value)}`).join(" ");

  // Líneas de referencia horizontales (0%, 50%, 100% del rango).
  const gridValues = [min, min + range / 2, max];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label={ariaLabel ?? "Gráfico de evolución"}
      onMouseLeave={() => setHover(null)}
    >
      {/* Grilla y etiquetas del eje Y */}
      {gridValues.map((gv) => (
        <g key={gv}>
          <line
            x1={padL}
            x2={W - padR}
            y1={y(gv)}
            y2={y(gv)}
            stroke="var(--color-border)"
            strokeWidth={1}
          />
          <text x={4} y={y(gv) + 4} fontSize={11} fill="var(--color-muted-foreground)">
            {Math.round(gv)}
          </text>
        </g>
      ))}

      {/* Trazo */}
      {points.length > 1 && (
        <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
      )}

      {/* Puntos + zonas de hover */}
      {points.map((p, i) => (
        <g key={`${p.date}-${i}`}>
          <circle cx={x(i)} cy={y(p.value)} r={hover === i ? 6 : 4} fill={color} />
          {/* área invisible para facilitar el hover */}
          <rect
            x={x(i) - 16}
            y={padT}
            width={32}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        </g>
      ))}

      {/* Tooltip */}
      {hover !== null && points[hover] && (
        <g>
          <text
            x={Math.min(Math.max(x(hover), padL + 30), W - padR - 30)}
            y={y(points[hover]!.value) - 12}
            fontSize={13}
            fontWeight={600}
            textAnchor="middle"
            fill="var(--color-foreground)"
          >
            {points[hover]!.value} · {formatDate(points[hover]!.date)}
          </text>
        </g>
      )}
    </svg>
  );
}
