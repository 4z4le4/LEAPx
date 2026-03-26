/*
  Warnings:

  - You are about to drop the column `description` on the `StaffRole` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StaffRole" DROP COLUMN "description",
ADD COLUMN     "description_TH" TEXT;
