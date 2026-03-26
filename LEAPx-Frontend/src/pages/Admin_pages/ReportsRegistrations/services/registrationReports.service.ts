import type { EventsResponse } from "../types/registrationReports.types";
import { backend_url } from "../../../../../utils/constants";

/**
 * Fetch events for Registration Reports
 * ใช้ endpoint เดียวกับ events list แต่เพิ่ม includeStats
 */
export async function fetchRegistrationReports(): Promise<EventsResponse> {
  const res = await fetch(
    `${backend_url}/api/events?includeStats=true&sortBy=activityStart&sortOrder=desc`,
    {
      credentials: "include",
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to fetch events");
  }

  return res.json();
}