import { backend_url } from "../../../../../utils/constants";
import type { EventParticipantsResponse } from "../types/registrationParticipants.types";

export async function fetchEventParticipants(
  eventId: string,
  page: number = 1,
  limit: number = 20,
  search: string = "",
  status: string = ""
): Promise<EventParticipantsResponse> {

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) {
    params.append("search", search);
  }

  if (status) {
    params.append("status", status);
  }

  const res = await fetch(
    `${backend_url}/api/events/${eventId}/participants?${params.toString()}`,
    {
      credentials: "include",
    }
  );

  if (!res.ok) {
    throw new Error("Failed to fetch participants");
  }

  return res.json();
}