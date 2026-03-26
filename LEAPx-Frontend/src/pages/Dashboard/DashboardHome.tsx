// src/pages/Dashboard/DashboardHome.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useSWR from "swr";

import Navbar from "../../components/Navbar/Navbar";
import PrimaryFooter from "../../components/Footer/PrimaryFooter";
import { ROUTES } from "../../routes";
import LEAPBanner from "../../assets/banner/LEAPBanner.png";
import EventFilterBar from "../../components/Event/EventFilterBar";
import type { UiStatus, EventCardModel } from "../../../types/ui/events";
import { uniq } from "../../../utils/eventsMapping";
import EventCardMini, {
  type EventCardMiniExtra,
} from "../../components/Event/EventCardMini";
import BannerSlider from "../../components/Event/BannerSlider";
import { useTranslation } from "react-i18next";

/* ===================== Debounce Hook ===================== */
function useDebounce<T>(value: T, delayMilliseconds: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMilliseconds);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [value, delayMilliseconds]);

  return debouncedValue;
}

/* ===================== mapper สำหรับ /api/events/public ===================== */

type PublicPhoto =
  | string
  | {
      url?: string;
      src?: string;
      path?: string;
      photoUrl?: string;
    };

type PublicMajorCategory = {
  id: number;
  name_TH: string;
  name_EN: string;
  code?: string;
};

type PublicEventStateFromBackend = {
  isRegistrationOpen?: boolean;
  isEventOngoing?: boolean;
  isEventPast?: boolean;
  isFull?: boolean;
};

type PublicEvent = {
  id: number;
  slug: string;
  title_TH: string;
  title_EN: string;
  description_TH?: string;
  description_EN?: string;

  majorCategory?: PublicMajorCategory | null;

  maxParticipants?: number | null;
  currentParticipants?: number | null;
  maxStaffCount?: number | null;
  currentStaffCount?: number | null;

  registrationStart?: string | null;
  registrationEnd?: string | null;
  activityStart?: string;
  activityEnd?: string;

  location_TH?: string;
  location_EN?: string;
  isOnline?: boolean;

  isForCMUEngineering?: boolean;
  allowedYearLevels?: number[] | null;
  staffAllowedYears?: number[] | null;
  walkinEnabled?: boolean;

  photos?: PublicPhoto[];
  skillRewards?: {
    id: number;
    baseExperience: number;
    bonusExperience: number;
    subSkillCategory: {
      id: number;
      name_TH: string;
      name_EN: string;
      slug: string;
      icon?: string | null;
      color?: string | null;
      mainSkillCategory: {
        id: number;
        name_TH: string;
        name_EN: string;
        icon?: string | null;
        color?: string | null;
      };
    };
  }[];

  availableSlots?: number;
  isFull?: boolean;

  state?: PublicEventStateFromBackend;

  // ของเก่า (เผื่อหลงเหลือ)
  status?: {
    isRegistrationOpen: boolean;
    isEventOngoing: boolean;
    isEventPast: boolean;
    canRegister: boolean;
  };
};

type PublicEventsResponse = {
  success: boolean;
  data: PublicEvent[];
  pagination?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
    hasMore?: boolean;
  };
};

type TranslationFunction = (key: string, options?: Record<string, unknown>) => string;

function isThaiLanguage(language?: string): boolean {
  return Boolean(language && language.toLowerCase().startsWith("th"));
}

/* ===================== status จาก backend state (หลัก) ===================== */
// คำนวณสถานะ UI ของกิจกรรมจากสถานะที่ backend ส่งมา
function convertUtcIsoStringToAssumedBangkokTime(isoString?: string | null): number {
  if (!isoString) return NaN;

  const utcTime = new Date(isoString).getTime();
  if (Number.isNaN(utcTime)) return NaN;

  // ลบ 7 ชั่วโมง เพื่อชดเชยว่าคนกรอกคิดเป็นเวลาไทย
  return utcTime - 7 * 60 * 60 * 1000;
}

