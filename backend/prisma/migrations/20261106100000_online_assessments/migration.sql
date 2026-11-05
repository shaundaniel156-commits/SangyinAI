-- An assessment done online is linked to its place in the gradebook, and a formal one is done once.
ALTER TABLE "AiAssessment" ADD COLUMN "assessmentId" TEXT,
ADD COLUMN "oneAttempt" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "AiAssessment_assessmentId_key" ON "AiAssessment"("assessmentId");

ALTER TABLE "AiAssessment" ADD CONSTRAINT "AiAssessment_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
