-- DropForeignKey
ALTER TABLE "Allergy" DROP CONSTRAINT "Allergy_patientId_fkey";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Caregiver" DROP CONSTRAINT "Caregiver_patientId_fkey";

-- DropForeignKey
ALTER TABLE "Condition" DROP CONSTRAINT "Condition_patientId_fkey";

-- DropForeignKey
ALTER TABLE "Patient" DROP CONSTRAINT "Patient_createdById_fkey";

-- DropIndex
DROP INDEX "Allergy_patientId_idx";

-- DropIndex
DROP INDEX "Appointment_deletedAt_idx";

-- DropIndex
DROP INDEX "Appointment_patientId_idx";

-- DropIndex
DROP INDEX "Appointment_scheduledAt_idx";

-- DropIndex
DROP INDEX "AssessmentScale_deletedAt_idx";

-- DropIndex
DROP INDEX "AssessmentScale_patientId_idx";

-- DropIndex
DROP INDEX "Caregiver_patientId_idx";

-- DropIndex
DROP INDEX "Condition_patientId_idx";

-- DropIndex
DROP INDEX "Consultation_date_idx";

-- DropIndex
DROP INDEX "Consultation_deletedAt_idx";

-- DropIndex
DROP INDEX "Consultation_patientId_idx";

-- DropIndex
DROP INDEX "Document_deletedAt_idx";

-- DropIndex
DROP INDEX "Document_patientId_idx";

-- DropIndex
DROP INDEX "LanguageAssessment_assessedAt_idx";

-- DropIndex
DROP INDEX "LanguageAssessment_deletedAt_idx";

-- DropIndex
DROP INDEX "LanguageAssessment_patientId_idx";

-- DropIndex
DROP INDEX "Medication_deletedAt_idx";

-- DropIndex
DROP INDEX "Medication_patientId_idx";

-- DropIndex
DROP INDEX "Medication_status_idx";

-- DropIndex
DROP INDEX "Patient_deletedAt_idx";

-- DropIndex
DROP INDEX "Patient_lastName_firstName_idx";

-- DropIndex
DROP INDEX "Patient_searchText_idx";

-- DropIndex
DROP INDEX "SyndromeAssessment_assessedAt_idx";

-- DropIndex
DROP INDEX "SyndromeAssessment_deletedAt_idx";

-- DropIndex
DROP INDEX "SyndromeAssessment_patientId_idx";

-- DropIndex
DROP INDEX "Vaccination_deletedAt_idx";

-- DropIndex
DROP INDEX "Vaccination_patientId_idx";

-- DropIndex
DROP INDEX "VitalSign_measuredAt_idx";

-- DropIndex
DROP INDEX "VitalSign_patientId_idx";

-- AlterTable
ALTER TABLE "Allergy" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CarePlan" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Caregiver" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Condition" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Permission" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "VitalSign" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "temperature" SET DATA TYPE DECIMAL(4,1),
ALTER COLUMN "weight" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "height" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "bmi" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "calfCircumference" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "gripStrength" SET DATA TYPE DECIMAL(5,2);

-- CreateTable
CREATE TABLE "ConsultationRevision" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "physicalExam" JSONB,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedById" TEXT,

    CONSTRAINT "ConsultationRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsultationRevision_consultationId_editedAt_idx" ON "ConsultationRevision"("consultationId", "editedAt");

-- CreateIndex
CREATE INDEX "Allergy_patientId_deletedAt_idx" ON "Allergy"("patientId", "deletedAt");

-- CreateIndex
CREATE INDEX "Appointment_deletedAt_scheduledAt_idx" ON "Appointment"("deletedAt", "scheduledAt");

-- CreateIndex
CREATE INDEX "Appointment_patientId_deletedAt_scheduledAt_idx" ON "Appointment"("patientId", "deletedAt", "scheduledAt");

-- CreateIndex
CREATE INDEX "AssessmentScale_patientId_deletedAt_type_appliedAt_idx" ON "AssessmentScale"("patientId", "deletedAt", "type", "appliedAt");

-- CreateIndex
CREATE INDEX "AssessmentScale_createdById_idx" ON "AssessmentScale"("createdById");

