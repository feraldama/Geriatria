-- CreateTable
CREATE TABLE "AssessmentScale" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answers" JSONB NOT NULL,
    "interpretation" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,

    CONSTRAINT "AssessmentScale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentScale_patientId_idx" ON "AssessmentScale"("patientId");

-- CreateIndex
CREATE INDEX "AssessmentScale_type_idx" ON "AssessmentScale"("type");

-- CreateIndex
CREATE INDEX "AssessmentScale_deletedAt_idx" ON "AssessmentScale"("deletedAt");

-- AddForeignKey
ALTER TABLE "AssessmentScale" ADD CONSTRAINT "AssessmentScale_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
