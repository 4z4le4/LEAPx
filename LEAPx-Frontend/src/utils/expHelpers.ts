/**
 * Exp/Skills transformation utilities for EventForm
 * 
 * This module contains helper functions for:
 * - Building skill rewards from exp configuration
 * - Building check-in time slots from exp data
 * - Converting backend data to exp configuration
 */

import type {
  DayExpConfig,
  ExpItem,
  ExpTimeSlot,
  ExpActivityType,
} from "../components/Event/exp/EventExpPerDayEditor";

/* ===================== Types ===================== */

/** สำหรับ skillRewards ที่ส่งไป backend */
export type SkillRewardTimeSlotInput = {
  startTime: string; // ISO string
  endTime: string; // ISO string
  slot_number?: number;
  // list ของทักษะในช่วงเวลานี้ (ใช้ subSkillCategory_id + ระดับ)
  subSkillCategory_id?: {
    id: number;
    level: "I" | "II" | "III" | "IV";
  }[];
};

export type SkillRewardInput = {
  subSkillCategory_id: number;
  levelType: "I" | "II" | "III" | "IV";
  baseExperience: number;
  bonusExperience?: number;
};

export type BuildSlotOptions = {
  checkInStartTime?: string; // รูปแบบ "HH:MM"
  checkInEndTime?: string; // รูปแบบ "HH:MM"
};

type DayExpConfigWithItems = DayExpConfig & {
  items?: ExpItem[];
};

type ExpTimeSlotWithLegacy = ExpTimeSlot & {
  startTime?: string;
  endTime?: string;
};

type BackendSubSkillItem = {
  id?: number | null;
  level?: ExpActivityType | null;
};

type BackendCheckInSlot = {
  startTime?: string | null;
  endTime?: string | null;
  subSkillCategory_id?: BackendSubSkillItem[] | null;
};

type BackendSkillReward = {
  subSkillCategory_id?: number | null;
  levelType?: ExpActivityType | null;
  baseExperience?: number | null;
  subSkillCategory?: {
    id?: number | null;
    mainSkillCategory_id?: number | null;
    mainSkillCategory?: { id?: number | null } | null;
  } | null;
};

export type BackendEventWithExp = {
  checkInTimeSlots?: BackendCheckInSlot[] | null;
  skillRewards?: BackendSkillReward[] | null;
  checkInStart?: string | null;
  checkInEnd?: string | null;
};

/* ===================== Constants ===================== */

export const LEVEL_ORDER: ("I" | "II" | "III" | "IV")[] = [
  "I",
  "II",
  "III",
  "IV",
];

function formatIsoLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/* ===================== Public Functions ===================== */

/**
 * แปลง exp config (DayExpConfig[]) เป็น skill rewards ที่ส่งไป backend
 * จะรวบรวมทุก skill + level + exp ที่ซ้ำกันออก (ใช้ Set)
 */
export function buildSkillRewardsFromExp(
  expByDay: DayExpConfig[],
): SkillRewardInput[] {
  const out: SkillRewardInput[] = [];

  // ใช้ key เพื่อกัน "แถวซ้ำเป๊ะ" (skill + level + exp เท่ากัน)
  const seen = new Set<string>();

  const pushFromItem = (rawItem?: ExpItem | null) => {
    if (!rawItem) return;

    const subId = Number(rawItem.skillId);
    if (!Number.isFinite(subId)) return;

    const level = rawItem.activityType as ExpActivityType | undefined;
    if (!level || !LEVEL_ORDER.includes(level)) return;

    const expNum = Number(rawItem.exp);
    const exp = Number.isFinite(expNum) ? Math.max(0, expNum) : 0;

    const key = `${subId}|${level}|${exp}`;
    if (seen.has(key)) return;
    seen.add(key);

    out.push({
      subSkillCategory_id: subId,
      levelType: level,
      baseExperience: exp,
      bonusExperience: 0,
    });
  };

  for (const day of expByDay ?? []) {
    if (!day) continue;

    // มีช่วงเวลา
    for (const slot of day.slots ?? []) {
      for (const item of slot.items ?? []) {
        pushFromItem(item);
      }
    }

    // เผื่อ case day.items (ไม่มีช่วงเวลา)
    const dayWithItems = day as DayExpConfigWithItems;
    const dayItems = dayWithItems.items;

    if (Array.isArray(dayItems)) {
      for (const item of dayItems) {
        pushFromItem(item);
      }
    }
  }

  // ไม่ sort → ลำดับเท่ากับแถวแรกที่เจอใน UI
  return out;
}

