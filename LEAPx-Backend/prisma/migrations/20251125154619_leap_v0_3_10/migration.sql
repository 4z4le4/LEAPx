-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "isForCMUEngineering" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "allowMultipleCheckIns" SET DEFAULT true;
