"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { setUnauthorizedHandler } from "@/lib/api";
import { useToast } from "@/components/ui/toast";

/**
 * Reacciona a la expiración de la sesión.
 *
 * Sin esto, con el token vencido el usuario seguía navegando entre pantallas
 * que decían "no se pudo cargar", y al guardar una consulta larga recibía un
 * error genérico sin forma de volver a entrar. Ahora se lo lleva al login
 * conservando a dónde quería ir.
 */
export function SessionWatcher() {
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const { toast } = useToast();

  // La ruta actual se lee desde una ref: el handler se registra una sola vez.
  const pathnameRef = React.useRef(pathname);
  React.useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Evita disparar varias veces con las peticiones en paralelo que fallan
  // juntas. Se libera al llegar al login, para que una segunda expiración
  // (después de volver a entrar) también se maneje.
  const redirectingRef = React.useRef(false);
  React.useEffect(() => {
    if (pathname === "/login") redirectingRef.current = false;
  }, [pathname]);

  React.useEffect(() => {
    setUnauthorizedHandler(() => {
      const current = pathnameRef.current;
      // En el login el 401 es simplemente una credencial incorrecta.
      if (current === "/login" || redirectingRef.current) return;
      redirectingRef.current = true;

      void (async () => {
        // La cookie es httpOnly: solo el backend puede borrarla. Sin esto el
        // middleware ve la cookie vencida, cree que hay sesión y rebota
        // /login de vuelta a /dashboard, dejando al usuario encerrado.
        try {
          await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
        } catch {
          /* sin red igual seguimos al login */
        }
        qc.setQueryData(["me"], null);
        toast("Tu sesión expiró. Ingresá de nuevo.", "info");
        const next = encodeURIComponent(current ?? "/dashboard");
        router.replace(`/login?next=${next}`);
      })();
    });

    return () => setUnauthorizedHandler(null);
  }, [qc, router, toast]);

  return null;
}