// คำนวณสถานะ UI ของกิจกรรมจากเวลาปัจจุบันเทียบกับเวลาที่เก็บใน DB
function computeUiStatusFromDatabaseTime(
  event: PublicEvent,
  now = Date.now()
): UiStatus {
  const registrationStartTime =
    convertUtcIsoStringToAssumedBangkokTime(event.registrationStart);

  const registrationEndTime =
    convertUtcIsoStringToAssumedBangkokTime(event.registrationEnd);

  const activityEndTime =
    convertUtcIsoStringToAssumedBangkokTime(event.activityEnd);

  if (!Number.isNaN(activityEndTime) && now > activityEndTime) {
    return "CLOSED";
  }

  if (!Number.isNaN(registrationStartTime) && now < registrationStartTime) {
    return "SOON";
  }

  if (
    (Number.isNaN(registrationStartTime) || now >= registrationStartTime) &&
    (Number.isNaN(registrationEndTime) || now <= registrationEndTime)
  ) {
    return "OPEN";
  }

  return "CLOSED";
}


/* ===================== audience chips ===================== */

function buildAudienceBadges(publicEvent: PublicEvent, translate: TranslationFunction): string[] {
  const badges: string[] = [];

  if (publicEvent.isForCMUEngineering) {
    badges.push(translate("activityDetail:chips.engineeringStudents"));
  }

  const allowedYearLevels = publicEvent.allowedYearLevels ?? [];

  if (!allowedYearLevels || allowedYearLevels.length === 0) {
    badges.push(translate("activityDetail:chips.allStudents"));
  } else {
    const uniqueSortedYearLevels = Array.from(new Set(allowedYearLevels)).sort((a, b) => a - b);
    uniqueSortedYearLevels.forEach((yearLevel) => {
      badges.push(translate("activityDetail:chips.year", { year: yearLevel }));
    });
  }

  return badges;
}

/* ===================== image helper ===================== */

function extractImageUrl(photos?: PublicPhoto[]): string | null {
  if (!photos || photos.length === 0) return null;

  const firstPhoto = photos[0];
  if (typeof firstPhoto === "string") return firstPhoto;

  return firstPhoto.photoUrl ?? firstPhoto.url ?? firstPhoto.src ?? firstPhoto.path ?? null;
}

function getMajorCategoryCode(publicEvent: PublicEvent): string | null {
  const code = (publicEvent.majorCategory?.code ?? "").trim();
  return code || null;
}

/* ===================== mapper → EventCardModel ===================== */

