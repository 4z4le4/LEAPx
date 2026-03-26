/*
  Warnings:

  - You are about to drop the column `subSkillCategory_id` on the `CheckInTimeSlot` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CheckInTimeSlot" DROP COLUMN "subSkillCategory_id",
ADD COLUMN     "description_EN" TEXT,
ADD COLUMN     "description_TH" TEXT,
ADD COLUMN     "name_EN" TEXT,
ADD COLUMN     "name_TH" TEXT;

-- CreateTable
CREATE TABLE "CheckInTimeSlotSkillReward" (
    "id" SERIAL NOT NULL,
    "checkInTimeSlot_id" INTEGER NOT NULL,
    "subSkillCategory_id" INTEGER NOT NULL,
    "levelType" "levelType" NOT NULL,
    "baseExperience" INTEGER NOT NULL,
    "bonusExperience" INTEGER NOT NULL DEFAULT 0,
    "requireCheckIn" BOOLEAN NOT NULL DEFAULT true,
    "requireCheckOut" BOOLEAN NOT NULL DEFAULT true,
    "requireOnTime" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckInTimeSlotSkillReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckInTimeSlotSkillReward_checkInTimeSlot_id_idx" ON "CheckInTimeSlotSkillReward"("checkInTimeSlot_id");

-- CreateIndex
CREATE INDEX "CheckInTimeSlotSkillReward_subSkillCategory_id_idx" ON "CheckInTimeSlotSkillReward"("subSkillCategory_id");

-- CreateIndex
CREATE UNIQUE INDEX "CheckInTimeSlotSkillReward_checkInTimeSlot_id_subSkillCateg_key" ON "CheckInTimeSlotSkillReward"("checkInTimeSlot_id", "subSkillCategory_id", "levelType");

-- CreateIndex
CREATE INDEX "CheckInTimeSlot_event_id_slot_number_idx" ON "CheckInTimeSlot"("event_id", "slot_number");

-- AddForeignKey
ALTER TABLE "CheckInTimeSlotSkillReward" ADD CONSTRAINT "CheckInTimeSlotSkillReward_checkInTimeSlot_id_fkey" FOREIGN KEY ("checkInTimeSlot_id") REFERENCES "CheckInTimeSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInTimeSlotSkillReward" ADD CONSTRAINT "CheckInTimeSlotSkillReward_subSkillCategory_id_fkey" FOREIGN KEY ("subSkillCategory_id") REFERENCES "SubSkillCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
