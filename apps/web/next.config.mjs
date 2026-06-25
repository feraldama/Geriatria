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
};

export default nextConfig;
