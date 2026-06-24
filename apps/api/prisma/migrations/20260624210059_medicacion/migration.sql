-- CreateEnum
CREATE TYPE "MedicationRoute" AS ENUM ('ORAL', 'SUBLINGUAL', 'INTRAVENOSA', 'INTRAMUSCULAR', 'SUBCUTANEA', 'TOPICA', 'INHALATORIA', 'OFTALMICA', 'OTICA', 'RECTAL', 'OTRA');

-- CreateEnum
CREATE TYPE "MedicationStatus" AS ENUM ('ACTIVA', 'SUSPENDIDA');

-- CreateTable
CREATE TABLE "Medication" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "drug" TEXT NOT NULL,
    "dose" TEXT,
    "frequency" TEXT,
    "route" "MedicationRoute",
    "startDate" TIMESTAMP(3),
    "prescribedBy" TEXT,
    "status" "MedicationStatus" NOT NULL DEFAULT 'ACTIVA',
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "alertNote" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Medication_patientId_idx" ON "Medication"("patientId");

-- CreateIndex
CREATE INDEX "Medication_status_idx" ON "Medication"("status");

-- CreateIndex
CREATE INDEX "Medication_deletedAt_idx" ON "Medication"("deletedAt");

-- AddForeignKey
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
