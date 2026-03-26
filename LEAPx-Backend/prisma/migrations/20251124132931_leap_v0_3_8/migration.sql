/*
  Warnings:

  - Added the required column `levelType` to the `EventSkillReward` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EventSkillReward" ADD COLUMN     "levelType" TEXT NOT NULL;
