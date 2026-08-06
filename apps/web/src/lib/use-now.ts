"use client";

import * as React from "react";

/**
 * Instante actual, disponible solo después de montar en el cliente.
 *
 * Las páginas de la app se prerenderizan en el build, así que un `new Date()`
 * evaluado durante el render queda congelado en el HTML con la fecha del build
 * (y provoca un desajuste de hidratación). Devolver `null` en el primer render
 * y el valor real después evita ambas cosas.
 */
export function useNow(): Date | null {
  const [now, setNow] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setNow(new Date());
  }, []);
  return now;
}
