/*
  Warnings:

  - You are about to drop the column `EventSkillReward_id` on the `CheckInTimeSlot` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "EventSkillReward_event_id_subSkillCategory_id_key";

-- AlterTable
ALTER TABLE "CheckInTimeSlot" DROP COLUMN "EventSkillReward_id",
ADD COLUMN     "subSkillCategory_id" INTEGER;
