"use client";

import { useState } from "react";
import { UploadCloud } from "lucide-react";
import {
  DOCUMENT_CATEGORY,
  DOCUMENT_CATEGORY_LABELS,
  isValidDateString,
  formatFileSize,
  type DocumentCategory,
} from "@geriatria/schemas";
import { useUploadDocument } from "@/lib/documents";
import { ApiError } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/field";
import { DateInput } from "@/components/ui/date-input";
import { ErrorAlert } from "@/components/ui/alert";

const ACCEPT = ".pdf,image/png,image/jpeg,image/webp,image/gif,.dcm,application/dicom";

export function DocumentUploadForm({
  patientId,
  onSuccess,
  onCancel,
}: {
  patientId: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const upload = useUploadDocument(patientId);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("LABORATORIO");
  const [studyDate, setStudyDate] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ file?: string; title?: string; studyDate?: string }>({});

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    // Pre-cargamos el título con el nombre del archivo (sin extensión).
    if (f && !title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!file) errs.file = "Adjuntá un archivo";
    if (!title.trim()) errs.title = "El título es obligatorio";
    if (studyDate && !isValidDateString(studyDate)) errs.studyDate = "Fecha inválida (dd/mm/aaaa)";
    setErrors(errs);
    if (Object.keys(errs).length > 0 || !file) return;

    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title.trim());
    fd.append("category", category);
    if (studyDate) fd.append("studyDate", studyDate);
    if (notes.trim()) fd.append("notes", notes.trim());

    try {
      await upload.mutateAsync(fd);
      toast("Documento subido");
      onSuccess();
    } catch {
      /* error abajo */
    }
  }

  const serverError =
    upload.error instanceof ApiError
      ? upload.error.message
      : upload.error
        ? "No se pudo subir el documento"
        : null;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {serverError && <ErrorAlert message={serverError} />}

      <Field label="Archivo" htmlFor="d-file" required error={errors.file} hint="PDF, imagen o DICOM (máx. 25 MB)">
        <input
          id="d-file"
          type="file"
          accept={ACCEPT}
          onChange={onFileChange}
          aria-invalid={!!errors.file}
          className="block w-full text-base file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-4 file:text-primary-foreground hover:file:bg-primary/90"
        />
      </Field>
      {file && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <UploadCloud className="h-4 w-4" aria-hidden />
          {file.name} · {formatFileSize(file.size)}
        </p>
      )}

      <Field label="Título" htmlFor="d-title" required error={errors.title}>
        <Input id="d-title" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!errors.title} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Categoría" htmlFor="d-cat">
          <Select id="d-cat" value={category} onChange={(e) => setCategory(e.target.value as DocumentCategory)}>
            {DOCUMENT_CATEGORY.map((c) => (
              <option key={c} value={c}>
                {DOCUMENT_CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fecha de realización" htmlFor="d-date" hint="dd/mm/aaaa (opcional)" error={errors.studyDate}>
          <DateInput id="d-date" value={studyDate} onChange={setStudyDate} invalid={!!errors.studyDate} />
        </Field>
      </div>

      <Field label="Notas" htmlFor="d-notes">
        <Textarea id="d-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={upload.isPending}>
          Cancelar
        </Button>
        <Button type="submit" loading={upload.isPending}>
          Subir documento
        </Button>
      </div>
    </form>
  );
}
