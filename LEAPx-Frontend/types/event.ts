export type ChipKind = "audience" | "year" | "skill" | "tag";

export type Chip = {
  id: string;            // unique key
  kind: ChipKind;        // ชนิดชิป
  label: string;         // ข้อความที่โชว์
  value?: string | number; // เก็บค่าเชิงข้อมูล (เช่น 1 สำหรับปี 1)
};

export type EventDetail = {
  id: string;
  title: string;
  coverUrl: string | null;
  dateText: string;
  timeText: string;
  venueText: string;
  lat?: number | null;
  lng?: number | null;
  addressForMap?: string | null; // เผื่อไม่มีพิกัด อยากใช้คำค้นที่อยู่แทน
  skillText?: string;          // เพิ่ม
  chips?: Chip[];              // เพิ่ม
  description: string;
  locationImageUrl?: string | null;
  participants: { current: number; max: number };
  staff: { current: number; max: number };
  canRegisterOnsite: boolean;
  canRegisterOnline: boolean;
};