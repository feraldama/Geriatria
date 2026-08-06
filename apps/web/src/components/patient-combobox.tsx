"use client";

import * as React from "react";
import { Search, Check, X, UserPlus, Loader2 } from "lucide-react";
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
  // Los inyecta <Field> (ver components/ui/field.tsx).
  "aria-describedby"?: string;
  "aria-required"?: boolean;
  /** Si se pasa, muestra la opción "Crear paciente nuevo" en el desplegable. */
  onCreateNew?: (query: string) => void;
}

/**
 * Selector de paciente con búsqueda (consulta al backend con debounce).
 * Accesible: combobox con listbox de resultados, navegable con flechas.
 */
export function PatientCombobox({
  id,
  value,
  selectedName,
  onChange,
  invalid,
  onCreateNew,
  "aria-describedby": ariaDescribedBy,
  "aria-required": ariaRequired,
}: PatientComboboxProps) {
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [display, setDisplay] = React.useState(selectedName ?? "");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const debounced = useDebounce(query.trim());
  const { data, isFetching } = usePatients(debounced, 1, 8);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const baseId = React.useId();
  const listboxId = `${baseId}-listbox`;

  // Si el nombre seleccionado cambia desde fuera (p. ej. al cargar la cita a
  // editar), hay que reflejarlo: antes solo se leía en el primer render.
  React.useEffect(() => {
    setDisplay(selectedName ?? "");
  }, [selectedName]);

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

  const results = data?.data ?? [];

  // Mientras la búsqueda está en curso no se sabe si hay resultados. Mostrar
  // "sin pacientes" + "crear nuevo" en ese momento invita a dar de alta un
  // paciente duplicado que en realidad sí existe.
  const searching = isFetching || debounced !== query.trim();
  const resolved = !searching && data !== undefined;

  // MISMA condición con la que se pinta el desplegable. Si `options` se
  // calculara sin ella, Enter con la búsqueda vacía seleccionaría el primer
  // paciente del listado general —uno que el usuario nunca vio— porque la
  // consulta devuelve resultados aunque no se haya escrito nada.
  const listVisible = open && debounced.length > 0;

  const options: { key: string; onSelect: () => void }[] = !listVisible
    ? []
    : [
        ...results.map((p) => ({
          key: p.id,
          onSelect: () => {
            const name = `${p.lastName}, ${p.firstName}`;
            onChange(p.id, name);
            setDisplay(name);
            setOpen(false);
          },
        })),
        ...(onCreateNew && resolved
          ? [
              {
                key: "__create__",
                onSelect: () => {
                  setOpen(false);
                  onCreateNew(debounced);
                },
              },
            ]
          : []),
      ];

  // Si llegan menos resultados que antes, el índice activo puede quedar fuera
  // de rango y Enter no haría nada.
  const safeIndex = options.length === 0 ? 0 : Math.min(activeIndex, options.length - 1);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [debounced, results.length]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || options.length === 0) {
      if (e.key === "ArrowDown") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === "Enter") {
      // Enter dentro de un formulario no debe enviarlo si hay una opción activa.
      e.preventDefault();
      options[safeIndex]?.onSelect();
    }
  }

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
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={
          listVisible && options[safeIndex] ? `${baseId}-opt-${options[safeIndex].key}` : undefined
        }
        aria-autocomplete="list"
        autoComplete="off"
        placeholder="Buscar paciente por nombre o documento…"
        className="pl-10"
        value={query}
        aria-invalid={invalid || undefined}
        aria-describedby={ariaDescribedBy}
        aria-required={ariaRequired}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {listVisible && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-card shadow-lg"
        >
          {results.map((p, index) => (
            <li
              key={p.id}
              id={`${baseId}-opt-${p.id}`}
              role="option"
              aria-selected={index === safeIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => options[index]?.onSelect()}
              className={cn(
                "flex cursor-pointer flex-col items-start px-3 py-2 text-left",
                index === safeIndex && "bg-muted",
              )}
            >
              <span className="font-medium">
                {p.lastName}, {p.firstName}
              </span>
              {p.documentId && (
                <span className="text-sm text-muted-foreground">Doc. {p.documentId}</span>
              )}
            </li>
          ))}

          {searching && (
            <li
              role="presentation"
              className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground"
            >
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Buscando…
            </li>
          )}

          {resolved && results.length === 0 && (
            <li role="presentation" className="px-3 py-3 text-sm text-muted-foreground">
              Sin pacientes para “{debounced}”.
            </li>
          )}

          {onCreateNew && resolved && (
            <li
              id={`${baseId}-opt-__create__`}
              role="option"
              aria-selected={safeIndex === options.length - 1}
              onMouseEnter={() => setActiveIndex(options.length - 1)}
              onClick={() => options[options.length - 1]?.onSelect()}
              className={cn(
                "flex cursor-pointer items-center gap-2 px-3 py-2.5 text-left font-medium text-primary",
                results.length > 0 && "border-t border-border",
                safeIndex === options.length - 1 && "bg-muted",
              )}
            >
              <UserPlus className="h-4 w-4" aria-hidden />
              Crear paciente nuevo
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
