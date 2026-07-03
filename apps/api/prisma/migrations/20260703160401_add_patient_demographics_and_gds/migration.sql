-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('NINGUNA', 'PRIMARIA', 'SECUNDARIA', 'TERCIARIA', 'UNIVERSITARIA');

-- CreateEnum
CREATE TYPE "ExerciseLevel" AS ENUM ('SEDENTARIO', 'OCASIONAL', 'REGULAR');

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "birthPlace" TEXT,
ADD COLUMN     "education" "EducationLevel",
ADD COLUMN     "educationYears" INTEGER,
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "physicalExercise" "ExerciseLevel";

-- AlterTable
ALTER TABLE "SyndromeAssessment" ADD COLUMN     "gdsStage" INTEGER;
