"use client";

import * as React from "react";
import { Search, Check, X } from "lucide-react";
import { usePatients } from "@/lib/patients";
import { useDebounce } from "@/lib/use-debounce";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PatientComboboxProps {
  id?: string;
  value: string; // patientId seleccionado
  selectedName?: string; // nombre a mostrar cuando ya hay selección
  onChange: (patientId: string, patientName: string) => void;
  invalid?: boolean;
}

/**
 * Selector de paciente con búsqueda (consulta al backend con debounce).
 * Accesible: input con listbox de resultados; cada opción es un botón.
 */
export function PatientCombobox({
  id,
  value,
  selectedName,
  onChange,
  invalid,
}: PatientComboboxProps) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [display, setDisplay] = React.useState(selectedName ?? "");
  const debounced = useDebounce(query.trim());
  const { data } = usePatients(debounced, 1, 8);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Cierra el desplegable al hacer clic fuera.
  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Si ya hay un paciente elegido, mostramos su nombre con opción de cambiar.
  if (value && display) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-input bg-muted/40 px-3 py-2">
        <span className="flex items-center gap-2">
          <Check className="h-4 w-4 text-accent" aria-hidden />
          {display}
        </span>
        <button
          type="button"
          onClick={() => {
            onChange("", "");
            setDisplay("");
            setQuery("");
            setOpen(true);
          }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Buscar paciente por nombre o documento…"
        className="pl-10"
        value={query}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && debounced.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-card shadow-lg"
        >
          {data && data.data.length > 0 ? (
            data.data.map((p) => (
              <li key={p.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  onClick={() => {
                    const name = `${p.lastName}, ${p.firstName}`;
                    onChange(p.id, name);
                    setDisplay(name);
                    setOpen(false);
                  }}
                  className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                >
                  <span className="font-medium">
                    {p.lastName}, {p.firstName}
                  </span>
                  {p.documentId && (
                    <span className="text-sm text-muted-foreground">Doc. {p.documentId}</span>
                  )}
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-3 text-sm text-muted-foreground">
              Sin pacientes para “{debounced}”.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
