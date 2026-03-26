-- CreateTable
CREATE TABLE "public"."UserCheckInRecord" (
    "id" SERIAL NOT NULL,
    "eventRegistration_id" INTEGER NOT NULL,
    "checkInTimeSlot_id" INTEGER NOT NULL,
    "checkedIn" BOOLEAN NOT NULL DEFAULT false,
    "checkInTime" TIMESTAMP(3),
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "checkedOut" BOOLEAN NOT NULL DEFAULT false,
    "checkOutTime" TIMESTAMP(3),
    "expEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCheckInRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserCheckInRecord_eventRegistration_id_idx" ON "public"."UserCheckInRecord"("eventRegistration_id");

-- CreateIndex
CREATE INDEX "UserCheckInRecord_checkInTimeSlot_id_idx" ON "public"."UserCheckInRecord"("checkInTimeSlot_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserCheckInRecord_eventRegistration_id_checkInTimeSlot_id_key" ON "public"."UserCheckInRecord"("eventRegistration_id", "checkInTimeSlot_id");

-- AddForeignKey
ALTER TABLE "public"."UserCheckInRecord" ADD CONSTRAINT "UserCheckInRecord_eventRegistration_id_fkey" FOREIGN KEY ("eventRegistration_id") REFERENCES "public"."EventRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserCheckInRecord" ADD CONSTRAINT "UserCheckInRecord_checkInTimeSlot_id_fkey" FOREIGN KEY ("checkInTimeSlot_id") REFERENCES "public"."CheckInTimeSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
