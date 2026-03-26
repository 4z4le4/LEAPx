-- CreateEnum
CREATE TYPE "EvaluationType" AS ENUM ('PRE_TEST', 'POST_TEST');

-- AlterTable
ALTER TABLE "EventEvaluation" ADD COLUMN     "type_evaluation" "EvaluationType" NOT NULL DEFAULT 'PRE_TEST';