/**
 * แปลง exp config เป็น check-in time slots ที่ส่งไป backend
 * @param expByDay - exp configuration by day
 * @param toISO - function to convert date/time to ISO string (from dateHelpers)
 * @param opts - global check-in start/end time options
 */
export function buildCheckInTimeSlotsFromExp(
  expByDay: DayExpConfig[],
  toISO: (d: string, t: string) => string,
  opts?: BuildSlotOptions,
): SkillRewardTimeSlotInput[] {
  const slots: SkillRewardTimeSlotInput[] = [];
  let slotCounter = 0;

  const globalStartTime = (opts?.checkInStartTime || "00:00").slice(0, 5);
  const globalEndTime = (opts?.checkInEndTime || "23:59").slice(0, 5);

  for (const day of expByDay ?? []) {
    if (!day?.date) continue;

    const daySlots: SkillRewardTimeSlotInput[] = [];

    const dayWindowStartISO = toISO(day.date, globalStartTime);
    const dayWindowEndISO = toISO(day.date, globalEndTime);
    const dayWindowStart = new Date(dayWindowStartISO);
    const dayWindowEnd = new Date(dayWindowEndISO);

    if (!(dayWindowEnd > dayWindowStart)) continue;

    // ✅ รองรับเคส day.items (แบบไม่มีช่วงเวลา)
    const dayWithItems = day as DayExpConfigWithItems;
    const dayItems = dayWithItems.items;

    // ===== loop slot ตามปกติ =====
    for (const slotRaw of day.slots ?? []) {
      const slot = slotRaw as ExpTimeSlotWithLegacy;

      const rawStartTime = slot.startTime || slot.start || globalStartTime;
      const rawEndTime = slot.endTime || slot.end || globalEndTime;

      const slotStartISO = toISO(day.date, String(rawStartTime).slice(0, 5));
      const slotEndISO = toISO(day.date, String(rawEndTime).slice(0, 5));

      let slotStart = new Date(slotStartISO);
      let slotEnd = new Date(slotEndISO);

      if (slotStart < dayWindowStart) slotStart = new Date(dayWindowStart);
      if (slotEnd > dayWindowEnd) slotEnd = new Date(dayWindowEnd);
      if (!(slotEnd > slotStart)) continue;

      const seen = new Set<string>();
      const subSkillList: { id: number; level: "I" | "II" | "III" | "IV" }[] =
        [];

      for (const item of slot.items ?? []) {
        const subId = Number(item.skillId);
        const level = item.activityType as ExpActivityType | undefined;

        if (!Number.isFinite(subId)) continue;
        if (!level || !LEVEL_ORDER.includes(level)) continue;

        const key = `${subId}|${level}`;
        if (seen.has(key)) continue;

        seen.add(key);
        subSkillList.push({
          id: subId,
          level,
        });
      }

      if (subSkillList.length === 0) continue;
      daySlots.push({
        startTime: formatIsoLocal(slotStart),
        endTime: formatIsoLocal(slotEnd),
        slot_number: 0,
        subSkillCategory_id: subSkillList,
      });
    }

    const hasAnySkillPicked =
      (day.slots ?? []).some((s) =>
        (s.items ?? []).some((it) => {
          const subId = Number(it.skillId);
          const level = it.activityType as ExpActivityType | undefined;
          return Number.isFinite(subId) && !!level;
        }),
      ) ||
      (Array.isArray(dayItems) &&
        dayItems.some(
          (it) => Number.isFinite(Number(it.skillId)) && !!it.activityType,
        ));

    const hasAnyConfig = hasAnySkillPicked;

    // ถ้าวันนั้นมี config แต่ไม่มี slot เลย → สร้าง slot ครอบทั้ง window
    if (daySlots.length === 0 && hasAnyConfig) {
      daySlots.push({
        startTime: formatIsoLocal(dayWindowStart),
        endTime: formatIsoLocal(dayWindowEnd),
        slot_number: 0,
        subSkillCategory_id: [],
      });
    }

    for (const s of daySlots) {
      slotCounter += 1;
      s.slot_number = slotCounter;
      slots.push(s);
    }
  }

  return slots;
}

