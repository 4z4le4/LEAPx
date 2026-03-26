import { PrismaClient } from "@prisma/client";
import prisma from "@/lib/prisma";

/**
 * Validation utilities for event time slots
 */

export interface TimeSlotValidationResult {
  valid: boolean;
  error?: string;
  overlappingSlot?: {
    id: number;
    slot_number: number;
    startTime: Date;
    endTime: Date;
  };
}

/**
 * Validate that a time slot doesn't overlap with existing slots
 * and is within event boundaries
 */
export async function validateTimeSlot(
  eventId: number,
  startTime: Date,
  endTime: Date,
  slotNumber: number,
  excludeSlotId?: number,
  prismaClient: PrismaClient = prisma
): Promise<TimeSlotValidationResult> {
  try {
    // 1. Validate end > start
    if (endTime <= startTime) {
      return {
        valid: false,
        error: "End time must be after start time"
      };
    }

    // 2. Check slot_number duplication
    const duplicateSlot = await prismaClient.checkInTimeSlot.findFirst({
      where: {
        event_id: eventId,
        slot_number: slotNumber,
        ...(excludeSlotId ? { id: { not: excludeSlotId } } : {})
      }
    });

    if (duplicateSlot) {
      return {
        valid: false,
        error: `Slot number ${slotNumber} already exists for this event`
      };
    }

    // 3. Check time overlap with existing slots
    const overlappingSlot = await prismaClient.checkInTimeSlot.findFirst({
      where: {
        event_id: eventId,
        ...(excludeSlotId ? { id: { not: excludeSlotId } } : {}),
        OR: [
          // New slot starts during existing slot
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } }
            ]
          },
          // New slot ends during existing slot
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } }
            ]
          },
          // New slot completely contains existing slot
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } }
            ]
          },
          // Existing slot completely contains new slot
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gte: endTime } }
            ]
          }
        ]
      },
      select: {
        id: true,
        slot_number: true,
        startTime: true,
        endTime: true
      }
    });

    if (overlappingSlot) {
      return {
        valid: false,
        error: `Time overlaps with slot ${overlappingSlot.slot_number} (${overlappingSlot.startTime.toISOString()} - ${overlappingSlot.endTime.toISOString()})`,
        overlappingSlot
      };
    }

    // 4. Validate within event boundaries
    const event = await prismaClient.event.findUnique({
      where: { id: eventId },
      select: { 
        activityStart: true
      }
    });

    if (!event) {
      return {
        valid: false,
        error: "Event not found"
      };
    }

    if (startTime < event.activityStart) {
      return {
        valid: false,
        error: `Slot start time (${startTime.toISOString()}) must be after event start time (${event.activityStart.toISOString()})`
      };
    }

    return { valid: true };
  } catch (error) {
    console.error("Error validating time slot:", error);
    return {
      valid: false,
      error: "Error validating time slot"
    };
  }
}

/**
 * Check if a time is within the check-in window for a slot
 */
export function isWithinCheckInWindow(
  slotStartTime: Date,
  slotEndTime: Date,
  currentTime: Date,
  windowBeforeMinutes: number = 60,
  windowAfterMinutes: number = 30
): {
  allowed: boolean;
  reason?: string;
  earliestCheckIn?: Date;
  latestCheckIn?: Date;
} {
  const earliestCheckIn = new Date(slotStartTime.getTime() - windowBeforeMinutes * 60 * 1000);
  const latestCheckIn = new Date(slotEndTime.getTime() + windowAfterMinutes * 60 * 1000);

  if (currentTime < earliestCheckIn) {
    return {
      allowed: false,
      reason: `Check-in opens at ${earliestCheckIn.toLocaleString()}`,
      earliestCheckIn,
      latestCheckIn
    };
  }

  if (currentTime > latestCheckIn) {
    return {
      allowed: false,
      reason: `Check-in closed at ${latestCheckIn.toLocaleString()}`,
      earliestCheckIn,
      latestCheckIn
    };
  }

  return {
    allowed: true,
    earliestCheckIn,
    latestCheckIn
  };
}
