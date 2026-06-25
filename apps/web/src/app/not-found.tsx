import Link from "next/link";

/** Página 404 amigable. */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <p className="font-heading text-5xl font-semibold text-primary">404</p>
      <h1 className="font-heading text-xl font-semibold">Página no encontrada</h1>
      <p className="text-muted-foreground">La página que buscás no existe o fue movida.</p>
      <Link
        href="/dashboard"
        className="mt-2 inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-primary-foreground hover:bg-primary/90"
      >
        Ir al inicio
      </Link>
    </main>
  );
}
