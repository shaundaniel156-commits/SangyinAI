-- A third question type: worked out on paper and uploaded as a photo.
ALTER TYPE "QuestionType" ADD VALUE 'written_work';

-- The uploaded photo for one written_work question, with the AI's marking.
CREATE TABLE "PracticeUpload" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "correct" BOOLEAN,
    "feedback" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeUpload_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PracticeUpload_assignmentId_questionId_key" ON "PracticeUpload"("assignmentId", "questionId");

ALTER TABLE "PracticeUpload" ADD CONSTRAINT "PracticeUpload_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "PracticeAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
