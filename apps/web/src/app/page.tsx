import { redirect } from "next/navigation";

// La raíz lleva al panel; el middleware redirige al login si no hay sesión.
export default function HomePage() {
  redirect("/dashboard");
}
