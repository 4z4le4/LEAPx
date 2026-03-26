/*
  Warnings:

  - You are about to drop the column `subSkillCategory_id` on the `CheckInTimeSlot` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CheckInTimeSlot" DROP COLUMN "subSkillCategory_id";

-- CreateTable
CREATE TABLE "SlotSkillMapping" (
    "id" SERIAL NOT NULL,
    "timeSlot_id" INTEGER NOT NULL,
    "subSkillCategory_id" INTEGER NOT NULL,
    "level" TEXT NOT NULL,

    CONSTRAINT "SlotSkillMapping_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SlotSkillMapping" ADD CONSTRAINT "SlotSkillMapping_timeSlot_id_fkey" FOREIGN KEY ("timeSlot_id") REFERENCES "CheckInTimeSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotSkillMapping" ADD CONSTRAINT "SlotSkillMapping_subSkillCategory_id_fkey" FOREIGN KEY ("subSkillCategory_id") REFERENCES "SubSkillCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
