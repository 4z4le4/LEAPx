/*
  Warnings:

  - You are about to drop the column `staffCheckInEnd` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `staffCheckInStart` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `staffLateCheckInPenalty` on the `Event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Event" DROP COLUMN "staffCheckInEnd",
DROP COLUMN "staffCheckInStart",
DROP COLUMN "staffLateCheckInPenalty",
ADD COLUMN     "staffCheckInTime" INTEGER NOT NULL DEFAULT 60;
