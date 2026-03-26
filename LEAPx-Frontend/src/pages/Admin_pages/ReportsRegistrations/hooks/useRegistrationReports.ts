import { useEffect, useState } from "react";
import type { EventPhoto } from "../types/eventDetail.types";
import { backend_url } from "../../../../../utils/constants";
type Params = {
  search: string;
  category: string; // (ตอนนี้ backend ยังไม่ใช้)
  date: string;     // (ตอนนี้ backend ยังไม่ใช้)
  page: number;
  limit: number;
  sortBy: "date" | "participants";
};
type EventItem = {
  id: number;
  title_TH: string;
  title_EN?: string;

  status: string;

  activityStart?: string;
  activityEnd?: string;
  registrationStart?: string;
  registrationEnd?: string;

  maxParticipants: number;
  currentParticipants: number;

  maxStaffCount: number;
  currentStaffCount: number;

  walkinCapacity: number;
  currentWalkins: number;

  photos?: EventPhoto[];
  majorCategory?: {
    id: number;
    name_TH: string;
    code?: string;
  };
};

export function useRegistrationReports({
  search,
  page,
  limit,
  sortBy,
}: Params) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    totalPages: number;
    total: number;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchEvents() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),

          //ดึง event เก่ามา
          old_events: "true",

          // sort backend
          sortBy:
            sortBy === "participants"
              ? "currentParticipants"
              : "activityStart",
          sortOrder: "desc",
        });

        //search ใช้ backend filter
        if (search.trim()) {
          params.append("search", search.trim());
        }

        const res = await fetch(`${backend_url}/api/events?${params.toString()}`, {
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error("Failed to fetch events");
        }

        const json = await res.json();

        setEvents(json.data || []);
        setPagination(json.pagination || null);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error(err);
          setError("โหลดข้อมูลไม่สำเร็จ");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();

    return () => controller.abort();
  }, [search, page, limit, sortBy]);

  return {
    events,
    pagination,
    loading,
    error,
  };
}