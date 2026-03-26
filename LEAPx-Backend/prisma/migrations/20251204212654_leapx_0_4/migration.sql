/*
  Warnings:

  - You are about to drop the column `checkInEnd` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `checkInStart` on the `Event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Event" DROP COLUMN "checkInEnd",
DROP COLUMN "checkInStart";
