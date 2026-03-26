-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('TEXT', 'TEXTAREA', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'RATING');

-- CreateTable
CREATE TABLE "EventEvaluation" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "title_TH" TEXT NOT NULL,
    "title_EN" TEXT NOT NULL,
    "description_TH" TEXT,
    "description_EN" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "maxScore" INTEGER NOT NULL DEFAULT 0,
    "openAt" TIMESTAMP(3),
    "closeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationQuestion" (
    "id" SERIAL NOT NULL,
    "evaluation_id" INTEGER NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "question_TH" TEXT NOT NULL,
    "question_EN" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "options" JSONB,
    "maxScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationResponse" (
    "id" SERIAL NOT NULL,
    "evaluation_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "registration_id" INTEGER NOT NULL,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationAnswer" (
    "id" SERIAL NOT NULL,
    "response_id" INTEGER NOT NULL,
    "question_id" INTEGER NOT NULL,
    "answerText" TEXT,
    "answerChoices" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "answerRating" INTEGER,
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventEvaluation_event_id_isActive_idx" ON "EventEvaluation"("event_id", "isActive");

-- CreateIndex
CREATE INDEX "EvaluationQuestion_evaluation_id_idx" ON "EvaluationQuestion"("evaluation_id");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationQuestion_evaluation_id_questionNumber_key" ON "EvaluationQuestion"("evaluation_id", "questionNumber");

-- CreateIndex
CREATE INDEX "EvaluationResponse_evaluation_id_user_id_idx" ON "EvaluationResponse"("evaluation_id", "user_id");

-- CreateIndex
CREATE INDEX "EvaluationResponse_registration_id_idx" ON "EvaluationResponse"("registration_id");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationResponse_evaluation_id_user_id_key" ON "EvaluationResponse"("evaluation_id", "user_id");

-- CreateIndex
CREATE INDEX "EvaluationAnswer_response_id_idx" ON "EvaluationAnswer"("response_id");

-- CreateIndex
CREATE INDEX "EvaluationAnswer_question_id_idx" ON "EvaluationAnswer"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationAnswer_response_id_question_id_key" ON "EvaluationAnswer"("response_id", "question_id");

-- AddForeignKey
ALTER TABLE "EventEvaluation" ADD CONSTRAINT "EventEvaluation_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationQuestion" ADD CONSTRAINT "EvaluationQuestion_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "EventEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationResponse" ADD CONSTRAINT "EvaluationResponse_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "EventEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationResponse" ADD CONSTRAINT "EvaluationResponse_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationResponse" ADD CONSTRAINT "EvaluationResponse_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "EventRegistration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationAnswer" ADD CONSTRAINT "EvaluationAnswer_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "EvaluationResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationAnswer" ADD CONSTRAINT "EvaluationAnswer_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "EvaluationQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
