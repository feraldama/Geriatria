"use client";

import { useState } from "react";
import { Plus, ShieldCheck, Pencil, Users } from "lucide-react";
import { PERMISSION_DESCRIPTIONS, type RoleItem } from "@geriatria/schemas";
import { useRoles } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { RoleForm } from "@/components/role-form";

function permLabel(action: string): string {
  return PERMISSION_DESCRIPTIONS[action as keyof typeof PERMISSION_DESCRIPTIONS] ?? action;
}

export default function RolesPage() {
  const { data: roles, isLoading, isError } = useRoles();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoleItem | undefined>();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Roles y permisos</h1>
          <p className="text-muted-foreground">Los permisos se guardan en base de datos y son editables.</p>
        </div>
        <Button onClick={() => { setEditing(undefined); setFormOpen(true); }}>
          <Plus className="h-5 w-5" aria-hidden />
          Nuevo rol
        </Button>
      </div>

      {isError ? (
        <Card className="p-10 text-center text-destructive">No se pudieron cargar los roles.</Card>
      ) : isLoading ? (
        <p className="p-8 text-center text-muted-foreground">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-4">
          {roles?.map((role) => (
            <Card key={role.id}>
              <CardHeader className="flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
                    {role.name}
                    {role.isSystem && <Badge variant="outline">Sistema</Badge>}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" aria-hidden />
                    {role.userCount} {role.userCount === 1 ? "usuario" : "usuarios"}
                    {role.description ? ` · ${role.description}` : ""}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setEditing(role); setFormOpen(true); }}>
                  <Pencil className="h-4 w-4" aria-hidden />
                  Editar
                </Button>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {role.permissions.length === 0 ? (
                  <span className="text-sm text-muted-foreground">Sin permisos asignados.</span>
                ) : (
                  role.permissions.map((p) => (
                    <Badge key={p} variant="primary">
                      {permLabel(p)}
                    </Badge>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={formOpen}
        title={editing ? `Editar rol: ${editing.name}` : "Nuevo rol"}
        onClose={() => setFormOpen(false)}
        closeOnBackdrop={false}
        maxWidth="max-w-lg"
      >
        <RoleForm initial={editing} onSuccess={() => setFormOpen(false)} onCancel={() => setFormOpen(false)} />
      </Dialog>
    </div>
  );
}
