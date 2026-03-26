import type { ApiEvent } from "../../types/api/event";

const BASE = import.meta.env.VITE_LEAP_BACKEND_URL as string;

export async function fetchEventBySlug(slug: string): Promise<ApiEvent> {
  const url = `${BASE}/api/events/slug/${encodeURIComponent(slug)}?includeSkillRewards=true&includePhotos=true&includeCreator=true`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  // ถ้า backend ห่อ {success,data} แบบ single-object
  return json.data as ApiEvent;
}

export async function fetchEventById(id: number): Promise<ApiEvent> {
  const url = `${BASE}/api/events/${id}?includeSkillRewards=true&includePhotos=true&includeCreator=true`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data as ApiEvent;
}
