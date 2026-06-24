import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "geriatria_session";

/**
 * Protección de rutas a nivel UX: si no hay cookie de sesión, redirige al
 * login; si hay sesión, evita volver al login. La validación real del token
 * la hace el backend en cada endpoint (fuente de verdad).
 */
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has(SESSION_COOKIE);
  const { pathname } = req.nextUrl;
  const isLogin = pathname === "/login";

  if (!hasSession && !isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (hasSession && isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Excluye assets estáticos y las llamadas a la API (que pasan por el proxy).
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