function mapPublicToCard(
  rawEvent: PublicEvent,
  translate: TranslationFunction,
  language: string
): EventCardModel & EventCardMiniExtra {
  const isThai = isThaiLanguage(language);

  const titleThai = rawEvent.title_TH || "";
  const titleEnglish = rawEvent.title_EN || "";
  const displayTitle = isThai
    ? titleThai || titleEnglish || "กิจกรรม"
    : titleEnglish || titleThai || "Activity";

  const locationThai =
    rawEvent.location_TH || (rawEvent.isOnline ? "ออนไลน์" : "ยังไม่ระบุสถานที่") || "";
  const locationEnglish =
    rawEvent.location_EN || (rawEvent.isOnline ? "Online" : "Location not specified") || "";
  const displayLocation = isThai ? locationThai || locationEnglish : locationEnglish || locationThai;

  const skillMainThai = uniq(
    (rawEvent.skillRewards ?? [])
      .map((reward) => reward.subSkillCategory?.mainSkillCategory?.name_TH)
      .filter((x): x is string => Boolean(x && x.trim()))
  );

  const skillMainEnglish = uniq(
    (rawEvent.skillRewards ?? [])
      .map((reward) => reward.subSkillCategory?.mainSkillCategory?.name_EN)
      .filter((x): x is string => Boolean(x && x.trim()))
  );

  const pickedSkills =
    (isThai ? skillMainThai : skillMainEnglish).length > 0
      ? isThai
        ? skillMainThai
        : skillMainEnglish
      : skillMainThai.length > 0
      ? skillMainThai
      : skillMainEnglish.length > 0
      ? skillMainEnglish
      : [isThai ? "ทั่วไป" : "General"];

  const audienceBadges = buildAudienceBadges(rawEvent, translate);
  const imageUrl = extractImageUrl(rawEvent.photos);

  const participantsMaximum =
    typeof rawEvent.maxParticipants === "number" ? rawEvent.maxParticipants : 0;
  const participantsCurrent =
    typeof rawEvent.currentParticipants === "number" ? rawEvent.currentParticipants : 0;

  const staffMaximum =
    typeof rawEvent.maxStaffCount === "number" ? rawEvent.maxStaffCount : undefined;
  const staffCurrent =
    typeof rawEvent.currentStaffCount === "number" ? rawEvent.currentStaffCount : undefined;

  const activityStartTimestamp = rawEvent.activityStart ? new Date(rawEvent.activityStart).getTime() : Number.NaN;
  const activityEndTimestamp = rawEvent.activityEnd ? new Date(rawEvent.activityEnd).getTime() : Number.NaN;

  const activityHours =
    !Number.isNaN(activityStartTimestamp) &&
    !Number.isNaN(activityEndTimestamp) &&
    activityEndTimestamp > activityStartTimestamp
      ? Math.round((activityEndTimestamp - activityStartTimestamp) / 36e5)
      : 0;

  const majorCategoryCode = getMajorCategoryCode(rawEvent);

  return {
    id: String(rawEvent.id),
    slug: rawEvent.slug,
    title: displayTitle,
    badges: audienceBadges,
    hours: activityHours,
    date: rawEvent.activityStart || new Date().toISOString(),
    location: displayLocation,
    skills: pickedSkills,
    contact: "",
    status: computeUiStatusFromDatabaseTime(rawEvent),

    regStart: rawEvent.registrationStart || undefined,
    imageUrl,
    capacity: {
      participantsMax: participantsMaximum,
      participantsNow: participantsCurrent,
      staffMax: staffMaximum,
      staffNow: staffCurrent,
    },
    chips: audienceBadges.map((label, index) => ({
      id: `${rawEvent.id}-aud-${index}`,
      kind: "audience",
      label,
    })),

    majorCategoryCode,

    title_TH: titleThai,
    title_EN: titleEnglish,
    location_TH: locationThai,
    location_EN: locationEnglish,
    skills_TH: skillMainThai,
    skills_EN: skillMainEnglish,
  };
}

/* ===================== SWR Fetcher ===================== */

const fetcher = async (url: string): Promise<PublicEventsResponse> => {
  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const json = await response.json();
  if (!json?.success || !Array.isArray(json.data)) throw new Error("Invalid response");

  return json as PublicEventsResponse;
};

/* ===================== PAGE ===================== */

type FilterChange = {
  q?: string;
  status?: "all" | UiStatus;
  dateSort?: "asc" | "desc";
};

function normalizeLanguage(raw?: string | null): "th" | "en" | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.startsWith("th")) return "th";
  if (lower.startsWith("en")) return "en";
  return null;
}

