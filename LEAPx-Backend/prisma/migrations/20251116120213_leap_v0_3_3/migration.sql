/*
  Warnings:

  - You are about to drop the column `badgeColor` on the `LevelThreshold` table. All the data in the column will be lost.
  - You are about to drop the column `badgeIcon` on the `LevelThreshold` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."SpecialSkillActionType" AS ENUM ('EVENT_REWARD', 'BONUS', 'DISCIPLINE_PENALTY', 'LATE_PENALTY', 'ABSENCE_PENALTY', 'MANUAL_ADJUSTMENT', 'OTHER');

-- AlterTable
ALTER TABLE "public"."LevelThreshold" DROP COLUMN "badgeColor",
DROP COLUMN "badgeIcon";

-- CreateTable
CREATE TABLE "public"."SpecialSkill" (
    "id" SERIAL NOT NULL,
    "name_TH" TEXT NOT NULL,
    "name_EN" TEXT NOT NULL,
    "description_TH" TEXT,
    "description_EN" TEXT,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "category" TEXT NOT NULL DEFAULT 'DISCIPLINE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecialSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserSpecialSkillLevel" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "specialSkill_id" INTEGER NOT NULL,
    "currentExp" INTEGER NOT NULL DEFAULT 0,
    "currentLevel" INTEGER NOT NULL DEFAULT 0,
    "positiveActions" INTEGER NOT NULL DEFAULT 0,
    "negativeActions" INTEGER NOT NULL DEFAULT 0,
    "maxLevelReached" INTEGER NOT NULL DEFAULT 0,
    "reachedMaxAt" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSpecialSkillLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SpecialSkillHistory" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "specialSkill_id" INTEGER NOT NULL,
    "event_id" INTEGER,
    "expChange" INTEGER NOT NULL,
    "previousExp" INTEGER NOT NULL,
    "newExp" INTEGER NOT NULL,
    "previousLevel" INTEGER NOT NULL,
    "newLevel" INTEGER NOT NULL,
    "reason_TH" TEXT,
    "reason_EN" TEXT,
    "actionType" "public"."SpecialSkillActionType" NOT NULL,
    "adjustedBy" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpecialSkillHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventSpecialSkillReward" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "specialSkill_id" INTEGER NOT NULL,
    "baseExperience" INTEGER NOT NULL,
    "bonusExperience" INTEGER NOT NULL DEFAULT 0,
    "requireCheckIn" BOOLEAN NOT NULL DEFAULT true,
    "requireCheckOut" BOOLEAN NOT NULL DEFAULT true,
    "requireOnTime" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSpecialSkillReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpecialSkill_slug_key" ON "public"."SpecialSkill"("slug");

-- CreateIndex
CREATE INDEX "SpecialSkill_isActive_sortOrder_idx" ON "public"."SpecialSkill"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "SpecialSkill_category_isActive_idx" ON "public"."SpecialSkill"("category", "isActive");

-- CreateIndex
CREATE INDEX "UserSpecialSkillLevel_user_id_idx" ON "public"."UserSpecialSkillLevel"("user_id");

-- CreateIndex
CREATE INDEX "UserSpecialSkillLevel_specialSkill_id_currentLevel_idx" ON "public"."UserSpecialSkillLevel"("specialSkill_id", "currentLevel");

-- CreateIndex
CREATE UNIQUE INDEX "UserSpecialSkillLevel_user_id_specialSkill_id_key" ON "public"."UserSpecialSkillLevel"("user_id", "specialSkill_id");

-- CreateIndex
CREATE INDEX "SpecialSkillHistory_user_id_specialSkill_id_idx" ON "public"."SpecialSkillHistory"("user_id", "specialSkill_id");

-- CreateIndex
CREATE INDEX "SpecialSkillHistory_createdAt_idx" ON "public"."SpecialSkillHistory"("createdAt");

-- CreateIndex
CREATE INDEX "SpecialSkillHistory_actionType_idx" ON "public"."SpecialSkillHistory"("actionType");

-- CreateIndex
CREATE INDEX "EventSpecialSkillReward_specialSkill_id_idx" ON "public"."EventSpecialSkillReward"("specialSkill_id");

-- CreateIndex
CREATE UNIQUE INDEX "EventSpecialSkillReward_event_id_specialSkill_id_key" ON "public"."EventSpecialSkillReward"("event_id", "specialSkill_id");

-- AddForeignKey
ALTER TABLE "public"."UserSpecialSkillLevel" ADD CONSTRAINT "UserSpecialSkillLevel_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSpecialSkillLevel" ADD CONSTRAINT "UserSpecialSkillLevel_specialSkill_id_fkey" FOREIGN KEY ("specialSkill_id") REFERENCES "public"."SpecialSkill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SpecialSkillHistory" ADD CONSTRAINT "SpecialSkillHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SpecialSkillHistory" ADD CONSTRAINT "SpecialSkillHistory_specialSkill_id_fkey" FOREIGN KEY ("specialSkill_id") REFERENCES "public"."SpecialSkill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventSpecialSkillReward" ADD CONSTRAINT "EventSpecialSkillReward_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventSpecialSkillReward" ADD CONSTRAINT "EventSpecialSkillReward_specialSkill_id_fkey" FOREIGN KEY ("specialSkill_id") REFERENCES "public"."SpecialSkill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
