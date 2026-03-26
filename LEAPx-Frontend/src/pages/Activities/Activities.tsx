// src/pages/Activities/Activities.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import useSWRInfinite from "swr/infinite";
import { useSearchParams } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import PrimaryFooter from "../../components/Footer/PrimaryFooter";
import EventCardMini, {
  type EventCardMiniExtra,
} from "../../components/Event/EventCardMini";
import type { EventCardModel, UiStatus } from "../../../types/ui/events";
import EventFilterBar, {
  type MajorCategoryOption,
} from "../../components/Event/EventFilterBar";
import { useTranslation } from "react-i18next";
import CompactPagination from "../../components/Pagination/CompactPagination";

/* ===================== local utils ===================== */

const CLIENT_SIDE_PAGE_SIZE = 12;
const FETCH_PAGE_SIZE_FROM_BACKEND = 50;

const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

function useDebounce<T>(value: T, delayMilliseconds: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handlerId = window.setTimeout(() => setDebouncedValue(value), delayMilliseconds);
    return () => window.clearTimeout(handlerId);
  }, [value, delayMilliseconds]);

  return debouncedValue;
}

type TranslationFunction = (key: string, options?: Record<string, unknown>) => string;

function normalizeLanguage(raw?: string | null): "th" | "en" | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.startsWith("th")) return "th";
  if (lower.startsWith("en")) return "en";
  return null;
}

function isThaiLanguage(language?: string): boolean {
  return Boolean(language && language.toLowerCase().startsWith("th"));
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function parseUiStatus(value: string | null): "all" | UiStatus {
  if (!value) return "all";
  if (value === "SOON" || value === "OPEN" || value === "CLOSED") return value;
  return "all";
}

function parseDateSort(value: string | null): "asc" | "desc" {
  if (value === "desc") return "desc";
  return "asc";
}

/* ===================== Types ===================== */

type PublicPhoto =
  | string
  | {
      url?: string;
      src?: string;
      path?: string;
      photoUrl?: string;
    };

type PublicMajorCategory =
  | {
      id: number;
      name_TH: string;
      name_EN: string;
      code?: string;
    }
  | null
  | undefined;

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

  availableSlots?: number;
  isFull?: boolean;

  isForCMUEngineering?: boolean;
  allowedYearLevels?: number[] | null;
  staffAllowedYears?: number[] | null;
  walkinEnabled?: boolean;

  photos?: PublicPhoto[];
  skillRewards?: Array<{
    subSkillCategory?: {
      name_TH?: string;
      name_EN?: string;
      mainSkillCategory?: {
        name_TH?: string;
        name_EN?: string;
      };
    };
  }>;

  majorCategory?: PublicMajorCategory;

  state?: PublicEventStateFromBackend;

  // ของเก่า เผื่อยังส่งมา
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

type EventCardWithMajor = (EventCardModel & EventCardMiniExtra) & {
  majorCategoryId?: string | null;

  title_TH?: string;
  title_EN?: string;
  location_TH?: string;
  location_EN?: string;
  skills_TH?: string[];
  skills_EN?: string[];
};

/* ===================== helpers ===================== */

function getMajorCategoryId(publicEvent: PublicEvent): string | null {
  const majorCategory = publicEvent.majorCategory;
  if (!majorCategory) return null;
  if (typeof majorCategory === "object" && typeof majorCategory.id === "number") return String(majorCategory.id);
  return null;
}

function getMajorCategoryCode(publicEvent: PublicEvent): string | null {
  const majorCategory = publicEvent.majorCategory;
  if (!majorCategory) return null;
  if (typeof majorCategory === "object") {
    const code = (majorCategory.code ?? "").trim();
    return code || null;
  }
  return null;
}
// แปลงเวลา ISO ที่เก็บเป็น UTC ใน DB เป็น timestamp ที่สมมติว่าเป็นเวลาในกรุงเทพ
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

function extractImageUrl(photos?: PublicPhoto[]): string | null {
  if (!photos || photos.length === 0) return null;
  const firstPhoto = photos[0];
  if (typeof firstPhoto === "string") return firstPhoto;
  return firstPhoto.photoUrl ?? firstPhoto.url ?? firstPhoto.src ?? firstPhoto.path ?? null;
}

const mapPublicToCard = (
  rawEvent: PublicEvent,
  translate: TranslationFunction,
  language: string
): EventCardWithMajor => {
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

  const activityStartTimestamp = rawEvent.activityStart ? new Date(rawEvent.activityStart).getTime() : Number.NaN;
  const activityEndTimestamp = rawEvent.activityEnd ? new Date(rawEvent.activityEnd).getTime() : Number.NaN;

  const activityHours =
    !Number.isNaN(activityStartTimestamp) &&
    !Number.isNaN(activityEndTimestamp) &&
    activityEndTimestamp > activityStartTimestamp
      ? Math.round((activityEndTimestamp - activityStartTimestamp) / 36e5)
      : 0;

  const skillsThai = uniq(
    (rawEvent.skillRewards ?? [])
      .map((reward) => reward.subSkillCategory?.mainSkillCategory?.name_TH)
      .filter((x): x is string => Boolean(x && x.trim()))
  );

  const skillsEnglish = uniq(
    (rawEvent.skillRewards ?? [])
      .map((reward) => reward.subSkillCategory?.mainSkillCategory?.name_EN)
      .filter((x): x is string => Boolean(x && x.trim()))
  );

  const pickedSkills =
    (isThai ? skillsThai : skillsEnglish).length > 0
      ? isThai
        ? skillsThai
        : skillsEnglish
      : skillsThai.length > 0
      ? skillsThai
      : skillsEnglish.length > 0
      ? skillsEnglish
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

  const majorCategoryId = getMajorCategoryId(rawEvent);
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

    majorCategoryId,
    majorCategoryCode,

    title_TH: titleThai,
    title_EN: titleEnglish,
    location_TH: locationThai,
    location_EN: locationEnglish,
    skills_TH: skillsThai,
    skills_EN: skillsEnglish,
  };
};

