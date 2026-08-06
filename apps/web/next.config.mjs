/**
 * Política de seguridad de contenido.
 *
 * Helmet solo cubre las respuestas de Express; el HTML y el JS de la app los
 * sirve Next, así que sin esto las páginas viajaban sin CSP ni protección
 * contra clickjacking. `unsafe-inline` en estilos es necesario para los estilos
 * embebidos de Next/Tailwind, y `unsafe-eval` solo en desarrollo (react-refresh).
 */
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // La API se consume por el mismo origen (rewrites), no hace falta abrir más.
  "connect-src 'self'",
  "frame-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Equivalente moderno de X-Frame-Options: nadie puede embeber la app.
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Los datos clínicos no deben filtrarse por el Referer hacia terceros.
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Compilamos el paquete compartido de esquemas/tipos desde el monorepo.
  transpilePackages: ["@geriatria/schemas"],
  // Proxy del frontend hacia la API: las llamadas a /api/v1/* se reenvían al
  // backend Express. Evita problemas de CORS/cookies en desarrollo y mantiene
  // un único origen para el navegador.
  async rewrites() {
    const apiUrl = process.env.API_INTERNAL_URL ?? "http://localhost:3027";
    return [{ source: "/api/v1/:path*", destination: `${apiUrl}/api/v1/:path*` }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
