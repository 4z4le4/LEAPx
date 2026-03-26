-- AlterTable
ALTER TABLE "CheckInTimeSlot" ADD COLUMN     "currentParticipants" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "slotCapacity" INTEGER;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "checkInWindowAfter" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "checkInWindowBefore" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN     "invitedParticipants" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "EventRegistration" ADD COLUMN     "checkInSlot_id" INTEGER;
