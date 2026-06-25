"use client";

import { useState } from "react";
import type { RoleItem } from "@geriatria/schemas";
import { useCreateRole, useUpdateRole, usePermissions } from "@/lib/admin";
import { ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { CheckboxField } from "@/components/ui/checkbox";
import { ErrorAlert } from "@/components/ui/alert";

export function RoleForm({
  initial,
  onSuccess,
  onCancel,
}: {
  initial?: RoleItem;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!initial;
  const { data: permissions } = usePermissions();
  const create = useCreateRole();
  const update = useUpdateRole(initial?.id ?? "");
  const mutation = isEdit ? update : create;

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set(initial?.permissions ?? []));
  const [nameError, setNameError] = useState<string>();

  function toggle(action: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(action)) next.delete(action);
      else next.add(action);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setNameError("El nombre del rol es obligatorio");
      return;
    }
    setNameError(undefined);
    const payload = { name: name.trim(), description, permissions: [...selected] };
    try {
      if (isEdit) {
        await update.mutateAsync(payload);
        toast("Rol actualizado");
      } else {
        await create.mutateAsync(payload);
        toast("Rol creado");
      }
      onSuccess();
    } catch {
      /* error abajo */
    }
  }

  const serverError =
    mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? "No se pudo guardar el rol" : null;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {serverError && <ErrorAlert message={serverError} />}

      <Field label="Nombre del rol" htmlFor="r-name" required error={nameError}>
        <Input id="r-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!nameError} />
      </Field>
      <Field label="Descripción" htmlFor="r-desc">
        <Input id="r-desc" value={description ?? ""} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">Permisos</legend>
        <div className="grid gap-1 rounded-md border border-border p-3 sm:grid-cols-2">
          {permissions?.map((p) => (
            <CheckboxField
              key={p.action}
              id={`perm-${p.action}`}
              label={p.description}
              checked={selected.has(p.action)}
              onChange={() => toggle(p.action)}
            />
          ))}
        </div>
      </fieldset>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={mutation.isPending}>
          {isEdit ? "Guardar cambios" : "Crear rol"}
        </Button>
      </div>
    </form>
  );
}
