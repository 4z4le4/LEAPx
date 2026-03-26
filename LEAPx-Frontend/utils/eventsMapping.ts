// utils/eventsMapping.ts
import type { ApiEvent } from "../types/api/event";
import type { EventCardModel, UiStatus } from "../types/ui/events";

type ApiEventExtended = ApiEvent & {
  stats?: {
    participantsCount?: number;
    staffCount?: number;
    staffMax?: number;
  };
  coverImageUrl?: string | null;
  maxStaff?: number;
};

export function calcHours(startISO: string, endISO: string): number {
  const s = new Date(startISO).getTime();
  const e = new Date(endISO).getTime();
  if (isNaN(s) || isNaN(e) || e <= s) return 0;
  return Math.round((e - s) / 36e5);
}

// ⬇️ แก้ให้รองรับความจุ/จำนวนปัจจุบัน
export function computeUiStatus(
  regStartISO?: string,
  regEndISO?: string,
  maxParticipants?: number | null,
  participantsNow?: number | null
): UiStatus {
  const now = Date.now();
  const rs = regStartISO ? new Date(regStartISO).getTime() : NaN;
  const re = regEndISO ? new Date(regEndISO).getTime() : NaN;

  const cap = typeof maxParticipants === "number" ? maxParticipants : 0;
  const cur = typeof participantsNow === "number" ? participantsNow : 0;
  const isFull = cap > 0 && cur >= cap;

  if (isFull) return "CLOSED";
  if (!isNaN(rs) && now < rs) return "SOON";
  if (!isNaN(rs) && !isNaN(re) && now >= rs && now <= re) return "OPEN";
  return "CLOSED";
}

export function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function mapApiToCard(ev: ApiEvent): EventCardModel {
  const title =
    ev.title_TH || ev.title_EN || "กิจกรรม";
  const location =
    ev.location_TH || ev.location_EN || (ev.isOnline ? "ออนไลน์" : "ยังไม่ระบุสถานที่");
  const hours = calcHours(ev.activityStart, ev.activityEnd);

  const evEx = ev as ApiEventExtended;

const participantsNow =
  typeof ev.currentParticipants === "number"
    ? ev.currentParticipants
    : evEx.stats?.participantsCount ?? 0;

const status = computeUiStatus(
  ev.registrationStart,
  ev.registrationEnd,
  ev.maxParticipants ?? 0,
  participantsNow
);

  const skills = uniq(
    (ev.skillRewards ?? []).map(
      (r) =>
        r.subSkillCategory?.mainSkillCategory?.name_TH ||
        r.subSkillCategory?.mainSkillCategory?.name_EN
    )
  ).filter(Boolean) as string[];

  const badges = (ev.skillRewards ?? [])
    .slice(0, 3)
    .map((r) => r.subSkillCategory?.name_TH || r.subSkillCategory?.name_EN)
    .filter(Boolean) as string[];

  return {
    id: String(ev.id),
    slug: ev.slug,
    title,
    badges,
    hours,
    date: ev.activityStart,
    location,
    skills: skills.length ? skills : ["ทั่วไป"],
    contact: "",
    status,

    // ⬇️ ฟิลด์เสริมให้การ์ดใช้ (optional ทั้งหมด)
    regStart: ev.registrationStart,
    imageUrl: evEx.coverImageUrl ?? null,
    capacity: {
  participantsMax: ev.maxParticipants ?? 0,
  participantsNow,
  staffMax: evEx.maxStaff ?? evEx.stats?.staffMax,
  staffNow: evEx.stats?.staffCount,
},
  };
}