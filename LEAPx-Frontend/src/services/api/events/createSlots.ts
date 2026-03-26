import { createTimeSlot } from "../events/slots.service";
import type { CreateTimeSlotRequest } from "../../../../src/pages/Admin_pages/EventManagement/types/slots.types";
import type { UICheckInTimeSlot } from "../../../../types/ui/checkIn.types";

export async function createSlots(
  eventId: number,
  apiSlots: CreateTimeSlotRequest[],
  uiSlots: UICheckInTimeSlot[]
): Promise<Record<number, number>> {

  const slotIdMap: Record<number, number> = {};

  for (const slot of apiSlots) {

    const response = await createTimeSlot(eventId, slot);

    const dbSlotId = response.data.id;

    const uiSlot = uiSlots.find(
      (s) => s.slot_number === slot.slot_number
    );

    if (uiSlot) {
      slotIdMap[uiSlot.id] = dbSlotId;
    }
  }

  return slotIdMap;
}