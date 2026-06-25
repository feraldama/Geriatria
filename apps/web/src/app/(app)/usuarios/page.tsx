"use client";

import { useState } from "react";
import { Plus, Search, Pencil, KeyRound, UserX } from "lucide-react";
import { formatDateTime, type UserListItem } from "@geriatria/schemas";
import { useUsers, useDeleteUser } from "@/lib/admin";
import { useDebounce } from "@/lib/use-debounce";
import { useCurrentUser } from "@/lib/auth";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn, type SortDir } from "@/components/ui/data-table";
import { UserForm } from "@/components/user-form";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default function UsuariosPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ by: string; dir: SortDir }>({ by: "name", dir: "asc" });
  const q = useDebounce(search.trim());
  const { data, isLoading, isError } = useUsers(q, page, sort);
  const { data: me } = useCurrentUser();
  const { toast } = useToast();
  const del = useDeleteUser();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserListItem | undefined>();
  const [resetUser, setResetUser] = useState<UserListItem | null>(null);
  const [deactivate, setDeactivate] = useState<UserListItem | null>(null);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (data?.pageSize ?? 20)));

  async function onConfirmDeactivate() {
    if (!deactivate) return;
    await del.mutateAsync(deactivate.id);
    toast(`${deactivate.name} fue desactivado`);
    setDeactivate(null);
  }

  const columns: DataTableColumn<UserListItem>[] = [
    { key: "name", header: "Nombre", sortable: true, cellClassName: "font-medium", render: (u) => u.name },
    { key: "email", header: "Correo", sortable: true, render: (u) => u.email },
    { key: "role", header: "Rol", render: (u) => u.role.name },
    {
      key: "active",
      header: "Estado",
      render: (u) =>
        u.active ? <Badge variant="accent">Activo</Badge> : <Badge variant="outline">Inactivo</Badge>,
    },
    {
      key: "lastLoginAt",
      header: "Último ingreso",
      sortable: true,
      render: (u) => (u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—"),
    },
    {
      key: "actions",
      header: "",
      render: (u) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => { setEditing(u); setFormOpen(true); }} aria-label={`Editar ${u.name}`}>
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setResetUser(u)} aria-label={`Restablecer contraseña de ${u.name}`}>
            <KeyRound className="h-4 w-4" aria-hidden />
          </Button>
          {u.id !== me?.id && (
            <Button variant="ghost" size="sm" onClick={() => setDeactivate(u)} aria-label={`Desactivar ${u.name}`}>
              <UserX className="h-4 w-4" aria-hidden />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Usuarios</h1>
          <p className="text-muted-foreground">
            {total} {total === 1 ? "usuario" : "usuarios"}
          </p>
        </div>
        <Button onClick={() => { setEditing(undefined); setFormOpen(true); }}>
          <Plus className="h-5 w-5" aria-hidden />
          Nuevo usuario
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          placeholder="Buscar por nombre o correo…"
          aria-label="Buscar usuarios"
          className="pl-10"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <Card className="overflow-hidden">
        {isError ? (
          <p className="p-8 text-center text-destructive">No se pudieron cargar los usuarios.</p>
        ) : isLoading ? (
          <p className="p-8 text-center text-muted-foreground">Cargando…</p>
        ) : data && data.data.length === 0 ? (
          <p className="p-10 text-center text-muted-foreground">Sin usuarios para “{q}”.</p>
        ) : (
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            rowKey={(u) => u.id}
            sortBy={sort.by}
            sortDir={sort.dir}
            onSort={(by, dir) => { setSort({ by, dir }); setPage(1); }}
          />
        )}
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Siguiente
          </Button>
        </div>
      )}

      <Dialog
        open={formOpen}
        title={editing ? "Editar usuario" : "Nuevo usuario"}
        onClose={() => setFormOpen(false)}
        closeOnBackdrop={false}
        maxWidth="max-w-lg"
      >
        <UserForm initial={editing} onSuccess={() => setFormOpen(false)} onCancel={() => setFormOpen(false)} />
      </Dialog>

      <Dialog
        open={!!resetUser}
        title="Restablecer contraseña"
        onClose={() => setResetUser(null)}
        closeOnBackdrop={false}
        maxWidth="max-w-md"
      >
        {resetUser && (
          <ResetPasswordForm
            userId={resetUser.id}
            userName={resetUser.name}
            onSuccess={() => setResetUser(null)}
            onCancel={() => setResetUser(null)}
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deactivate}
        title="¿Desactivar usuario?"
        description={deactivate ? `${deactivate.name} no podrá iniciar sesión. Es una baja lógica: se conserva la información.` : ""}
        confirmLabel="Desactivar"
        destructive
        loading={del.isPending}
        onConfirm={onConfirmDeactivate}
        onCancel={() => setDeactivate(null)}
      />
    </div>
  );
}
