-- CreateEnum
CREATE TYPE "public"."RoleType" AS ENUM ('SUPREME', 'SKILL_ADMIN', 'ACTIVITY_ADMIN', 'STUDENT', 'ALUMNI', 'USER');

-- CreateEnum
CREATE TYPE "public"."MajorAdminRole" AS ENUM ('OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PrerequisiteType" AS ENUM ('MUST_COMPLETE', 'MUST_NOT_COMPLETE', 'RECOMMENDED');

-- CreateEnum
CREATE TYPE "public"."RegistrationType" AS ENUM ('NORMAL', 'WALK_IN', 'WAITLIST');

-- CreateEnum
CREATE TYPE "public"."RegistrationStatus" AS ENUM ('PENDING', 'REGISTERED', 'ATTENDED', 'COMPLETED', 'INCOMPLETE', 'CANCELLED', 'LATE', 'LATE_PENALTY', 'ABSENT', 'UNDER_REVIEW', 'NEED_MORE_INFO', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."InvitationStatus" AS ENUM ('PENDING', 'REGISTERED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ExpType" AS ENUM ('ACTIVITY_COMPLETION', 'BONUS_REWARD', 'LATE_PENALTY', 'MANUAL_ADJUSTMENT', 'EVALUATION_BONUS');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('EVENT_REMINDER', 'REGISTRATION_CONFIRMED', 'LEVEL_UP', 'EVALUATION_AVAILABLE', 'SYSTEM_ANNOUNCEMENT');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role_id" INTEGER NOT NULL,
    "faculty" TEXT NOT NULL,
    "major" TEXT,
    "phone" TEXT,
    "photo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Role" (
    "id" SERIAL NOT NULL,
    "name" "public"."RoleType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MainSkillCategory" (
    "id" SERIAL NOT NULL,
    "name_TH" TEXT NOT NULL,
    "name_EN" TEXT NOT NULL,
    "description_TH" TEXT,
    "description_EN" TEXT,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MainSkillCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubSkillCategory" (
    "id" SERIAL NOT NULL,
    "mainSkillCategory_id" INTEGER NOT NULL,
    "name_TH" TEXT NOT NULL,
    "name_EN" TEXT NOT NULL,
    "description_TH" TEXT,
    "description_EN" TEXT,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubSkillCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserMainSkillLevel" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "mainSkillCategory_id" INTEGER NOT NULL,
    "maxLevel" INTEGER NOT NULL DEFAULT 0,
    "averageLevel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalExp" INTEGER NOT NULL DEFAULT 0,
    "totalStars" INTEGER NOT NULL DEFAULT 0,
    "Level_I_count" INTEGER NOT NULL DEFAULT 0,
    "Level_II_count" INTEGER NOT NULL DEFAULT 0,
    "Level_III_count" INTEGER NOT NULL DEFAULT 0,
    "Level_IV_count" INTEGER NOT NULL DEFAULT 0,
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMainSkillLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserSubSkillLevel" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "subSkillCategory_id" INTEGER NOT NULL,
    "Level_I_exp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "Level_II_exp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "Level_III_exp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "Level_IV_exp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "Level_I_stars" INTEGER NOT NULL DEFAULT 0,
    "Level_II_stars" INTEGER NOT NULL DEFAULT 0,
    "Level_III_stars" INTEGER NOT NULL DEFAULT 0,
    "Level_IV_stars" INTEGER NOT NULL DEFAULT 0,
    "currentLevel" INTEGER NOT NULL DEFAULT 0,
    "totalExp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSubSkillLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LevelThreshold" (
    "id" SERIAL NOT NULL,
    "levelType" TEXT NOT NULL,
    "expRequired" INTEGER NOT NULL,
    "levelName_TH" TEXT NOT NULL,
    "levelName_EN" TEXT NOT NULL,
    "badgeIcon" TEXT,
    "badgeColor" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LevelThreshold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MajorCategory" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name_TH" TEXT NOT NULL,
    "name_EN" TEXT NOT NULL,
    "icon" TEXT,
    "faculty_TH" TEXT NOT NULL,
    "faculty_EN" TEXT NOT NULL,
    "description_TH" TEXT,
    "description_EN" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MajorCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MajorAdmin" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "majorCategory_id" INTEGER NOT NULL,
    "role" "public"."MajorAdminRole" NOT NULL DEFAULT 'ADMIN',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MajorAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Event" (
    "id" SERIAL NOT NULL,
    "created_by" INTEGER NOT NULL,
    "majorCategory_id" INTEGER,
    "title_TH" TEXT NOT NULL,
    "title_EN" TEXT NOT NULL,
    "description_TH" TEXT NOT NULL,
    "description_EN" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "allowedYearLevels" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "staffAllowedYears" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "maxParticipants" INTEGER NOT NULL DEFAULT 0,
    "currentParticipants" INTEGER NOT NULL DEFAULT 0,
    "waitlistEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maxStaffCount" INTEGER NOT NULL DEFAULT 0,
    "currentStaffCount" INTEGER NOT NULL DEFAULT 0,
    "staffCommunicationLink" TEXT DEFAULT '',
    "registrationStart" TIMESTAMP(3) NOT NULL,
    "registrationEnd" TIMESTAMP(3) NOT NULL,
    "activityStart" TIMESTAMP(3) NOT NULL,
    "activityEnd" TIMESTAMP(3) NOT NULL,
    "checkInStart" TIMESTAMP(3),
    "checkInEnd" TIMESTAMP(3),
    "staffCheckInStart" TIMESTAMP(3),
    "staffCheckInEnd" TIMESTAMP(3),
    "lateCheckInPenalty" INTEGER NOT NULL DEFAULT 60,
    "staffLateCheckInPenalty" INTEGER NOT NULL DEFAULT 60,
    "status" "public"."EventStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "location_TH" TEXT NOT NULL,
    "location_EN" TEXT NOT NULL,
    "locationMapUrl" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "meetingLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventSkillReward" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "subSkillCategory_id" INTEGER NOT NULL,
    "baseExperience" INTEGER NOT NULL,
    "bonusExperience" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSkillReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventStaff" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "StaffRole_id" INTEGER NOT NULL,
    "status" "public"."RegistrationStatus" NOT NULL,
    "responsibilities" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StaffRole" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventPhoto" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "cloudinaryImage_id" INTEGER NOT NULL,
    "caption_TH" TEXT,
    "caption_EN" TEXT,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventPrerequisite" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "prerequisite_event_id" INTEGER NOT NULL,
    "type" "public"."PrerequisiteType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventPrerequisite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventRegistration" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,
    "registrationType" "public"."RegistrationType" NOT NULL DEFAULT 'NORMAL',
    "status" "public"."RegistrationStatus" NOT NULL,
    "checkedIn" BOOLEAN NOT NULL DEFAULT false,
    "checkInTime" TIMESTAMP(3),
    "checkedOut" BOOLEAN NOT NULL DEFAULT false,
    "checkOutTime" TIMESTAMP(3),
    "experienceEarned" INTEGER NOT NULL DEFAULT 0,
    "hasEvaluated" BOOLEAN NOT NULL DEFAULT false,
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventRegistrationCancellation" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,
    "status" "public"."RegistrationStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRegistrationCancellation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventInvitation" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "studentId" INTEGER,
    "status" "public"."InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedBy" INTEGER NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExperienceHistory" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "activity_id" INTEGER,
    "subSkillCategory_id" INTEGER NOT NULL,
    "experienceGained" INTEGER NOT NULL,
    "reason_TH" TEXT NOT NULL,
    "reason_EN" TEXT NOT NULL,
    "type" "public"."ExpType" NOT NULL,
    "previousLevel" INTEGER,
    "newLevel" INTEGER,
    "previousExp" INTEGER NOT NULL DEFAULT 0,
    "newExp" INTEGER NOT NULL DEFAULT 0,
    "bonusApplied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperienceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SkillEvaluation" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "subSkillCategory_id" INTEGER NOT NULL,
    "evaluator_id" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "level" INTEGER NOT NULL,
    "feedback_TH" TEXT,
    "feedback_EN" TEXT,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AcademicYear" (
    "id" SERIAL NOT NULL,
    "year_TH" INTEGER NOT NULL,
    "year_EN" INTEGER NOT NULL,
    "semesterStart" TIMESTAMP(3) NOT NULL,
    "semesterEnd" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemSettings" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title_TH" TEXT NOT NULL,
    "title_EN" TEXT NOT NULL,
    "message_TH" TEXT NOT NULL,
    "message_EN" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Icon" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Icon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CloudinaryImage" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secureUrl" TEXT NOT NULL,
    "format" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "bytes" INTEGER,
    "folder" TEXT,
    "resourceType" TEXT NOT NULL DEFAULT 'image',
    "originalFilename" TEXT,
    "uploadedBy" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CloudinaryImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LeapBanner" (
    "id" SERIAL NOT NULL,
    "cloudinaryImage_id" INTEGER NOT NULL,
    "name_TH" TEXT NOT NULL,
    "name_EN" TEXT NOT NULL,
    "isMain" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeapBanner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LeapLogo" (
    "id" SERIAL NOT NULL,
    "cloudinaryImage_id" INTEGER NOT NULL,
    "name_TH" TEXT NOT NULL,
    "name_EN" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeapLogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_firstName_lastName_idx" ON "public"."User"("firstName", "lastName");

-- CreateIndex
CREATE INDEX "User_faculty_idx" ON "public"."User"("faculty");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "public"."Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MainSkillCategory_slug_key" ON "public"."MainSkillCategory"("slug");

-- CreateIndex
CREATE INDEX "MainSkillCategory_isActive_sortOrder_idx" ON "public"."MainSkillCategory"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "MainSkillCategory_isActive_idx" ON "public"."MainSkillCategory"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SubSkillCategory_slug_key" ON "public"."SubSkillCategory"("slug");

-- CreateIndex
CREATE INDEX "SubSkillCategory_mainSkillCategory_id_isActive_idx" ON "public"."SubSkillCategory"("mainSkillCategory_id", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SubSkillCategory_mainSkillCategory_id_sortOrder_key" ON "public"."SubSkillCategory"("mainSkillCategory_id", "sortOrder");

-- CreateIndex
CREATE INDEX "UserMainSkillLevel_user_id_idx" ON "public"."UserMainSkillLevel"("user_id");

-- CreateIndex
CREATE INDEX "UserMainSkillLevel_mainSkillCategory_id_maxLevel_idx" ON "public"."UserMainSkillLevel"("mainSkillCategory_id", "maxLevel");

-- CreateIndex
CREATE UNIQUE INDEX "UserMainSkillLevel_user_id_mainSkillCategory_id_key" ON "public"."UserMainSkillLevel"("user_id", "mainSkillCategory_id");

-- CreateIndex
CREATE INDEX "UserSubSkillLevel_user_id_idx" ON "public"."UserSubSkillLevel"("user_id");

-- CreateIndex
CREATE INDEX "UserSubSkillLevel_subSkillCategory_id_currentLevel_idx" ON "public"."UserSubSkillLevel"("subSkillCategory_id", "currentLevel");

-- CreateIndex
CREATE UNIQUE INDEX "UserSubSkillLevel_user_id_subSkillCategory_id_key" ON "public"."UserSubSkillLevel"("user_id", "subSkillCategory_id");

-- CreateIndex
CREATE INDEX "LevelThreshold_sortOrder_idx" ON "public"."LevelThreshold"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "LevelThreshold_levelType_key" ON "public"."LevelThreshold"("levelType");

-- CreateIndex
CREATE UNIQUE INDEX "MajorCategory_code_key" ON "public"."MajorCategory"("code");

-- CreateIndex
CREATE INDEX "MajorCategory_code_idx" ON "public"."MajorCategory"("code");

-- CreateIndex
CREATE INDEX "MajorCategory_isActive_idx" ON "public"."MajorCategory"("isActive");

-- CreateIndex
CREATE INDEX "MajorAdmin_majorCategory_id_isActive_idx" ON "public"."MajorAdmin"("majorCategory_id", "isActive");

-- CreateIndex
CREATE INDEX "MajorAdmin_user_id_idx" ON "public"."MajorAdmin"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "MajorAdmin_user_id_majorCategory_id_key" ON "public"."MajorAdmin"("user_id", "majorCategory_id");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "public"."Event"("slug");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "public"."Event"("status");

-- CreateIndex
CREATE INDEX "Event_registrationStart_registrationEnd_idx" ON "public"."Event"("registrationStart", "registrationEnd");

-- CreateIndex
CREATE INDEX "Event_created_by_idx" ON "public"."Event"("created_by");

-- CreateIndex
CREATE INDEX "Event_majorCategory_id_idx" ON "public"."Event"("majorCategory_id");

-- CreateIndex
CREATE INDEX "EventSkillReward_subSkillCategory_id_idx" ON "public"."EventSkillReward"("subSkillCategory_id");

-- CreateIndex
CREATE UNIQUE INDEX "EventSkillReward_event_id_subSkillCategory_id_key" ON "public"."EventSkillReward"("event_id", "subSkillCategory_id");

-- CreateIndex
CREATE INDEX "EventStaff_user_id_idx" ON "public"."EventStaff"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "EventStaff_event_id_user_id_key" ON "public"."EventStaff"("event_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "StaffRole_name_key" ON "public"."StaffRole"("name");

-- CreateIndex
CREATE INDEX "EventPhoto_event_id_isMain_idx" ON "public"."EventPhoto"("event_id", "isMain");

-- CreateIndex
CREATE UNIQUE INDEX "EventPhoto_event_id_cloudinaryImage_id_key" ON "public"."EventPhoto"("event_id", "cloudinaryImage_id");

-- CreateIndex
CREATE UNIQUE INDEX "EventPrerequisite_event_id_prerequisite_event_id_key" ON "public"."EventPrerequisite"("event_id", "prerequisite_event_id");

-- CreateIndex
CREATE INDEX "EventRegistration_event_id_status_idx" ON "public"."EventRegistration"("event_id", "status");

-- CreateIndex
CREATE INDEX "EventRegistration_user_id_status_idx" ON "public"."EventRegistration"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_user_id_event_id_key" ON "public"."EventRegistration"("user_id", "event_id");

-- CreateIndex
CREATE INDEX "EventInvitation_event_id_status_idx" ON "public"."EventInvitation"("event_id", "status");

-- CreateIndex
CREATE INDEX "EventInvitation_email_idx" ON "public"."EventInvitation"("email");

-- CreateIndex
CREATE INDEX "EventInvitation_studentId_idx" ON "public"."EventInvitation"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "EventInvitation_event_id_email_key" ON "public"."EventInvitation"("event_id", "email");

-- CreateIndex
CREATE INDEX "ExperienceHistory_user_id_subSkillCategory_id_idx" ON "public"."ExperienceHistory"("user_id", "subSkillCategory_id");

-- CreateIndex
CREATE INDEX "ExperienceHistory_createdAt_idx" ON "public"."ExperienceHistory"("createdAt");

-- CreateIndex
CREATE INDEX "ExperienceHistory_type_idx" ON "public"."ExperienceHistory"("type");

-- CreateIndex
CREATE INDEX "SkillEvaluation_user_id_subSkillCategory_id_idx" ON "public"."SkillEvaluation"("user_id", "subSkillCategory_id");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_year_TH_key" ON "public"."AcademicYear"("year_TH");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_year_EN_key" ON "public"."AcademicYear"("year_EN");

-- CreateIndex
CREATE INDEX "AcademicYear_year_TH_isActive_idx" ON "public"."AcademicYear"("year_TH", "isActive");

-- CreateIndex
CREATE INDEX "AcademicYear_year_EN_isActive_idx" ON "public"."AcademicYear"("year_EN", "isActive");

-- CreateIndex
CREATE INDEX "AcademicYear_semesterStart_semesterEnd_idx" ON "public"."AcademicYear"("semesterStart", "semesterEnd");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSettings_key_key" ON "public"."SystemSettings"("key");

-- CreateIndex
CREATE INDEX "SystemSettings_key_idx" ON "public"."SystemSettings"("key");

-- CreateIndex
CREATE INDEX "Notification_user_id_isRead_idx" ON "public"."Notification"("user_id", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "public"."Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Icon_name_key" ON "public"."Icon"("name");

-- CreateIndex
CREATE INDEX "Icon_name_idx" ON "public"."Icon"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CloudinaryImage_publicId_key" ON "public"."CloudinaryImage"("publicId");

-- CreateIndex
CREATE INDEX "CloudinaryImage_publicId_idx" ON "public"."CloudinaryImage"("publicId");

-- CreateIndex
CREATE INDEX "CloudinaryImage_folder_idx" ON "public"."CloudinaryImage"("folder");

-- CreateIndex
CREATE INDEX "CloudinaryImage_uploadedBy_idx" ON "public"."CloudinaryImage"("uploadedBy");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SubSkillCategory" ADD CONSTRAINT "SubSkillCategory_mainSkillCategory_id_fkey" FOREIGN KEY ("mainSkillCategory_id") REFERENCES "public"."MainSkillCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserMainSkillLevel" ADD CONSTRAINT "UserMainSkillLevel_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserMainSkillLevel" ADD CONSTRAINT "UserMainSkillLevel_mainSkillCategory_id_fkey" FOREIGN KEY ("mainSkillCategory_id") REFERENCES "public"."MainSkillCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSubSkillLevel" ADD CONSTRAINT "UserSubSkillLevel_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSubSkillLevel" ADD CONSTRAINT "UserSubSkillLevel_subSkillCategory_id_fkey" FOREIGN KEY ("subSkillCategory_id") REFERENCES "public"."SubSkillCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MajorAdmin" ADD CONSTRAINT "MajorAdmin_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MajorAdmin" ADD CONSTRAINT "MajorAdmin_majorCategory_id_fkey" FOREIGN KEY ("majorCategory_id") REFERENCES "public"."MajorCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_majorCategory_id_fkey" FOREIGN KEY ("majorCategory_id") REFERENCES "public"."MajorCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventSkillReward" ADD CONSTRAINT "EventSkillReward_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventSkillReward" ADD CONSTRAINT "EventSkillReward_subSkillCategory_id_fkey" FOREIGN KEY ("subSkillCategory_id") REFERENCES "public"."SubSkillCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventStaff" ADD CONSTRAINT "EventStaff_StaffRole_id_fkey" FOREIGN KEY ("StaffRole_id") REFERENCES "public"."StaffRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventStaff" ADD CONSTRAINT "EventStaff_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventStaff" ADD CONSTRAINT "EventStaff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventPhoto" ADD CONSTRAINT "EventPhoto_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventPhoto" ADD CONSTRAINT "EventPhoto_cloudinaryImage_id_fkey" FOREIGN KEY ("cloudinaryImage_id") REFERENCES "public"."CloudinaryImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventPrerequisite" ADD CONSTRAINT "EventPrerequisite_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventRegistration" ADD CONSTRAINT "EventRegistration_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventRegistration" ADD CONSTRAINT "EventRegistration_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventInvitation" ADD CONSTRAINT "EventInvitation_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExperienceHistory" ADD CONSTRAINT "ExperienceHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExperienceHistory" ADD CONSTRAINT "ExperienceHistory_subSkillCategory_id_fkey" FOREIGN KEY ("subSkillCategory_id") REFERENCES "public"."SubSkillCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SkillEvaluation" ADD CONSTRAINT "SkillEvaluation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SkillEvaluation" ADD CONSTRAINT "SkillEvaluation_subSkillCategory_id_fkey" FOREIGN KEY ("subSkillCategory_id") REFERENCES "public"."SubSkillCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeapBanner" ADD CONSTRAINT "LeapBanner_cloudinaryImage_id_fkey" FOREIGN KEY ("cloudinaryImage_id") REFERENCES "public"."CloudinaryImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeapLogo" ADD CONSTRAINT "LeapLogo_cloudinaryImage_id_fkey" FOREIGN KEY ("cloudinaryImage_id") REFERENCES "public"."CloudinaryImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
