-- AlterTable: add per-slot early check-in window field
-- null  = fall back to event.checkInWindowBefore
-- 0     = no early check-in (only from startTime onward)
-- N > 0 = allow check-in N minutes before startTime
ALTER TABLE "CheckInTimeSlot" ADD COLUMN "earlyCheckInMinutes" INTEGER;
