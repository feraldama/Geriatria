"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Plus, FileText, Eye, Download, Trash2, ExternalLink } from "lucide-react";
import {
  formatDate,
  formatFileSize,
  isPreviewable,
  DOCUMENT_CATEGORY_LABELS,
  PERMISSIONS,
  type DocumentItem,
} from "@geriatria/schemas";
import { useDocuments, useDeleteDocument, documentFileUrl } from "@/lib/documents";
import { useCurrentUser, hasPermission } from "@/lib/auth";
import { useToast } from "@/components/ui/toast";
import { PatientSubHeader } from "@/components/patient-subheader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DocumentUploadForm } from "@/components/document-upload-form";

export default function DocumentosPage() {
  const { id } = useParams<{ id: string }>();
  const { data: docs, isLoading, isError } = useDocuments(id);
  const { data: user } = useCurrentUser();
  const canWrite = hasPermission(user, PERMISSIONS.CLINICAL_WRITE);
  const { toast } = useToast();
  const del = useDeleteDocument(id);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState<DocumentItem | null>(null);
  const [toDelete, setToDelete] = useState<DocumentItem | null>(null);

  async function onConfirmDelete() {
    if (!toDelete) return;
    await del.mutateAsync(toDelete.id);
    toast("Documento eliminado");
    setToDelete(null);
  }

  const previewKind = preview ? isPreviewable(preview.mimeType) : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PatientSubHeader patientId={id} />

      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-semibold">Documentos y estudios</h2>
        {canWrite && (
          <Button onClick={() => setUploadOpen(true)}>
            <Plus className="h-5 w-5" aria-hidden />
            Subir documento
          </Button>
        )}
      </div>

      {isError ? (
        <Card className="p-10 text-center text-destructive">No se pudieron cargar los documentos.</Card>
      ) : isLoading ? (
        <p className="p-8 text-center text-muted-foreground">Cargando…</p>
      ) : !docs || docs.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Todavía no hay documentos cargados.
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {docs.map((d) => (
            <Card key={d.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="flex min-w-0 gap-3">
                <FileText className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0">
                  <p className="font-medium">{d.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {d.fileName} · {formatFileSize(d.size)}
                    {d.studyDate ? ` · Realizado ${formatDate(d.studyDate)}` : ""}
                  </p>
                  {d.notes && <p className="mt-1 text-sm text-muted-foreground">{d.notes}</p>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="primary">{DOCUMENT_CATEGORY_LABELS[d.category]}</Badge>
                {isPreviewable(d.mimeType) && (
                  <Button variant="outline" size="sm" onClick={() => setPreview(d)}>
                    <Eye className="h-4 w-4" aria-hidden />
                    Ver
                  </Button>
                )}
                <a
                  href={documentFileUrl(id, d.id)}
                  download={d.fileName}
                  className="inline-flex min-h-9 items-center gap-1 rounded-md px-3 text-sm font-medium text-foreground hover:bg-muted"
                >
                  <Download className="h-4 w-4" aria-hidden />
                  Descargar
                </a>
                {canWrite && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setToDelete(d)}
                    aria-label={`Eliminar ${d.title}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Subida */}
      <Dialog
        open={uploadOpen}
        title="Subir documento"
        onClose={() => setUploadOpen(false)}
        closeOnBackdrop={false}
      >
        <DocumentUploadForm
          patientId={id}
          onSuccess={() => setUploadOpen(false)}
          onCancel={() => setUploadOpen(false)}
        />
      </Dialog>

      {/* Previsualización */}
      <Dialog
        open={!!preview}
        title={preview?.title ?? "Documento"}
        onClose={() => setPreview(null)}
        maxWidth="max-w-4xl"
      >
        {preview && (
          <div className="flex flex-col gap-3">
            <div className="flex justify-end">
              <a
                href={documentFileUrl(id, preview.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                Abrir en pestaña nueva
              </a>
            </div>
            {previewKind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={documentFileUrl(id, preview.id)}
                alt={preview.title}
                className="max-h-[70vh] w-full rounded-md object-contain"
              />
            ) : previewKind === "pdf" ? (
              <iframe
                src={documentFileUrl(id, preview.id)}
                title={preview.title}
                className="h-[70vh] w-full rounded-md border border-border"
              />
            ) : (
              <p className="text-muted-foreground">Este tipo de archivo no se puede previsualizar.</p>
            )}
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        title="¿Eliminar el documento?"
        description={toDelete ? `"${toDelete.title}" se quitará del listado y se borrará el archivo.` : ""}
        confirmLabel="Eliminar"
        destructive
        loading={del.isPending}
        onConfirm={onConfirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
