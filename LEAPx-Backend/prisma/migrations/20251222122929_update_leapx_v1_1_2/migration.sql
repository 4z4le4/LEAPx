/*
  Warnings:

  - You are about to drop the column `responsibilities` on the `EventStaff` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EventStaff" DROP COLUMN "responsibilities",
ADD COLUMN     "responsibilities_TH" TEXT;
