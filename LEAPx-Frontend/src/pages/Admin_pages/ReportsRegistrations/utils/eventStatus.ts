export type EventStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "COMPLETED"
  | "CANCELLED";

interface EventStatusInput {
  status: string;
  registrationStart?: string;
  registrationEnd?: string;
  activityStart: string;
  activityEnd: string;
}

export function mapEventStatus(event: EventStatusInput) {
  const now = new Date();

  const registrationStart = event.registrationStart
    ? new Date(event.registrationStart)
    : null;

  const registrationEnd = event.registrationEnd
    ? new Date(event.registrationEnd)
    : null;

  const activityStart = new Date(event.activityStart);
  const activityEnd = new Date(event.activityEnd);

  /* ===== HARD STATUS (override จาก backend) ===== */

  if (event.status === "CANCELLED") {
    return {
      label: "ยกเลิกกิจกรรม",
      className: "bg-red-500 text-white",
    };
  }

  if (event.status === "DRAFT") {
    return {
      label: "แบบร่าง",
      className: "bg-yellow-500 text-white",
    };
  }

  if (event.status === "COMPLETED") {
    return {
      label: "เสร็จสิ้น (ปิดกิจกรรม)",
      className: "bg-green-600 text-white",
    };
  }

  /* ===== FLOW ของ PUBLISHED ===== */

  if (event.status === "PUBLISHED") {
    // ยังไม่เปิดลงทะเบียน
    if (registrationStart && now < registrationStart) {
      return {
        label: "ยังไม่เปิดลงทะเบียน",
        className: "bg-slate-400 text-white",
      };
    }

    // กำลังเปิดลงทะเบียน
    if (
      registrationStart &&
      registrationEnd &&
      now >= registrationStart &&
      now <= registrationEnd
    ) {
      return {
        label: "กำลังเปิดลงทะเบียน",
        className: "bg-purple-500 text-white",
      };
    }

    // ปิดลงทะเบียน รอเริ่มกิจกรรม
    if (registrationEnd && now > registrationEnd && now < activityStart) {
      return {
        label: "ปิดลงทะเบียนแล้ว",
        className: "bg-orange-500 text-white",
      };
    }

    // กำลังจัดกิจกรรม
    if (now >= activityStart && now <= activityEnd) {
      return {
        label: "กำลังดำเนินกิจกรรม",
        className: "bg-blue-500 text-white",
      };
    }

    // จบกิจกรรม (แต่ยังไม่ mark completed)
    if (now > activityEnd) {
      return {
        label: "กิจกรรมสิ้นสุด",
        className: "bg-gray-400 text-white",
      };
    }
  }

  return {
    label: "ไม่ทราบสถานะ",
    className: "bg-gray-300 text-black",
  };
}