const fetcher = async (url: string): Promise<PublicEventsResponse> => {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const json = await response.json();
  if (!json?.success || !Array.isArray(json.data)) throw new Error("Invalid response");
  return json as PublicEventsResponse;
};

/* ===================== PAGE ===================== */

export default function Activities() {
  const { t, i18n } = useTranslation("activitiesPage");
  const [searchParams, setSearchParams] = useSearchParams();

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
  const isThai = language === "th";

  const initialSearchQuery = searchParams.get("q") ?? "";
  const initialStatusFilter = parseUiStatus(searchParams.get("status"));
  const initialDateSortOrder = parseDateSort(searchParams.get("dateSort"));
  const initialMajorCategoryId = searchParams.get("majorCategoryId") ?? "";
  const initialPageNumber = clampInteger(Number(searchParams.get("page") ?? "1"), 1, 999999);

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [dateSortOrder, setDateSortOrder] = useState<"asc" | "desc">(initialDateSortOrder);
  const [pageNumber, setPageNumber] = useState(initialPageNumber);
  const [statusFilter, setStatusFilter] = useState<"all" | UiStatus>(initialStatusFilter);
  const [majorCategoryId, setMajorCategoryId] = useState<string>(initialMajorCategoryId);

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    const nextSearchQuery = searchParams.get("q") ?? "";
    const nextStatusFilter = parseUiStatus(searchParams.get("status"));
    const nextDateSortOrder = parseDateSort(searchParams.get("dateSort"));
    const nextMajorCategoryId = searchParams.get("majorCategoryId") ?? "";
    const nextPageNumber = clampInteger(Number(searchParams.get("page") ?? "1"), 1, 999999);

    if (nextSearchQuery !== searchQuery) setSearchQuery(nextSearchQuery);
    if (nextStatusFilter !== statusFilter) setStatusFilter(nextStatusFilter);
    if (nextDateSortOrder !== dateSortOrder) setDateSortOrder(nextDateSortOrder);
    if (nextMajorCategoryId !== majorCategoryId) setMajorCategoryId(nextMajorCategoryId);
    if (nextPageNumber !== pageNumber) setPageNumber(nextPageNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    const nextSearchParams = new URLSearchParams();

    if (searchQuery.trim()) nextSearchParams.set("q", searchQuery.trim());
    if (statusFilter !== "all") nextSearchParams.set("status", statusFilter);
    if (dateSortOrder !== "asc") nextSearchParams.set("dateSort", dateSortOrder);
    if (majorCategoryId) nextSearchParams.set("majorCategoryId", majorCategoryId);
    if (pageNumber !== 1) nextSearchParams.set("page", String(pageNumber));

    setSearchParams(nextSearchParams, { replace: true });
  }, [searchQuery, statusFilter, dateSortOrder, majorCategoryId, pageNumber, setSearchParams]);

  const backendBaseUrl = import.meta.env.VITE_LEAP_BACKEND_URL as string;

  const getKey = (index: number, previousPageData: PublicEventsResponse | null) => {
    if (previousPageData?.pagination?.hasMore === false) return null;

    const pageIndex = index + 1;
    const queryString = new URLSearchParams({
      page: String(pageIndex),
      limit: String(FETCH_PAGE_SIZE_FROM_BACKEND),
      sortBy: "activityStart",
      sortOrder: "asc",
      isOnline: "false",
    });

    return `${backendBaseUrl}/api/events/public?${queryString.toString()}`;
  };

  const {
    data: pages,
    error,
    isLoading,
    isValidating,
    size,
    setSize,
  } = useSWRInfinite<PublicEventsResponse>(getKey, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 2000,
  });

  useEffect(() => {
    const totalPagesFromBackend = pages?.[0]?.pagination?.totalPages;
    if (!totalPagesFromBackend || totalPagesFromBackend <= 1) return;
    if (size < totalPagesFromBackend) {
      void setSize(totalPagesFromBackend);
    }
  }, [pages, size, setSize]);

  const totalPagesFromBackend = pages?.[0]?.pagination?.totalPages ?? 1;
  const allPagesLoaded = (pages?.length ?? 0) >= totalPagesFromBackend;
  const isFetchingAllPages = isValidating && !allPagesLoaded;

  const allRows: PublicEvent[] = useMemo(() => {
    if (!pages) return [];
    return pages.flatMap((page) => page?.data ?? []);
  }, [pages]);

  const majorCategoryOptions: MajorCategoryOption[] = useMemo(() => {
    const majorCategoryMap = new Map<number, MajorCategoryOption>();

    allRows.forEach((event) => {
      const majorCategory = event.majorCategory;
      if (majorCategory && typeof majorCategory === "object" && typeof majorCategory.id === "number") {
        majorCategoryMap.set(majorCategory.id, {
          id: majorCategory.id,
          name_TH: majorCategory.name_TH,
          name_EN: majorCategory.name_EN,
        });
      }
    });

    const optionsArray = Array.from(majorCategoryMap.values());
    optionsArray.sort((a, b) => {
      const aName = (isThai ? a.name_TH : a.name_EN) || "";
      const bName = (isThai ? b.name_TH : b.name_EN) || "";
      return aName.localeCompare(bName, "th-TH");
    });

    return optionsArray;
  }, [allRows, isThai]);

  const allEvents: EventCardWithMajor[] = useMemo(() => {
    return allRows.map((event) => mapPublicToCard(event, t, language));
  }, [allRows, t, language]);

  const sortedEvents: EventCardWithMajor[] = useMemo(() => {
    const copied = [...allEvents];
    copied.sort((a, b) => {
      const aTimestamp = new Date(a.date).getTime();
      const bTimestamp = new Date(b.date).getTime();
      const safeA = Number.isNaN(aTimestamp) ? 0 : aTimestamp;
      const safeB = Number.isNaN(bTimestamp) ? 0 : bTimestamp;
      return safeA - safeB;
    });
    if (dateSortOrder === "desc") copied.reverse();
    return copied;
  }, [allEvents, dateSortOrder]);

  const filteredAll: EventCardWithMajor[] = useMemo(() => {
    const searchText = debouncedSearchQuery.trim().toLowerCase();

    const matchesSearch = (event: EventCardWithMajor) => {
      if (!searchText) return true;

      const title = (event.title ?? "").toLowerCase();
      const location = (event.location ?? "").toLowerCase();

      const titleThai = (event.title_TH ?? "").toLowerCase();
      const titleEnglish = (event.title_EN ?? "").toLowerCase();
      const locationThai = (event.location_TH ?? "").toLowerCase();
      const locationEnglish = (event.location_EN ?? "").toLowerCase();

      const skills = Array.isArray(event.skills) ? event.skills.map((x) => (x ?? "").toLowerCase()) : [];
      const skillsThai = Array.isArray(event.skills_TH) ? event.skills_TH.map((x) => (x ?? "").toLowerCase()) : [];
      const skillsEnglish = Array.isArray(event.skills_EN) ? event.skills_EN.map((x) => (x ?? "").toLowerCase()) : [];

      return (
        title.includes(searchText) ||
        location.includes(searchText) ||
        titleThai.includes(searchText) ||
        titleEnglish.includes(searchText) ||
        locationThai.includes(searchText) ||
        locationEnglish.includes(searchText) ||
        skills.some((x) => x.includes(searchText)) ||
        skillsThai.some((x) => x.includes(searchText)) ||
        skillsEnglish.some((x) => x.includes(searchText))
      );
    };

    const matchesStatus = (event: EventCardWithMajor) =>
      statusFilter === "all" || event.status === statusFilter;

    const matchesMajorCategory = (event: EventCardWithMajor) => {
      if (!majorCategoryId) return true;
      return String(event.majorCategoryId ?? "") === String(majorCategoryId);
    };

    return sortedEvents.filter(
      (event) => matchesSearch(event) && matchesStatus(event) && matchesMajorCategory(event)
    );
  }, [sortedEvents, debouncedSearchQuery, statusFilter, majorCategoryId]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setPageNumber(1);
  }, [debouncedSearchQuery, dateSortOrder, statusFilter, majorCategoryId]);

  const totalPages = Math.max(1, Math.ceil(filteredAll.length / CLIENT_SIDE_PAGE_SIZE));
  const safePageNumber = Math.min(pageNumber, totalPages);

  const startIndex = (safePageNumber - 1) * CLIENT_SIDE_PAGE_SIZE;
  const endIndex = startIndex + CLIENT_SIDE_PAGE_SIZE;
  const pagedEvents = filteredAll.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-[#f7f8f9]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-black">
            {t("title")}
          </h2>
        </div>

        <div className="mb-10">
          <EventFilterBar
            q={searchQuery}
            status={statusFilter}
            dateSort={dateSortOrder}
            majorCategoryId={majorCategoryId}
            majorCategoryOptions={majorCategoryOptions}
            onChange={(next) => {
              if (typeof next.q !== "undefined") setSearchQuery(next.q);
              if (typeof next.status !== "undefined") setStatusFilter(next.status);
              if (typeof next.dateSort !== "undefined") setDateSortOrder(next.dateSort);
              if (typeof next.majorCategoryId !== "undefined") setMajorCategoryId(next.majorCategoryId);
            }}
          />
        </div>

        {(isLoading || isFetchingAllPages) && (
          <div className="mt-20 mb-20 text-slate-500 text-center">
            {t("loadingActivities")}
          </div>
        )}

        {!isLoading && error && (
          <div className="text-rose-600">
            {t("loadError")}: {error?.message}
          </div>
        )}

        {!isLoading && !error && pagedEvents.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {pagedEvents.map((event) => (
              <EventCardMini
                key={event.id}
                ev={event as EventCardModel & EventCardMiniExtra}
              />
            ))}
          </div>
        )}

        {!isLoading && !error && pagedEvents.length === 0 && (
          <div className="text-slate-600">{t("noActivities")}</div>
        )}

        {!isLoading && !error && totalPages > 1 && (
          <div className="mt-8 flex justify-end">
  <CompactPagination
    currentPage={safePageNumber}
    totalPages={totalPages}
    onChange={(p) => setPageNumber(p)}
  />
</div>
        )}
      </div>

      <PrimaryFooter />
    </div>
  );
}
