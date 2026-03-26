-- AlterTable
ALTER TABLE "public"."Event" ADD COLUMN     "allowMultipleCheckIns" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."EventStaff" ADD COLUMN     "checkInTime" TIMESTAMP(3),
ADD COLUMN     "checkOutTime" TIMESTAMP(3),
ADD COLUMN     "checkedIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "checkedOut" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."CheckInTimeSlot" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "slot_number" INTEGER NOT NULL,
    "EventSkillReward_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckInTimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CheckInTimeSlot_event_id_idx" ON "public"."CheckInTimeSlot"("event_id");

-- CreateIndex
CREATE INDEX "CheckInTimeSlot_startTime_endTime_idx" ON "public"."CheckInTimeSlot"("startTime", "endTime");

-- AddForeignKey
ALTER TABLE "public"."CheckInTimeSlot" ADD CONSTRAINT "CheckInTimeSlot_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
