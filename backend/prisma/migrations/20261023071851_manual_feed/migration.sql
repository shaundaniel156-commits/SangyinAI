-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('primary', 'secondary', 'university', 'mixed');

-- CreateEnum
CREATE TYPE "ReferenceKind" AS ENUM ('notes', 'scheme_of_work', 'lesson_plan', 'course_outline', 'past_paper', 'other');

-- AlterEnum
ALTER TYPE "Framework" ADD VALUE 'institution';

-- AlterTable
ALTER TABLE "CurriculumLevel" ADD COLUMN     "programmeId" TEXT,
ADD COLUMN     "schoolId" TEXT;

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "type" "InstitutionType" NOT NULL DEFAULT 'primary';

-- The demo school teaches primary and lower secondary.
UPDATE "School" SET "type" = 'mixed' WHERE "id" = 'demo-school';

-- AlterTable
ALTER TABLE "SchoolClass" ADD COLUMN     "curriculumLevelId" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "regNumber" TEXT;

-- CreateTable
CREATE TABLE "Programme" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "award" TEXT,
    "years" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Programme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumSubject" (
    "id" TEXT NOT NULL,
    "levelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "term" TEXT,
    "creditUnits" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CurriculumSubject_pkey" PRIMARY KEY ("id")
);

-- Move each topic's subject into the new subjects table (same ids, so topics keep their link), then drop the old column.
INSERT INTO "CurriculumSubject" ("id", "levelId", "name", "position")
SELECT "subjectId", MIN("levelId"), MIN("subject"), MIN("position") FROM "CurriculumTopic" GROUP BY "subjectId";

ALTER TABLE "CurriculumTopic" DROP COLUMN "subject";

-- CreateTable
CREATE TABLE "ReferenceDocument" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdById" TEXT,
    "title" TEXT NOT NULL,
    "kind" "ReferenceKind" NOT NULL DEFAULT 'notes',
    "subject" TEXT,
    "level" TEXT,
    "filename" TEXT,
    "rightsConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferenceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceChunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "ReferenceChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankQuestion" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "createdById" TEXT,
    "subject" TEXT NOT NULL,
    "level" TEXT,
    "competency" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" TEXT[],
    "answer" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Programme_schoolId_code_key" ON "Programme"("schoolId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolId_regNumber_key" ON "Student"("schoolId", "regNumber");

-- AddForeignKey
ALTER TABLE "Programme" ADD CONSTRAINT "Programme_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolClass" ADD CONSTRAINT "SchoolClass_curriculumLevelId_fkey" FOREIGN KEY ("curriculumLevelId") REFERENCES "CurriculumLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumLevel" ADD CONSTRAINT "CurriculumLevel_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumLevel" ADD CONSTRAINT "CurriculumLevel_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "Programme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumSubject" ADD CONSTRAINT "CurriculumSubject_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "CurriculumLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumTopic" ADD CONSTRAINT "CurriculumTopic_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "CurriculumSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceDocument" ADD CONSTRAINT "ReferenceDocument_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceDocument" ADD CONSTRAINT "ReferenceDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferenceChunk" ADD CONSTRAINT "ReferenceChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ReferenceDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankQuestion" ADD CONSTRAINT "BankQuestion_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankQuestion" ADD CONSTRAINT "BankQuestion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

