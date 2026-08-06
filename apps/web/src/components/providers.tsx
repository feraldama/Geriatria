"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider, MutationCache } from "@tanstack/react-query";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";
import { SessionWatcher } from "@/components/session-watcher";

/** Provee TanStack Query y el sistema de toasts a toda la app. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <QueryProvider>
        <SessionWatcher />
        {children}
      </QueryProvider>
    </ToastProvider>
  );
}

/**
 * El QueryClient vive dentro del ToastProvider para poder avisar de los errores.
 *
 * Cualquier mutación que falle muestra un toast, incluso si quien la disparó no
 * puso su propio manejo: antes, un borrado o un guardado que fallaba dejaba el
 * spinner girando y el usuario creía que había funcionado.
 */
function QueryProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();

  // El toast se lee desde una ref para no recrear el QueryClient en cada render.
  const toastRef = React.useRef(toast);
  React.useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            // Reintentar un 401/403/404 no sirve de nada y demora el mensaje.
            retry: (failureCount, error) => {
              if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
                return false;
              }
              return failureCount < 1;
            },
          },
        },
        mutationCache: new MutationCache({
          onError: (error, _vars, _ctx, mutation) => {
            // El 401 lo maneja SessionWatcher con su propio aviso.
            if (error instanceof ApiError && error.status === 401) return;

            // Solo avisamos si nadie más lo hace. Los formularios muestran el
            // error en un banner y las acciones sueltas tienen su propio
            // toast; sin esta marca el usuario veía el mismo mensaje dos
            // veces, arriba y abajo de la pantalla.
            if (mutation.meta?.errorHandledByCaller) return;

            const message =
              error instanceof ApiError ? error.message : "No se pudo completar la operación";
            toastRef.current(message, "error");
          },
        }),
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
