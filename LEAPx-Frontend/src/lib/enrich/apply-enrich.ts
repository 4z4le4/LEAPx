import type { EventDetail } from "../../../types/event/event-detail";
import { ENRICH_BY_ID } from "../../data/events.enrich";

export function applyEventEnrich(detail: EventDetail): EventDetail {
  const add = ENRICH_BY_ID[detail.id]; // key ใน enrich คือ "string" ของ id
  if (!add) return detail;

  return {
    ...detail,
    // ใช้ coverUrl จาก enrich เฉพาะกรณีที่ detail ไม่มีรูป (หรืออยาก override ก็เปลี่ยนเงื่อนไขได้)
    coverUrl: detail.coverUrl ?? add.coverUrl ?? null,

    // ถ้าอยากให้ enrich บังคับ override lat/lng ก็เปลี่ยนเป็น add.lat ?? detail.lat
    lat: add.lat ?? detail.lat,
    lng: add.lng ?? detail.lng,

    // รวม staff: default -> detail → enrich
    staff: {
      current: add.staff?.current ?? detail.staff.current,
      max: add.staff?.max ?? detail.staff.max,
    },

    // chips: ถ้า enrich มีให้ ใช้อันนั้น; ถ้าไม่มีให้คงของเดิม
    chips: add.chips ?? detail.chips,
  };
}