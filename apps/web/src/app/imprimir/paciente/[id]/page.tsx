"use client";

import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import {
  calculateAge,
  formatDate,
  SEX_LABELS,
  MARITAL_STATUS_LABELS,
  DEPENDENCY_LEVEL_LABELS,
  MEDICATION_ROUTE_LABELS,
  SCALE_DEFINITIONS,
  type AssessmentScaleItem,
} from "@geriatria/schemas";
import { usePatient } from "@/lib/patients";
import { useMedications } from "@/lib/medications";
import { useScales } from "@/lib/scales";
import { useCarePlan } from "@/lib/extras";

/**
 * Resumen imprimible del paciente (para derivaciones o para la familia).
 * Fuera del layout con sidebar: la propia página de impresión del navegador
 * permite "Guardar como PDF". El botón se oculta al imprimir (print:hidden).
 */
export default function ResumenImprimiblePage() {
  const { id } = useParams<{ id: string }>();
  const { data: p } = usePatient(id);
  const { data: meds } = useMedications(id);
  const { data: scales } = useScales(id);
  const { data: carePlan } = useCarePlan(id);

  if (!p) return <p className="p-8 text-muted-foreground">Cargando…</p>;

  const activeMeds = (meds ?? []).filter((m) => m.status === "ACTIVA");

  // Última escala aplicada por tipo.
  const latestByType = new Map<string, AssessmentScaleItem>();
  for (const s of scales ?? []) {
    if (!latestByType.has(s.type)) latestByType.set(s.type, s); // lista viene desc
  }

  return (
    <main className="mx-auto max-w-3xl bg-white p-8 text-[15px] text-foreground">
      {/* Encabezado + acción (la acción no se imprime) */}
      <div className="mb-6 flex items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Resumen clínico</h1>
          <p className="text-muted-foreground">Sistema de Geriatría · {formatDate(new Date())}</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-primary-foreground print:hidden"
        >
          <Printer className="h-5 w-5" aria-hidden />
          Imprimir / Guardar PDF
        </button>
      </div>

      <Section title="Datos del paciente">
        <Grid>
          <Row label="Nombre" value={`${p.firstName} ${p.lastName}`} />
          <Row label="Documento" value={p.documentId} />
          <Row label="Edad" value={`${calculateAge(p.birthDate)} años`} />
          <Row label="Fecha de nacimiento" value={formatDate(p.birthDate)} />
          <Row label="Sexo" value={SEX_LABELS[p.sex]} />
          <Row label="Estado civil" value={p.maritalStatus ? MARITAL_STATUS_LABELS[p.maritalStatus] : null} />
          <Row label="Teléfono" value={p.phone} />
          <Row label="Dirección" value={p.address} />
          <Row label="Vive con" value={p.livesWith} />
          <Row label="Dependencia" value={p.dependencyLevel ? DEPENDENCY_LEVEL_LABELS[p.dependencyLevel] : null} />
        </Grid>
      </Section>

      {p.allergies.length > 0 && (
        <Section title="Alergias">
          <p className="font-medium text-destructive">
            {p.allergies.map((a) => a.substance).join(" · ")}
          </p>
        </Section>
      )}

      {p.conditions.length > 0 && (
        <Section title="Condiciones crónicas">
          <ul className="list-disc pl-5">
            {p.conditions.map((c) => (
              <li key={c.id}>
                {c.name}
                {!c.active ? " (inactiva)" : ""}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Medicación activa">
        {activeMeds.length === 0 ? (
          <p className="text-muted-foreground">Sin medicación activa.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-1 pr-2 font-semibold">Fármaco</th>
                <th className="py-1 pr-2 font-semibold">Dosis</th>
                <th className="py-1 pr-2 font-semibold">Frecuencia</th>
                <th className="py-1 font-semibold">Vía</th>
              </tr>
            </thead>
            <tbody>
              {activeMeds.map((m) => (
                <tr key={m.id} className="border-b border-border/60">
                  <td className="py-1 pr-2">{m.drug}</td>
                  <td className="py-1 pr-2">{m.dose ?? "—"}</td>
                  <td className="py-1 pr-2">{m.frequency ?? "—"}</td>
                  <td className="py-1">{m.route ? MEDICATION_ROUTE_LABELS[m.route] : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {latestByType.size > 0 && (
        <Section title="Escalas (última valoración)">
          <ul className="flex flex-col gap-1">
            {[...latestByType.values()].map((s) => (
              <li key={s.id} className="flex justify-between">
                <span>{SCALE_DEFINITIONS[s.type]?.name ?? s.type}</span>
                <span className="tabular-nums">
                  {s.score}/{s.maxScore}
                  {s.interpretation ? ` · ${s.interpretation}` : ""} · {formatDate(s.appliedAt)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {carePlan && (carePlan.objectives || carePlan.indications || carePlan.nextControls) && (
        <Section title="Plan de cuidados">
          {carePlan.objectives && <Block label="Objetivos" value={carePlan.objectives} />}
          {carePlan.indications && <Block label="Indicaciones" value={carePlan.indications} />}
          {carePlan.nextControls && <Block label="Próximos controles" value={carePlan.nextControls} />}
          {carePlan.nextControlDate && (
            <p className="text-sm">Próximo control: {formatDate(carePlan.nextControlDate)}</p>
          )}
        </Section>
      )}

      <p className="mt-8 border-t border-border pt-3 text-xs text-muted-foreground">
        Documento generado automáticamente. Herramienta de apoyo; no sustituye el criterio clínico.
      </p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-2 font-heading text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-6 gap-y-1">{children}</dl>;
}
function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-2 border-b border-border/40 py-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value || "—"}</dd>
    </div>
  );
}
function Block({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2">
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap">{value}</p>
    </div>
  );
}