-- CreateIndex
CREATE INDEX "AuditLog_resource_resourceId_createdAt_idx" ON "AuditLog"("resource", "resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "CarePlan_nextControlDate_idx" ON "CarePlan"("nextControlDate");

-- CreateIndex
CREATE INDEX "CarePlan_createdById_idx" ON "CarePlan"("createdById");

-- CreateIndex
CREATE INDEX "Caregiver_patientId_deletedAt_idx" ON "Caregiver"("patientId", "deletedAt");

-- CreateIndex
CREATE INDEX "Condition_patientId_deletedAt_idx" ON "Condition"("patientId", "deletedAt");

-- CreateIndex
CREATE INDEX "Consultation_patientId_deletedAt_date_idx" ON "Consultation"("patientId", "deletedAt", "date");

-- CreateIndex
CREATE INDEX "Consultation_createdById_idx" ON "Consultation"("createdById");

-- CreateIndex
CREATE INDEX "Document_patientId_deletedAt_studyDate_idx" ON "Document"("patientId", "deletedAt", "studyDate");

-- CreateIndex
CREATE INDEX "Document_createdById_idx" ON "Document"("createdById");

-- CreateIndex
CREATE INDEX "LanguageAssessment_patientId_deletedAt_assessedAt_idx" ON "LanguageAssessment"("patientId", "deletedAt", "assessedAt");

-- CreateIndex
CREATE INDEX "LanguageAssessment_createdById_idx" ON "LanguageAssessment"("createdById");

-- CreateIndex
CREATE INDEX "Medication_patientId_deletedAt_status_idx" ON "Medication"("patientId", "deletedAt", "status");

-- CreateIndex
CREATE INDEX "Medication_createdById_idx" ON "Medication"("createdById");

-- CreateIndex
CREATE INDEX "Patient_deletedAt_lastName_firstName_idx" ON "Patient"("deletedAt", "lastName", "firstName");

-- CreateIndex
CREATE INDEX "SyndromeAssessment_patientId_deletedAt_assessedAt_idx" ON "SyndromeAssessment"("patientId", "deletedAt", "assessedAt");

-- CreateIndex
CREATE INDEX "SyndromeAssessment_createdById_idx" ON "SyndromeAssessment"("createdById");

-- CreateIndex
CREATE INDEX "Vaccination_patientId_deletedAt_doseDate_idx" ON "Vaccination"("patientId", "deletedAt", "doseDate");

-- CreateIndex
CREATE INDEX "Vaccination_createdById_idx" ON "Vaccination"("createdById");

-- CreateIndex
CREATE INDEX "VitalSign_patientId_deletedAt_measuredAt_idx" ON "VitalSign"("patientId", "deletedAt", "measuredAt");

-- CreateIndex
CREATE INDEX "VitalSign_consultationId_idx" ON "VitalSign"("consultationId");

-- CreateIndex
CREATE INDEX "VitalSign_createdById_idx" ON "VitalSign"("createdById");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caregiver" ADD CONSTRAINT "Caregiver_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Condition" ADD CONSTRAINT "Condition_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allergy" ADD CONSTRAINT "Allergy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationRevision" ADD CONSTRAINT "ConsultationRevision_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationRevision" ADD CONSTRAINT "ConsultationRevision_editedById_fkey" FOREIGN KEY ("editedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitalSign" ADD CONSTRAINT "VitalSign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentScale" ADD CONSTRAINT "AssessmentScale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyndromeAssessment" ADD CONSTRAINT "SyndromeAssessment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageAssessment" ADD CONSTRAINT "LanguageAssessment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarePlan" ADD CONSTRAINT "CarePlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ─────────────────────────────────────────────────────────────────────────
-- Ajustes que Prisma no puede expresar en el schema.
-- ─────────────────────────────────────────────────────────────────────────

-- Búsqueda de pacientes: se consulta con LIKE '%texto%', que un índice B-tree
-- no puede usar. pg_trgm + GIN sí resuelve búsquedas por infijo.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "Patient_searchText_trgm_idx"
  ON "Patient" USING GIN ("searchText" gin_trgm_ops);

-- Búsqueda de usuarios por nombre/email (contains, case-insensitive).
CREATE INDEX IF NOT EXISTS "User_name_trgm_idx"
  ON "User" USING GIN (lower("name") gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "User_email_trgm_idx"
  ON "User" USING GIN (lower("email") gin_trgm_ops);

-- La cédula es el identificador natural del paciente: dos fichas con la misma
-- cédula son historias clínicas duplicadas, un riesgo asistencial real.
-- Índice parcial: solo sobre pacientes vigentes y con documento cargado.
--
-- ⚠️  Si la base ya tiene cédulas repetidas —posible hasta esta migración— la
-- creación del índice falla y Postgres revierte TODA la migración. Revisalo
-- antes de aplicarla en producción:
--
--   SELECT "documentId", count(*)
--   FROM "Patient"
--   WHERE "documentId" IS NOT NULL AND "deletedAt" IS NULL
--   GROUP BY "documentId" HAVING count(*) > 1;
--
-- Cada grupo hay que resolverlo a mano (fusionar las fichas o dar de baja la
-- incorrecta): unificar historias clínicas no es algo que deba hacer un script.
CREATE UNIQUE INDEX IF NOT EXISTS "Patient_documentId_active_key"
  ON "Patient" ("documentId")
  WHERE "documentId" IS NOT NULL AND "deletedAt" IS NULL;
