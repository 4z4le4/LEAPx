/*
  Warnings:

  - You are about to drop the `SlotSkillMapping` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SlotSkillMapping" DROP CONSTRAINT "SlotSkillMapping_subSkillCategory_id_fkey";

-- DropForeignKey
ALTER TABLE "SlotSkillMapping" DROP CONSTRAINT "SlotSkillMapping_timeSlot_id_fkey";

-- AlterTable
ALTER TABLE "CheckInTimeSlot" ADD COLUMN     "subSkillCategory_id" JSONB;

-- DropTable
DROP TABLE "SlotSkillMapping";
