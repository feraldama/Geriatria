"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PERMISSIONS } from "@geriatria/schemas";
import { useCurrentUser, hasPermission } from "@/lib/auth";
import { cn } from "@/lib/utils";

/**
 * Sub-navegación de la ficha del paciente. Las secciones clínicas requieren
 * el permiso clinical:read (recepción solo ve "Ficha").
 */
export function PatientTabs({ patientId }: { patientId: string }) {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const canClinical = hasPermission(user, PERMISSIONS.CLINICAL_READ);

  const base = `/pacientes/${patientId}`;
  const tabs = [
    { href: base, label: "Ficha", show: true, exact: true },
    { href: `${base}/consultas`, label: "Consultas", show: canClinical },
    { href: `${base}/medicacion`, label: "Medicación", show: canClinical },
    { href: `${base}/vitales`, label: "Signos vitales", show: canClinical },
    { href: `${base}/escalas`, label: "Escalas", show: canClinical },
    { href: `${base}/documentos`, label: "Documentos", show: canClinical },
    { href: `${base}/linea-tiempo`, label: "Línea de tiempo", show: canClinical },
  ].filter((t) => t.show);

  return (
    <nav aria-label="Secciones del paciente" className="flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 px-4 py-2.5 text-base font-medium transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