export default function DashboardHome() {
  const { t, i18n } = useTranslation("dashboardHome");

  useEffect(() => {
    const storedLanguage =
      normalizeLanguage(localStorage.getItem("leap_lang")) ||
      normalizeLanguage(localStorage.getItem("i18nextLng"));
    if (storedLanguage && storedLanguage !== normalizeLanguage(i18n.language)) {
      void i18n.changeLanguage(storedLanguage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const currentLanguage = normalizeLanguage(i18n.language) || "th";
    localStorage.setItem("leap_lang", currentLanguage);
    localStorage.setItem("i18nextLng", currentLanguage);
  }, [i18n.language]);

  const language = normalizeLanguage(i18n.language) || "th";

  const [searchQuery, setSearchQuery] = useState("");
  const [dateSortOrder, setDateSortOrder] = useState<"asc" | "desc">("asc");
  const [statusFilter, setStatusFilter] = useState<"all" | UiStatus>("all");

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const backendBaseUrl = import.meta.env.VITE_LEAP_BACKEND_URL as string;

  const queryString = new URLSearchParams({
    page: "1",
    limit: "100",
    sortBy: "activityStart",
    sortOrder: dateSortOrder,
    isOnline: "false",
    ...(debouncedSearchQuery ? { search: debouncedSearchQuery } : {}),
  });

  const url = `${backendBaseUrl}/api/events/public?${queryString.toString()}`;

  const { data, error, isLoading } = useSWR<PublicEventsResponse>(url, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
    keepPreviousData: true,
  });

  const events = useMemo(() => {
    if (!data?.data) return [];
    return data.data.map((rawEvent) => mapPublicToCard(rawEvent, t, language));
  }, [data, t, language]);

  const filteredEvents = useMemo(() => {
    const searchText = searchQuery.trim().toLowerCase();

    const matchesSearch = (event: EventCardModel) => {
      if (!searchText) return true;
      const title = (event.title ?? "").toLowerCase();
      const location = (event.location ?? "").toLowerCase();
      const skills = Array.isArray(event.skills)
        ? event.skills.map((x) => (x ?? "").toLowerCase())
        : [];
      return (
        title.includes(searchText) ||
        location.includes(searchText) ||
        skills.some((x) => x.includes(searchText))
      );
    };

    const matchesStatus = (event: EventCardModel) =>
      statusFilter === "all" || event.status === statusFilter;

    return events.filter((event) => matchesSearch(event) && matchesStatus(event));
  }, [events, searchQuery, statusFilter]);

  const upcomingEvents = filteredEvents
    .filter((event) => +new Date(event.date) >= Date.now())
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-[#f7f8f9]">
      <Navbar />

      <BannerSlider
        fetchUrl={`${backendBaseUrl}/api/media?type=banner`}
        fallbackItems={[{ src: LEAPBanner, alt: "LEAP 2025" }]}
        heightClass="h-[220px] md:h-[320px] lg:h-[420px]"
        autoPlayMs={4500}
        pauseOnHover
        rounded="rounded-2xl"
      />

      <div className="max-w-6xl mx-auto px-4 mt-10 mb-6">
        <EventFilterBar
          q={searchQuery}
          status={statusFilter}
          dateSort={dateSortOrder}
          onChange={(next: FilterChange) => {
            if (typeof next.q !== "undefined") setSearchQuery(next.q);
            if (typeof next.status !== "undefined") setStatusFilter(next.status);
            if (typeof next.dateSort !== "undefined") setDateSortOrder(next.dateSort);
          }}
        />
      </div>

      <section className="mx-auto max-w-6xl px-4 pt-4">
        {isLoading && (
          <div className="mt-20 mb-20 text-slate-500 text-center">
            {t("loadingActivities")}
          </div>
        )}
        {!isLoading && error && (
          <div className="text-rose-600">
            {t("loadErrorPrefix")}: {error?.message || t("loadErrorFallback")}
          </div>
        )}

        {!isLoading && !error && filteredEvents.length === 0 && (
          <div className="mt-10 mb-10 text-slate-600 text-center">
            {t("activitiesPage:noActivities")}
          </div>
        )}
      </section>

      {!isLoading && filteredEvents.length > 0 && upcomingEvents.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 mb-10">
          <div className="mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-black">
              {t("upcomingTitle")}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {upcomingEvents.map((event) => (
              <EventCardMini
                key={event.id}
                ev={event as EventCardModel & EventCardMiniExtra}
              />
            ))}
          </div>
        </section>
      )}

      {!isLoading && filteredEvents.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-14">
          <div className="mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-black">
              {t("allTitle")}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredEvents.slice(0, 4).map((event) => (
              <EventCardMini
                key={event.id}
                ev={event as EventCardModel & EventCardMiniExtra}
              />
            ))}
          </div>
          <div className="text-center mt-6">
            <Link
              to={ROUTES.ACTIVITIES.ROOT ?? "/activities"}
              className="inline-block px-5 py-2 rounded-xl border bg-white hover:bg-slate-50"
            >
              {t("seeMore")}
            </Link>
          </div>
        </section>
      )}

      <PrimaryFooter />
    </div>
  );
}
