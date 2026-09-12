-- CreateEnum
CREATE TYPE "MaturityLevel" AS ENUM ('NEEDS_STRENGTHENING', 'IN_PROGRESS', 'ADVANCED');

-- CreateEnum
CREATE TYPE "Dimension" AS ENUM ('FORMALIZATION', 'ACCOUNTING', 'FUNDING');

-- CreateTable
CREATE TABLE "diagnostic_submissions" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scoring_engine_version" TEXT NOT NULL DEFAULT 'v1',
    "formalization_score" DOUBLE PRECISION NOT NULL,
    "accounting_raw_score" DOUBLE PRECISION NOT NULL,
    "accounting_final_score" DOUBLE PRECISION NOT NULL,
    "funding_raw_score" DOUBLE PRECISION NOT NULL,
    "funding_final_score" DOUBLE PRECISION NOT NULL,
    "global_score" DOUBLE PRECISION NOT NULL,
    "maturity_level" "MaturityLevel" NOT NULL,
    "strongest_dimension" "Dimension" NOT NULL,
    "improvement_focus" "Dimension" NOT NULL,
    "cascade_triggered" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "diagnostic_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_answers" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "question_code" TEXT NOT NULL,
    "answer_code" TEXT NOT NULL,
    "score_value" INTEGER NOT NULL,

    CONSTRAINT "diagnostic_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "diagnostic_answers_submission_id_idx" ON "diagnostic_answers"("submission_id");

-- CreateIndex
CREATE UNIQUE INDEX "diagnostic_answers_submission_id_question_code_key" ON "diagnostic_answers"("submission_id", "question_code");

-- AddForeignKey
ALTER TABLE "diagnostic_answers" ADD CONSTRAINT "diagnostic_answers_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "diagnostic_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
