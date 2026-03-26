import { useEffect, useState } from "react";
import { backend_url } from "../../../../../utils/constants";
import type { EventDetail } from "../types/eventDetail.types";

type Participant = {
  registrationId: number;
  studentId: number;
  fullName: string;
  status: string;
  statusDate?: string;
  totalExpEarned?: number;
  skills?: { skillName_TH: string }[];
};

type ParticipantsResponse = {
  participants: Participant[];
  pagination?: {
    page: number;
    totalPages: number;
    hasMore: boolean;
  };
};
export function useEventParticipants(
  eventId?: string,
  page = 1,
  search = "",
  status = ""
) {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [data, setData] = useState<ParticipantsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;

    async function load() {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          page: String(page),
          limit: "20",
        });

        if (search) params.append("search", search);
        if (status) params.append("status", status);

        const res = await fetch(
          `${backend_url}/api/events/${eventId}/participants?${params.toString()}`,
          {
            credentials: "include",
          }
        );

        if (!res.ok) throw new Error("Failed to fetch participants");

        const json = await res.json();

        const payload = json.data;

        const eventRaw = payload?.event;

        // ✅ safe mapping
        const mappedEvent: EventDetail = {
          id: eventRaw.id,
          slug: eventRaw.slug ?? "",
          title_TH: eventRaw.title_TH,
          title_EN: eventRaw.title_EN,

          status: eventRaw.status,

          activityStart: eventRaw.activityStart,
          activityEnd: eventRaw.activityEnd,

          registrationStart: eventRaw.registrationStart,
registrationEnd: eventRaw.registrationEnd,

          maxParticipants: eventRaw.maxParticipants ?? 0,
          currentParticipants: eventRaw.currentParticipants ?? 0,

          maxStaffCount: eventRaw.maxStaffCount ?? 0,
          currentStaffCount: eventRaw.currentStaffCount ?? 0,

          walkinCapacity: eventRaw.walkinCapacity ?? 0,
          currentWalkins: eventRaw.currentWalkins ?? 0,

          photos: eventRaw.photos ?? [],
          majorCategory: eventRaw.majorCategory ?? null,
        };

        setEvent(mappedEvent);
        setParticipants(payload?.participants ?? []);
        setData(payload ?? null);

      } catch (err) {
        console.error(err);
        setError("โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [eventId, page, search, status]);

  return {
    event,
    participants,
    data,
    loading,
    error,
  };
}