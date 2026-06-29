-- CreateTable
CREATE TABLE "SyndromeAssessment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "present" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,

    CONSTRAINT "SyndromeAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyndromeAssessment_patientId_idx" ON "SyndromeAssessment"("patientId");

-- CreateIndex
CREATE INDEX "SyndromeAssessment_assessedAt_idx" ON "SyndromeAssessment"("assessedAt");

-- CreateIndex
CREATE INDEX "SyndromeAssessment_deletedAt_idx" ON "SyndromeAssessment"("deletedAt");

-- AddForeignKey
ALTER TABLE "SyndromeAssessment" ADD CONSTRAINT "SyndromeAssessment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
