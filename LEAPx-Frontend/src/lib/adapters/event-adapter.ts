//แปลง ApiEvent → EventDetail สำหรับหน้า Event Detail
import type { ApiEvent } from "../../../types/api/event";
import type { EventDetail, SkillBadge } from "../../../types/event/event-detail";


// ---------- Format helpers (TH) ----------
const thDay = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const thMonth = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function pad2(n: number) { return String(n).padStart(2, "0"); }
function hhmm(d: Date) { return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }

function formatThaiDate(iso: string) {
  const d = new Date(iso);
  return `${thDay[d.getDay()]} ${d.getDate()} ${thMonth[d.getMonth()]} ${d.getFullYear() + 543}`;
}
function formatTimeRange(startISO: string, endISO: string) {
  const s = new Date(startISO), e = new Date(endISO);
  return `${hhmm(s)}–${hhmm(e)} น.`;
}

// ---------- Map helpers ----------
function parseLatLngFromMapUrl(url?: string | null): { lat?: number; lng?: number } {
  if (!url) return {};
  const m = url.match(/[?&]q=([-\d.]+),([-\d.]+)/i);
  if (!m) return {};
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return {};
  return { lat, lng };
}

function pickCoverUrl(photos?: ApiEvent["photos"]): string | null {
  if (!photos || photos.length === 0) return null;
  const main = photos.find(p => p.isMain);
  return (main ?? photos[0]).photoUrl ?? null;
}

function buildSkillBadges(api: ApiEvent): SkillBadge[] | undefined {
  const rewards = api.skillRewards ?? [];
  if (rewards.length === 0) return undefined;

  return rewards.map((r) => {
    const main = r.subSkillCategory.mainSkillCategory;
    const sub = r.subSkillCategory;

    return {
      id: sub.id,
      label: main.name_TH || main.name_EN,  // TH ก่อน
      subLabel: sub.name_TH || sub.name_EN,   // TH ก่อน
      color: main.color ?? undefined,
      icon: sub.icon ?? main.icon ?? undefined, // ✅ ใช้ icon ของ sub-skill ก่อน
    };
  });
}


// ---------- Adapter ----------
export function toEventDetail(api: ApiEvent): EventDetail {
  const title = api.title_EN || api.title_TH;
  const description = api.description_TH || api.description_EN || "";

  const dateText = formatThaiDate(api.activityStart);
  const timeText = formatTimeRange(api.activityStart, api.activityEnd);

  const venueText = api.isOnline
    ? ["ออนไลน์", api.meetingLink].filter(Boolean).join(" · ")
    : (api.location_TH || api.location_EN || "");

  const { lat, lng } = parseLatLngFromMapUrl(api.locationMapUrl);

  return {
    id: String(api.id),
    slug: api.slug,                // slug ของ event ยังส่งเหมือนเดิม
    title,
    description,
    dateText,
    timeText,
    venueText,
    coverUrl: pickCoverUrl(api.photos),
    chips: [],
    lat,
    lng,
    addressForMap: api.location_TH || api.location_EN || null,
    skillBadges: buildSkillBadges(api),
    participants: {
      current: api.currentParticipants ?? 0,
      max: api.maxParticipants ?? 0,
    },
    staff: { current: 0, max: 0 },
    canRegisterOnsite: !api.isOnline,
    canRegisterOnline: true,
  };
}


// (ตัวเลือก) ถ้าคุณต้องการแยก adapter สำหรับ "list" ในอนาคต:
// export function toEventListItem(api: ApiEvent): EventListItem { ... }