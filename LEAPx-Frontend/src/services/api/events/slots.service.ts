import { backend_url } from "../../../../utils/constants";
import type {
  CreateTimeSlotRequest,
  CreateTimeSlotResponse,
} from "../../../../src/pages/Admin_pages/EventManagement/types/slots.types";

export async function createTimeSlot(
  eventId: number,
  payload: CreateTimeSlotRequest
): Promise<CreateTimeSlotResponse> {
  const res = await fetch(
    `${backend_url}/api/events/${eventId}/time-slots`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to create time slot");
  }

  return res.json();
}