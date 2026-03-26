import { useParams } from "react-router-dom";
import useSWR from "swr";
import EventForm from "./EventForm";
import type { Participant } from "../../../../types/api/event";
import type {
  DayExpConfig,
  ExpActivityType,
} from "../../../components/Event/exp/EventExpPerDayEditor";
import { backend_url } from "../../../../utils/constants";

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to fetch: ${res.status}`);
  }
  return res.json();
};

// shape ของ event (อันนี้ให้ตรงกับที่ backend ส่งจริง ๆ)
type ApiEventDetail = {
  id: number;

  title_TH: string;
  title_EN: string;
  description_TH?: string | null;
  description_EN?: string | null;

  activityStart: string;
  activityEnd: string;
  registrationStart: string;
  registrationEnd: string;

  isOnline: boolean;
  meetingLink?: string | null;
  location_TH?: string | null;
  location_EN?: string | null;
  locationMapUrl?: string | null;

  maxParticipants: number;
  walkinCapacity: number;
  maxStaffCount: number;
  walkinEnabled?: boolean;
  waitlistEnabled?: boolean;

  staffCommunicationLink?: string | null;

  lateCheckInPenalty: number;
  staffEarlyCheckInMins: number;
  noScoreAfterMins: number;

  checkInStart?: string | null;
  checkInEnd?: string | null;

  majorCategory_id?: number | null;

  isForCMUEngineering?: boolean;
  allowedYearLevels?: number[] | null;
  staffAllowedYears?: number[] | null;

  status?: "DRAFT" | "PUBLISHED" | "COMPLETED" | "CANCELLED";
  eventMode?: "public" | "private";

  // EXP แบบละเอียดจาก backend (ให้ type ตรงกับ EventForm)
  expByDay?: DayExpConfig[];

  checkInTimeSlots?: {
    startTime?: string | null;
    endTime?: string | null;
    subSkillCategory_id?: {
      id?: number;
      level?: ExpActivityType | null;
    }[];
  }[];

  requirePredeterminedList?: boolean;

  // ต้องเป็น Participant[] ไม่ใช่ unknown เพื่อให้ assign เข้า EventInitialData ได้
  predeterminedParticipants?: Participant[];

  slug?: string;
};

// *** ตรงนี้คือ key สำคัญ: ห่อด้วย success/data ***
type ApiEventDetailResponse = {
  success: boolean;
  data: ApiEventDetail;
};

export default function EditEventPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data, error, isLoading } = useSWR<ApiEventDetailResponse>(
    slug ? `${backend_url}/api/events/slug/${slug}` : null,
    fetcher
  );

  if (!slug) {
    return (
      <div className="p-6 text-sm text-red-600">ไม่พบ slug กิจกรรมใน URL</div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-20 text-sm text-slate-600 text-center">
        กำลังโหลดข้อมูลกิจกรรม…
      </div>
    );
  }

  if (error || !data?.success || !data.data) {
    return (
      <div className="p-6 text-sm text-red-600">โหลดข้อมูลกิจกรรมไม่สำเร็จ</div>
    );
  }

  const event = data.data;

  return <EventForm mode="edit" initialData={event} eventId={event.id} />;
}
