"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Users,
  UserCog,
  ShieldCheck,
  ScrollText,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { useCurrentUser, useLogout, hasPermission } from "@/lib/auth";
import { PERMISSIONS } from "@geriatria/schemas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
}

// La navegación se filtra por permisos: el frontend oculta lo que el usuario
// no puede hacer (la validación real está en el backend).
const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Agenda de hoy", icon: LayoutDashboard },
  { href: "/pacientes", label: "Pacientes", icon: Users, permission: PERMISSIONS.PATIENT_READ },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, permission: PERMISSIONS.APPOINTMENT_READ },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/usuarios", label: "Usuarios", icon: UserCog, permission: PERMISSIONS.USER_MANAGE },
  { href: "/roles", label: "Roles", icon: ShieldCheck, permission: PERMISSIONS.ROLE_MANAGE },
  { href: "/auditoria", label: "Auditoría", icon: ScrollText, permission: PERMISSIONS.AUDIT_READ },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();
  const logout = useLogout();

  // Si la sesión ya no es válida (cookie presente pero token vencido), el
  // backend responde 401 y `user` queda en null: volvemos al login.
  useEffect(() => {
    if (!isLoading && user === null) router.replace("/login");
  }, [isLoading, user, router]);

  // Aplica la preferencia de tamaño de fuente del usuario al documento.
  useEffect(() => {
    if (user?.preferences?.fontSize) {
      document.documentElement.dataset.fontSize = user.preferences.fontSize;
    }
  }, [user]);

  const visible = (i: NavItem) => !i.permission || hasPermission(user, i.permission);
  const mainItems = MAIN_NAV.filter(visible);
  const adminItems = ADMIN_NAV.filter(visible);

  async function onLogout() {
    await logout.mutateAsync();
    router.replace("/login");
  }

  function renderItem(item: NavItem) {
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-11 items-center gap-3 rounded-md px-3 text-base transition-colors",
          active ? "bg-primary/10 font-medium text-primary" : "text-foreground hover:bg-muted",
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
        {item.label}
      </Link>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* Barra lateral (navegación principal, sidebar en pantallas grandes). */}
      <aside className="flex shrink-0 flex-col border-b border-border bg-card md:w-64 md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-6 py-5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Stethoscope className="h-5 w-5" aria-hidden />
          </span>
          <span className="font-heading text-lg font-semibold">Geriatría</span>
        </div>
        <nav aria-label="Navegación principal" className="flex flex-wrap gap-1 px-3 pb-3 md:flex-col md:flex-nowrap">
          {mainItems.map(renderItem)}

          {adminItems.length > 0 && (
            <>
              <p className="mt-3 px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Administración
              </p>
              {adminItems.map(renderItem)}
            </>
          )}
        </nav>
      </aside>

      {/* Columna principal: topbar + contenido. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-card px-6 py-3">
          {/* El nombre lleva al perfil propio. */}
          <Link
            href="/perfil"
            className="min-w-0 rounded-md px-2 py-1 transition-colors hover:bg-muted"
            aria-label="Mi perfil"
          >
            <p className="truncate font-medium">{user?.name ?? "—"}</p>
            <p className="truncate text-sm text-muted-foreground">{user?.role.name ?? ""}</p>
          </Link>
          <Button variant="outline" size="sm" onClick={onLogout} loading={logout.isPending}>
            <LogOut className="h-4 w-4" aria-hidden />
            Cerrar sesión
          </Button>
        </header>
        <main id="contenido" className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
