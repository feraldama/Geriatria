import "@tanstack/react-query";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      /**
       * La mutación ya informa el error por su cuenta (banner en el formulario
       * o toast propio). Evita el aviso global duplicado de providers.tsx.
       */
      errorHandledByCaller?: boolean;
    };
  }
}