/**
 * แปลงข้อมูลจาก backend กลับเป็น exp configuration สำหรับ UI
 * รองรับ checkInTimeSlots และ skillRewards
 */
export function buildExpByDayFromBackend(
  initialData: BackendEventWithExp | null | undefined,
  split: (
    raw: string | null | undefined,
  ) => { date: string; time: string },
): DayExpConfig[] {
  const data = initialData ?? {};

  const checkSlots = Array.isArray(data.checkInTimeSlots)
    ? data.checkInTimeSlots
    : [];

  if (!checkSlots.length) return [];

  const rewards = Array.isArray(data.skillRewards) ? data.skillRewards : [];

  // map exp ของ (subSkillId|level) -> exp
  const expMap = new Map<string, number>();
  // map subSkillId -> mainSkillCategoryId (เป็น string ตาม type ของ ExpItem.categoryId)
  const catMap = new Map<number, string>();

  for (const r of rewards) {
    const subId = r?.subSkillCategory_id ?? undefined;
    const level = r?.levelType as ExpActivityType | undefined;
    const exp = r?.baseExperience ?? undefined;

    if (
      typeof subId === "number" &&
      typeof exp === "number" &&
      level &&
      LEVEL_ORDER.includes(level)
    ) {
      expMap.set(`${subId}|${level}`, exp);
    }

    const sub = r?.subSkillCategory;
    const mainId =
      sub?.mainSkillCategory_id ?? sub?.mainSkillCategory?.id ?? undefined;

    if (sub?.id && typeof mainId === "number") {
      catMap.set(sub.id, String(mainId));
    }
  }

  // เวลา global ของ policy (เอาเฉพาะ HH:mm)
  const globalStartTime = split(data.checkInStart ?? null).time;
  const globalEndTime = split(data.checkInEnd ?? null).time;

  const byDate: Record<string, DayExpConfig> = {};

  for (const raw of checkSlots) {
    if (!raw?.startTime || !raw?.endTime) continue;

    const startParts = split(raw.startTime);
    const endParts = split(raw.endTime);
    if (!startParts.date || !startParts.time || !endParts.time) continue;

    const dateKey = startParts.date;

    if (!byDate[dateKey]) {
      byDate[dateKey] = { date: dateKey, slots: [] };
    }

    const items: ExpItem[] = [];
    const list = Array.isArray(raw.subSkillCategory_id)
      ? raw.subSkillCategory_id
      : [];

    for (const s of list) {
      const subId = s?.id;
      const level = s?.level as ExpActivityType | undefined;
      if (!subId || !level) continue;

      const key = `${subId}|${level}`;
      const exp = expMap.get(key) ?? 0;
      const catId = catMap.get(subId);

      items.push({
        categoryId: catId,
        skillId: String(subId),
        activityType: level,
        exp,
      });
    }

    // ✅ ถ้าเวลา slot ตรงกับ checkInStart/End (เฉพาะ HH:mm) ให้ถือว่า "ไม่ได้กำหนดช่วงเวลา"
    const isFullWindowByGlobal =
      !!globalStartTime &&
      !!globalEndTime &&
      startParts.time === globalStartTime &&
      endParts.time === globalEndTime;

    const slot: ExpTimeSlot = {
  useCheckInSlot: true,
  useTimeWindow: !isFullWindowByGlobal,
  start: startParts.time,
  end: endParts.time,
  items,
};

    (byDate[dateKey].slots ?? (byDate[dateKey].slots = [])).push(slot);
  }

  // ✅ fallback เพิ่มเติม: ถ้า globalStart/End ไม่มี แต่วันนั้นมี slot เดียว
  // ให้ถือว่าไม่ได้กำหนดช่วงเวลา (เพราะไม่มีข้อมูล policy มาเทียบ)
  if (!globalStartTime || !globalEndTime) {
    for (const dayKey of Object.keys(byDate)) {
      const day = byDate[dayKey];
      if (day?.slots && day.slots.length === 1) {
        day.slots[0] = { ...day.slots[0], useTimeWindow: false };
      }
    }
  }

  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
}
