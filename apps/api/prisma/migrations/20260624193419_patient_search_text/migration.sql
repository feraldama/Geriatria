-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "searchText" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "Patient_searchText_idx" ON "Patient"("searchText");
