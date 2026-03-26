/*
  Warnings:

  - Changed the type of `levelType` on the `EventSkillReward` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `levelType` on the `LevelThreshold` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "levelType" AS ENUM ('I', 'II', 'III', 'IV');

-- AlterTable
ALTER TABLE "EventSkillReward" DROP COLUMN "levelType",
ADD COLUMN     "levelType" "levelType" NOT NULL;

-- AlterTable
ALTER TABLE "LevelThreshold" DROP COLUMN "levelType",
ADD COLUMN     "levelType" "levelType" NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "LevelThreshold_levelType_key" ON "LevelThreshold"("levelType");
