-- CreateTable
CREATE TABLE "LanguageAssessment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "naming" JSONB NOT NULL,
    "phrases" JSONB NOT NULL,
    "descriptionNotes" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,

    CONSTRAINT "LanguageAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LanguageAssessment_patientId_idx" ON "LanguageAssessment"("patientId");

-- CreateIndex
CREATE INDEX "LanguageAssessment_assessedAt_idx" ON "LanguageAssessment"("assessedAt");

-- CreateIndex
CREATE INDEX "LanguageAssessment_deletedAt_idx" ON "LanguageAssessment"("deletedAt");

-- AddForeignKey
ALTER TABLE "LanguageAssessment" ADD CONSTRAINT "LanguageAssessment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
