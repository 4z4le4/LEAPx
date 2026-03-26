// TODO: เติมข้อมูลเสริมสำหรับ Event Detail แต่ละอันที่ต้องการในนี้
import type { Chip } from "../../types/common";

export type EventEnrich = {
  coverUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
  staff?: { current?: number; max?: number };
  chips?: Chip[];
};

/* ===================== chips ที่อนุญาต (ตามภาพ) ===================== */
const FAC_ENG: Chip = { id: "fac-eng", kind: "audience", label: "นักศึกษาคณะวิศวะ" };
const YEARS: Chip[] = [
  { id: "y1", kind: "audience", label: "ปี 1" },
  { id: "y2", kind: "audience", label: "ปี 2" },
  { id: "y3", kind: "audience", label: "ปี 3" },
  { id: "y4", kind: "audience", label: "ปี 4" },
];

/* ===================== ลำดับการแสดงผลที่ต้องการ ===================== */
const CHIP_ORDER = ["fac-eng", "y1", "y2", "y3", "y4"] as const;
function sortAudienceChips(chips: Chip[]): Chip[] {
  return chips
    .slice()
    .sort(
      (a, b) =>
        CHIP_ORDER.indexOf(a.id as (typeof CHIP_ORDER)[number]) -
        CHIP_ORDER.indexOf(b.id as (typeof CHIP_ORDER)[number])
    );
}

/* ===================== RNG แบบ deterministic จาก eventId ===================== */
// xfnv1a + เพิ่มการกวนบิตเล็กน้อย (พอใช้สำหรับ mock)
const xfnv1a = (str: string) => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += h << 13;
    h ^= h >>> 7;
    h += h << 3;
    h ^= h >>> 17;
    h += h << 5;
    return (h >>> 0) / 4294967296;
  };
};

function shuffleDeterministic<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** ได้ chips ชุดสุ่ม (แต่คงที่) สำหรับแต่ละ eventId */
export function getAudienceChipsFor(eventId: string | number): Chip[] {
  const rnd = xfnv1a(String(eventId));
  // สุ่มจำนวนปีที่จะแสดง (อย่างน้อย 1 อันจาก 1–4)
  const k = 1 + Math.floor(rnd() * YEARS.length);
  const pickedYears = shuffleDeterministic(YEARS, rnd).slice(0, k);
  // ใส่ FAC_ENG เสมอ แล้วจัดเรียงตามลำดับคงที่
  return sortAudienceChips([FAC_ENG, ...pickedYears]);
}

/* ===================== ข้อมูลเสริมพื้นฐานของกิจกรรม ===================== */
// (ยังไม่ใส่ chips ที่นี่ จะเติมด้วย getAudienceChipsFor ด้านล่าง)
const ENRICH_BASE: Record<string, Omit<EventEnrich, "chips">> = {
  // 11: community-cement-mixing-2025
  "11": {
    coverUrl: "https://pstgroup.biz/upload/iblock/135/article-03-02.jpg",
    // lat: 18.7950, lng: 98.9520,
    staff: { current: 4, max: 8 },
  },

  // 13: react-bootcamp-2025 (ออนไลน์; อาจไม่มีรูป)
  "13": {
    coverUrl:
      "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=1600&auto=format&fit=crop",
    staff: { current: 2, max: 5 },
  },

  // 12: tech-communication-101-2025
  "12": {
    coverUrl:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=1600&auto=format&fit=crop",
    staff: { current: 3, max: 6 },
  },

  // 14: design-thinking-lab-2025
  "14": {
    coverUrl:
      "https://images.unsplash.com/photo-1553877522-43269d4ea984?q=80&w=1600&auto=format&fit=crop",
    staff: { current: 2, max: 6 },
  },

  // 15: cmu-hack-night-2025
  "15": {
    coverUrl:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1600&auto=format&fit=crop",
    staff: { current: 5, max: 10 },
  },

  // 16: soft-skills-essentials-2025
  "16": {
    coverUrl:
      "https://bernardmarr.com/wp-content/uploads/2022/09/Top-16-Essential-Soft-Skills-For-The-Future-Of-Work.jpg",
    staff: { current: 1, max: 4 },
  },

  // 17: alumni-networking-2025
  "17": {
    coverUrl:
      "https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=1600&auto=format&fit=crop",
    staff: { current: 2, max: 5 },
  },
};

/* ===================== สร้าง ENRICH_BY_ID พร้อม chips ===================== */
export const ENRICH_BY_ID: Record<string, EventEnrich> = Object.fromEntries(
  Object.entries(ENRICH_BASE).map(([id, v]) => [
    id,
    { ...v, chips: getAudienceChipsFor(id) },
  ])
);