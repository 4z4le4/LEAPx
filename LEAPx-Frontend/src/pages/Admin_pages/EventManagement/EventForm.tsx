import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { backend_url } from "../../../../utils/constants";
import {
  LoadingDialog,
  ResultDialog,
} from "../../../components/common/AsyncModal";
import { useAuth } from "../../../context/AuthContext";
import { ChevronLeft } from "lucide-react";
import EventParticipantsEditor from "../../../components/Event/participants/EventParticipantsEditor";
import type { Participant, EventMode } from "../../../../types/api/event";
import type { DayExpConfig } from "../../../components/Event/exp/EventExpPerDayEditor";

import PillInput from "../../../components/Event/PillInput";

import {
  createEvent,
  updateEvent,
} from "../../../services/api/events/events.service";
import { createSlots } from "../../../services/api/events/createSlots";
import { createRewards } from "../../../services/api/events/createRewards";
import { checkUserMajorRoles } from "../../../services/api/majors/majors.service";

import type {
  EventFormMode,
  EventFormProps,
  ImagePayload,
  MajorItem,
} from "./types/eventForm.types";

import {
  BasicInfoSection,
  MajorCategorySection,
  ScheduleSection,
  AudienceSection,
  LocationSection,
  DescriptionSection,
  StaffSection,
  ImagesSection,
  SkillsSection,
  EventModeSection,
  CheckInSection,
} from "./components/sections";
import {
  AUDIENCE,
  nextAudience,
  buildAudienceFromBackend,
  deriveAudience,
  // extractYears - using local version
  type AudienceKey,
} from "./utils/audienceHelpers";

import { formatLocalDate } from "./utils/dateHelpers";

import {
  buildExpByDayFromBackend,
  // LEVEL_ORDER,
  // type SkillRewardInput,
  // type SkillRewardTimeSlotInput,
  // type BuildSlotOptions,
  // type BackendEventWithExp,
} from "../../../utils/expHelpers";

import { Field, Labeled } from "../../../components/Event/form/FormPrimitives";
import type { UICheckInTimeSlot } from "../../../../types/ui/checkIn.types";

import {
  mapApiToUI,
  mapUIToApi,
} from "../../../../types/mappers/checkIn.mapper";
import type { CheckInTimeSlot } from "../../../services/api";

const DEFAULT_ENG_CM_U_MAP_EMBED =
  '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3590.1717932076826!2d98.95049027496995!3d18.795592982352098!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30da3b3d6926a08b%3A0xba1aa67c3b9ea06d!2z4LiE4LiT4Liw4Lin4Li04Lio4Lin4LiB4Lij4Lij4Lih4Lio4Liy4Liq4LiV4Lij4LmMIOC4oeC4q-C4suC4p-C4tOC4l-C4ouC4suC4peC4seC4ouC5gOC4iuC4teC4ouC4h-C5g-C4q-C4oeC5iA!5e1!3m2!1sth!2sth!4v1767684341906!5m2!1sth!2sth" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>';

const API_MAJOR_CATEGORY = `${backend_url}/api/major/category`;

export default function EventForm({
  mode,
  initialData,
  eventId,
}: EventFormProps) {
  const { user, loading } = useAuth() as {
    user?: {
      role?: { name?: string } | string;
      majorAdmins?: Array<{
        majorCategory_id: number;
        isActive?: boolean;
        major?: { id: number; name_TH?: string; name_EN?: string };
      }>;
    };
    loading?: boolean;
  };

  const [imagePayload, setImagePayload] = useState<ImagePayload>({
    newFiles: [],
    mainIndex: 0,
    deletedIds: [],
    hasImage: false,
  });

  const [majorCategoryId, setMajorCategoryId] = useState<number | null>(null);
  const [majorName, setMajorName] = useState<string>("");

  const [allowedMajorIds, setAllowedMajorIds] = useState<Set<number> | null>(
    null,
  );
  const [allowedLoading, setAllowedLoading] = useState(false);
  const [allowedError, setAllowedError] = useState<string | null>(null);

  const roleName = React.useMemo(() => {
    const r = user?.role;
    if (typeof r === "string") {
      return r.trim().toUpperCase();
    }

    const obj = r as { name?: string } | undefined;
    const name = obj?.name ?? "";
    return name.trim().toUpperCase();
  }, [user]);

  const isSupreme = roleName === "SUPREME";
  const isActivityAdmin = /ACTIVITY[_\-\s]?ADMIN/.test(roleName);

  const [majors, setMajors] = useState<MajorItem[]>([]);
  const [majorsLoading, setMajorsLoading] = useState(false);
  const [majorsLoaded, setMajorsLoaded] = useState(false);
  const [majorsError, setMajorsError] = useState<string | null>(null);

  const [showEmptyMajors, setShowEmptyMajors] = useState(false);

  /**
   * Determine if major category selection should show loading skeleton.
   * Checks three data sources: Auth context, /major/check API, and /major/category API.
   */
  const showMajorSkeleton =
    loading ||
    (isActivityAdmin && (allowedMajorIds === null || allowedLoading)) ||
    majorsLoading;

  const [skeletonGone, setSkeletonGone] = useState(false);

  /**
   * Delay skeleton removal to match CSS transition duration (220ms).
   */
  useEffect(() => {
    if (!showMajorSkeleton) {
      const t = setTimeout(() => setSkeletonGone(true), 220);
      return () => clearTimeout(t);
    }
  }, [showMajorSkeleton]);

  /**
   * Check if we can fetch major categories: role is loaded and Activity Admins have permission data.
   */
  const majorsReady =
    roleName !== "" &&
    (!isActivityAdmin || allowedMajorIds !== null) &&
    !loading;

  /**
   * Fetch allowed major categories for Activity Admins.
   * Non-Activity Admins skip permission checks (unrestricted access).
   */
  useEffect(() => {
    if (loading) return;
    if (!isActivityAdmin) {
      setAllowedMajorIds(new Set<number>());
      setAllowedLoading(false);
      setAllowedError(null);
      return;
    }

    const ac = new AbortController();
    (async () => {
      try {
        setAllowedLoading(true);
        setAllowedError(null);

        const result = await checkUserMajorRoles();
        const ids = new Set<number>(result.majorCategories.map((mc) => mc.id));
        setAllowedMajorIds(ids);
      } catch (e) {
        if ((e as DOMException).name !== "AbortError") {
          setAllowedError("FETCH_FAILED");
          setAllowedMajorIds(new Set());
        }
      } finally {
        setAllowedLoading(false);
      }
    })();

    return () => ac.abort();
  }, [isActivityAdmin, loading]);

  useEffect(() => {
    if (!majorsReady) return;

    const ac = new AbortController();
    (async () => {
      try {
        setMajorsLoading(true);
        setMajorsLoaded(false);
        setMajorsError(null);

        const url = isActivityAdmin
          ? `${API_MAJOR_CATEGORY}?scope=my`
          : API_MAJOR_CATEGORY;

        const res = await fetch(url, {
          credentials: "include",
          signal: ac.signal,
        });
        const json = await res.json().catch(() => ({}));
        let rows: MajorItem[] = (json?.data ?? json ?? []) as MajorItem[];

        rows = rows.filter((r) => r.isActive !== false);

        if (isSupreme) {
          // no filter
        } else if (isActivityAdmin) {
          rows = rows.filter((r) => allowedMajorIds?.has(r.id));
        } else {
          rows = [];
        }

        setMajors(rows);

        if (rows.length === 1) {
          setMajorCategoryId(rows[0].id);
          setMajorName(rows[0].name_TH || rows[0].name_EN || `#${rows[0].id}`);
        }
      } catch (e) {
        if ((e as DOMException).name !== "AbortError") {
          setMajors([]);
          setMajorsError("FETCH_FAILED");
        }
      } finally {
        setMajorsLoading(false);
        setMajorsLoaded(true);
      }
    })();

    return () => ac.abort();
  }, [majorsReady, isSupreme, isActivityAdmin, allowedMajorIds]);

  /**
   * Delay showing empty majors message to avoid flickering during load.
   */
  useEffect(() => {
    if (majorsLoaded && !majorsLoading && majors.length === 0) {
      const t = setTimeout(() => setShowEmptyMajors(true), 800);
      return () => clearTimeout(t);
    }
    setShowEmptyMajors(false);
  }, [majorsLoaded, majorsLoading, majors.length]);

  useEffect(() => {
    if (!initialData?.majorCategory_id) return;
    const m = majors.find((mm) => mm.id === initialData.majorCategory_id);
    if (m) {
      setMajorName(m.name_TH || m.name_EN || `#${m.id}`);
    }
  }, [initialData, majors]);

  const normalizedPhotos = React.useMemo(() => {
    if (!initialData?.photos) return undefined;

    return initialData.photos.filter(Boolean).map((p) => {
      if (typeof p === "string") {
        return {
          url: p,
        };
      }

      return {
        id: p.id,
        cloudinaryImage: p.cloudinaryImage ?? undefined,
        photoUrl: p.photoUrl ?? undefined,
        url: p.url ?? undefined,
        imageUrl: p.imageUrl ?? undefined,
      };
    });
  }, [initialData]);

  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [createdSlug, setCreatedSlug] = React.useState<string | null>(null);

  const [showResult, setShowResult] = useState<null | "success" | "error">(
    null,
  );
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [nameTH, setNameTH] = useState("");
  const [nameEN, setNameEN] = useState("");

  const [sDate, setSDate] = useState("");
  const [sTime, setSTime] = useState("");
  const [eDate, setEDate] = useState("");
  const [eTime, setETime] = useState("");

  const [rsDate, setRSDate] = useState("");
  const [rsTime, setRSTime] = useState("");
  const [reDate, setREDate] = useState("");
  const [reTime, setRETime] = useState("");

  const [descTH, setDescTH] = useState("");
  const [descEN, setDescEN] = useState("");
  const [placeTH, setPlaceTH] = useState("");
  const [placeEN, setPlaceEN] = useState("");
  const [placeMapLink, setPlaceMapLink] = useState("");

  const [aud, setAud] = useState<AudienceKey[]>(["all"]);
  const [audStaff, setAudStaff] = useState<AudienceKey[]>(["all"]);

  const toggleAud = (k: AudienceKey) => setAud((prev) => nextAudience(prev, k));
  const toggleAudStaff = (k: AudienceKey) =>
    setAudStaff((prev) => nextAudience(prev, k));

  const [visible, setVisible] = useState(true);
  const [eventMode, setEventMode] = useState<EventMode>("public");
  const [requireList, setRequireList] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const [expByDay, setExpByDay] = useState<DayExpConfig[]>([]);
  const [checkInTimeSlots, setCheckInTimeSlots] = useState<UICheckInTimeSlot[]>(
    [],
  );

  const handleAddSlot = () => {
    const nextNumber =
      checkInTimeSlots.length === 0
        ? 1
        : Math.max(...checkInTimeSlots.map((s) => s.slot_number)) + 1;

    setCheckInTimeSlots((prev) => [
      ...prev,
      {
        id: Date.now(),
        slot_number: nextNumber,
        name_TH: `รอบ ${nextNumber}`,
        name_EN: "",
        date: "",
        startTime: "",
        endTime: "",
        allowCheckInBefore: 0,
        skillRewards: [],
      },
    ]);
  };

  const handleRemoveSlot = (id: number) => {
    setCheckInTimeSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSlotChange = (
    id: number,
    field: keyof UICheckInTimeSlot,
    value: string | number,
  ) => {
    setCheckInTimeSlots((prev) =>
      prev.map((slot) => (slot.id === id ? { ...slot, [field]: value } : slot)),
    );
  };
  const [expValidateSignal, setExpValidateSignal] = useState(0);

  const [isOnline, setIsOnline] = useState(false);
  const [meetingLink, setMeetingLink] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const UNLIMITED = 1_000_000;

  const [capPreReg, setCapPreReg] = useState<number>(UNLIMITED);
  const [capStaff, setCapStaff] = useState<number>(UNLIMITED);
  const [capWalkin, setCapWalkin] = useState<number>(UNLIMITED);
  const [staffLink, setStaffLink] = useState("");
  const [staffEarlyMin, setStaffEarlyMin] = useState("");
  const [lateWindowMin, setLateWindowMin] = useState("");

  const isStaffRecruitClosed = capStaff === 0;

  /**
   * Preserve staff check-in time values when staff recruitment is temporarily closed.
   */
  const staffTimeBackupRef = React.useRef<{
    early: string;
    late: string;
  } | null>(null);

  /**
   * Manage staff check-in time fields when recruitment is toggled.
   * Clears values when closed, restores or sets defaults when reopened.
   */
  useEffect(() => {
    if (isStaffRecruitClosed) {
      staffTimeBackupRef.current = {
        early: staffEarlyMin,
        late: lateWindowMin,
      };
      setStaffEarlyMin("");
      setLateWindowMin("");
    } else {
      const b = staffTimeBackupRef.current;
      if (b) {
        setStaffEarlyMin(b.early || "60");
        setLateWindowMin(b.late || "30");
      } else {
        if (!staffEarlyMin) setStaffEarlyMin("60");
        if (!lateWindowMin) setLateWindowMin("30");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaffRecruitClosed]);

  /**
   * Populate form fields when in edit mode.
   * Converts UTC timestamps to Thai local time.
   */
  useEffect(() => {
    if (mode !== "edit" || !initialData) return;

    setNameTH(initialData.title_TH ?? "");
    setNameEN(initialData.title_EN ?? "");

    setDescTH(
      initialData.description_TH ??
        initialData.description_th ??
        initialData.desc_TH ??
        initialData.description ??
        "",
    );
    setDescEN(
      initialData.description_EN ??
        initialData.description_en ??
        initialData.desc_EN ??
        initialData.descriptionEn ??
        "",
    );
    const split = (v?: string | null) => {
      if (!v) return { date: "", time: "" };

      const [d, t] = v.split("T");

      return {
        date: d ?? "",
        time: (t ?? "").slice(0, 5),
      };
    };

    const actStart = split(initialData.activityStart);
    setSDate(actStart.date);
    setSTime(actStart.time);

    const actEnd = split(initialData.activityEnd);
    setEDate(actEnd.date);
    setETime(actEnd.time);

    const regStart = split(initialData.registrationStart);
    setRSDate(regStart.date);
    setRSTime(regStart.time);

    const regEnd = split(initialData.registrationEnd);
    setREDate(regEnd.date);
    setRETime(regEnd.time);
    if (initialData.status) {
      setVisible(initialData.status === "PUBLISHED");
    }
    if (
      initialData.eventMode === "public" ||
      initialData.eventMode === "private"
    ) {
      setEventMode(initialData.eventMode);
    }

    setIsOnline(initialData.isOnline ?? false);
    setMeetingLink(initialData.meetingLink ?? "");
    setPlaceTH(initialData.location_TH ?? "");
    setPlaceEN(initialData.location_EN ?? "");
    setPlaceMapLink(initialData.locationMapUrl ?? "");
    const audMain = buildAudienceFromBackend(
      initialData.allowedYearLevels ?? undefined,
      initialData.isForCMUEngineering,
    );
    setAud(audMain);

    const audStaffVal = buildAudienceFromBackend(
      initialData.staffAllowedYears ?? undefined,
      (initialData as Partial<{ isForCMUEngineering_Staff: boolean }>)
        .isForCMUEngineering_Staff ?? initialData.isForCMUEngineering,
    );
    setAudStaff(audStaffVal);
    setCapPreReg(
      typeof initialData.maxParticipants === "number"
        ? initialData.maxParticipants
        : UNLIMITED,
    );
    setCapWalkin(
      typeof initialData.walkinCapacity === "number"
        ? initialData.walkinCapacity
        : UNLIMITED,
    );
    setCapStaff(
      typeof initialData.maxStaffCount === "number"
        ? initialData.maxStaffCount
        : UNLIMITED,
    );
    setStaffLink(initialData.staffCommunicationLink ?? "");

    setStaffEarlyMin(
      String(
        initialData.staffCheckInTime ?? initialData.staffEarlyCheckInMins ?? 60,
      ),
    );

    setLateWindowMin(String(initialData.lateCheckInPenalty ?? 30));

    if (initialData.majorCategory_id) {
      setMajorCategoryId(initialData.majorCategory_id);
    }
    if (typeof initialData.requirePredeterminedList === "boolean") {
      setRequireList(initialData.requirePredeterminedList);
    }
    if (
      initialData.predeterminedParticipants &&
      Array.isArray(initialData.predeterminedParticipants)
    ) {
      setParticipants(initialData.predeterminedParticipants as Participant[]);
    }

    if (
      Array.isArray(initialData.expByDay) &&
      initialData.expByDay.length > 0
    ) {
      setExpByDay(initialData.expByDay as DayExpConfig[]);
    } else {
      const mapped = buildExpByDayFromBackend(initialData, split);
      if (mapped.length) {
        setExpByDay(mapped);
      }
    }

    if (Array.isArray(initialData.checkInTimeSlots)) {
      const slots = (initialData.checkInTimeSlots as CheckInTimeSlot[]).map(
        (slot, index) => {
          const ui = mapApiToUI(slot);

          return {
            ...ui,
            name_TH: ui.name_TH ?? `รอบ ${ui.slot_number ?? index + 1}`,
          };
        },
      );

      setCheckInTimeSlots(slots);
    }
  }, [mode, initialData]);

  /**
   * Generate array of dates between activity start and end.
   */
  function enumerateDates(startISO: string, endISO: string): string[] {
    if (!startISO || !endISO) return [];
    const a = new Date(startISO);
    const b = new Date(endISO);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return [];
    const out: string[] = [];
    for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
      out.push(formatLocalDate(d));
    }
    return out;
  }
  const dates = enumerateDates(`${sDate}T00:00`, `${eDate}T00:00`);

  /**
   * Convert local date and time strings to ISO 8601 format.
   */
  // const toISO = (d: string, t: string) => {
  //   if (!d || !t) return "";
  //   const dd = d.slice(0, 10);
  //   const tt = t.slice(0, 5);
  //   return `${dd}T${tt}:00.000Z`;
  // };

  /**
   * Convert number or string to non-negative integer string.
   */
  const toIntStrOrZero = (v: number | string) => {
    if (typeof v === "number") {
      return String(Math.max(0, Number.isFinite(v) ? v : 0));
    }
    const n = v.trim() === "" ? 0 : Number(v);
    return String(Math.max(0, Number.isFinite(n) ? n : 0));
  };

  type PredeterminedParticipant = {
    userId: number | null;
    email: string | null;
    role: "PARTICIPANT" | "STAFF" | string;
  };

  /**
   * Map participant data to backend-expected format.
   */
  function mapPredetermined(p: Participant): PredeterminedParticipant {
    const maybe = p as Partial<{ userId: number; email: string; role: string }>;
    return {
      userId: typeof maybe.userId === "number" ? maybe.userId : null,
      email: typeof maybe.email === "string" ? maybe.email : null,
      role: typeof maybe.role === "string" ? maybe.role : "PARTICIPANT",
    };
  }

  function buildApiSlots() {
    return checkInTimeSlots.map((slot, index) => {
      const api = mapUIToApi(slot);

      const name =
        typeof slot.name_TH === "string" && slot.name_TH.trim() !== ""
          ? slot.name_TH.trim()
          : `รอบ ${slot.slot_number ?? index + 1}`;

      api.name_TH = name;

      return api;
    });
  }

  /**
   * Build FormData payload for event creation/update.
   * Handles multipart/form-data with images, schedules, audiences, and EXP configuration.
   */
  function buildEventFormData(): FormData {
    const fd = new FormData();

    fd.append("title_TH", (nameTH || "").trim());
    fd.append("title_EN", (nameEN || "").trim());
    fd.append("description_TH", descTH || "");
    fd.append("description_EN", descEN || "");
    fd.append("status", visible ? "PUBLISHED" : "DRAFT");
    fd.append("priority", "1");

    if (majorCategoryId != null) {
      fd.append("majorCategory_id", String(majorCategoryId));
    }
    if (imagePayload.newFiles.length > 0) {
      const ordered = [
        imagePayload.newFiles[imagePayload.mainIndex],
        ...imagePayload.newFiles.filter((_, i) => i !== imagePayload.mainIndex),
      ];

      ordered.forEach((file, i) => {
        fd.append(`image_${i}`, file, file.name);
      });

      fd.append("mainImageIndex", "0");
    }

    if (mode === "edit" && imagePayload.deletedIds.length > 0) {
      fd.append("deletePhotoIds", JSON.stringify(imagePayload.deletedIds));
    }

    fd.append("activityStart", `${sDate}T${sTime}:00`);
    fd.append("activityEnd", `${eDate}T${eTime}:00`);
    fd.append("registrationStart", `${rsDate}T${rsTime}:00`);
    fd.append("registrationEnd", `${reDate}T${reTime}:00`);
    fd.append("isOnline", String(isOnline));
    if (isOnline) {
      if (meetingLink) fd.append("meetingLink", meetingLink);
    } else {
      const trimmed = (placeMapLink || "").trim();

      const mapValue =
        trimmed ||
        (mode === "edit" ? (initialData?.locationMapUrl ?? "").trim() : "") ||
        DEFAULT_ENG_CM_U_MAP_EMBED;

      fd.append("locationMapUrl", mapValue);

      fd.append("location_TH", placeTH || "");
      fd.append("location_EN", (placeEN || placeTH || "").trim());
    }

    const walkinCapStr = toIntStrOrZero(capWalkin);
    const walkinCapNum = Number(walkinCapStr) || 0;

    fd.append("maxParticipants", toIntStrOrZero(capPreReg));
    fd.append("walkinCapacity", walkinCapStr);
    fd.append("walkinEnabled", String(walkinCapNum > 0));
    fd.append("maxStaffCount", toIntStrOrZero(capStaff));
    fd.append("waitlistEnabled", "false");
    fd.append("staffCommunicationLink", staffLink || "");
    const staffCheckInTimeStr = isStaffRecruitClosed
      ? ""
      : toIntStrOrZero(staffEarlyMin);

    if (isStaffRecruitClosed) {
      fd.append("lateCheckInPenalty", "");
      fd.append("staffCheckInTime", "");
    } else {
      fd.append("lateCheckInPenalty", toIntStrOrZero(lateWindowMin));
      fd.append("staffCheckInTime", staffCheckInTimeStr);
    }

    const { years: allowedYearLevels, isForEng: isForEngParticipant } =
      deriveAudience(aud);

    const { years: staffAllowedYears, isForEng: isForEngStaff } =
      deriveAudience(audStaff);

    fd.append("isForCMUEngineering", String(isForEngParticipant));
    fd.append("isForCMUEngineering_Staff", String(isForEngStaff));

    fd.append("allowedYearLevels", JSON.stringify(allowedYearLevels));
    fd.append("staffAllowedYears", JSON.stringify(staffAllowedYears));

    fd.append("requirePredeterminedList", String(requireList));
    fd.append(
      "predeterminedParticipants",
      JSON.stringify(requireList ? participants.map(mapPredetermined) : []),
    );

    return fd;
  }
  function isValidGoogleEmbed(url: string) {
    if (!url) return true;

    const trimmed = url.trim();

    const isIframe =
      trimmed.includes("<iframe") && trimmed.includes("google.com/maps/embed");

    const isDirect =
      trimmed.startsWith("https://") &&
      trimmed.includes("google.com/maps/embed");

    return isIframe || isDirect;
  }
  function findMissingRequired(
    fd: FormData,
    opts: { isOnline: boolean; skipImage?: boolean },
  ) {
    const allowEmptyJson = new Set([
      "skillRewards",
      "expByDay",
      "predeterminedParticipants",
    ]);
    const has = (k: string) => {
      const v = fd.get(k);
      if (v instanceof File) return v && v.size > 0;
      const s = (v ?? "").toString().trim();
      if (allowEmptyJson.has(k) && (s === "[]" || s === "{}")) return true;
      return s !== "";
    };

    const requiredAlways = [
      "title_TH",
      "title_EN",
      "description_TH",
      "description_EN",
      "status",
      "priority",
      "activityStart",
      "activityEnd",
      "registrationStart",
      "registrationEnd",
      "maxParticipants",
      "walkinCapacity",
      "walkinEnabled",
      "maxStaffCount",
      "waitlistEnabled",
      "allowedYearLevels",
      "staffAllowedYears",
      "requirePredeterminedList",
      "majorCategory_id",
    ];

    const requiredIfStaffOpen = ["lateCheckInPenalty", "staffCheckInTime"];

    const maybeBackendAlsoRequires: string[] = [];

    const requiredOnline = ["isOnline", "meetingLink"];
    const requiredOnsite = ["isOnline", "location_TH"];

    const req = [
      ...requiredAlways,
      ...(opts.isOnline ? requiredOnline : requiredOnsite),
      ...maybeBackendAlsoRequires,
      ...(isStaffRecruitClosed ? [] : requiredIfStaffOpen),
    ];

    const existingCount = initialData?.photos?.length ?? 0;
    const remainingExisting = existingCount - imagePayload.deletedIds.length;

    const imagesOk =
      imagePayload.newFiles.length > 0 ||
      (mode === "edit" && remainingExisting > 0);
    const missing = req.filter((k) => !has(k));
    if (!opts.skipImage && !imagesOk) missing.push("image_0");
    return missing;
  }

  /**
   * Validate all form inputs and return error messages.
   */
  function validate(): Record<string, string> {
    const e: Record<string, string> = {};

    if (!nameTH.trim()) e.nameTH = "กรอกชื่อกิจกรรม (ไทย)";
    if (!nameEN.trim()) e.nameEN = "กรอกชื่อกิจกรรม (อังกฤษ)";

    const existingCount = initialData?.photos?.length ?? 0;
    const remainingExisting = existingCount - imagePayload.deletedIds.length;

    const hasImage =
      imagePayload.newFiles.length > 0 ||
      (mode === "edit" && remainingExisting > 0);

    if (!hasImage) {
      e.images = "กรุณาอัปโหลดรูปกิจกรรมอย่างน้อย 1 รูป";
    }

    if (!sDate) e.sDate = "เลือกวันเริ่ม";
    if (!sTime) e.sTime = "เลือกเวลาเริ่ม";
    if (!eDate) e.eDate = "เลือกวันจบ";
    if (!eTime) e.eTime = "เลือกเวลาจบ";

    const actStart = sDate && sTime ? new Date(`${sDate}T${sTime}`) : null;
    const actEnd = eDate && eTime ? new Date(`${eDate}T${eTime}`) : null;

    if (actStart && actEnd && actEnd <= actStart) {
      e.eDate = "เวลาจบต้องหลังเวลาเริ่ม";
      e.eTime = e.eTime ?? " ";
    }

    if (!rsDate) e.rsDate = "เลือกวันเปิดลงทะเบียน";
    if (!rsTime) e.rsTime = "เลือกเวลาเปิดลงทะเบียน";
    if (!reDate) e.reDate = "เลือกวันปิดลงทะเบียน";
    if (!reTime) e.reTime = "เลือกเวลาปิดลงทะเบียน";

    if (rsDate && rsTime && reDate && reTime) {
      const regStart = new Date(`${rsDate}T${rsTime}`);
      const regEnd = new Date(`${reDate}T${reTime}`);

      if (regEnd <= regStart) {
        e.reDate = "เวลาปิดลงทะเบียนต้องหลังเวลาเปิด";
        e.reTime = e.reTime ?? " ";
      }

      if (actStart && regEnd > actStart) {
        e.reDate = "ปิดลงทะเบียนต้องก่อนเวลาเริ่มกิจกรรม";
        e.reTime = e.reTime ?? " ";
      }
    }
    if (!descTH.trim()) e.descTH = "กรอกรายละเอียด (ไทย)";
    if (!descEN.trim()) e.descEN = "กรอกรายละเอียด (อังกฤษ)";

    if (isOnline) {
      if (!meetingLink.trim()) e.meetingLink = "ใส่ Meeting Link";
    } else {
      if (!placeTH.trim()) {
        e.placeTH = "กรอกสถานที่";
      }

      if (placeMapLink && !isValidGoogleEmbed(placeMapLink)) {
        e.placeMapLink = "กรุณากรอกลิงก์แบบ Embed จาก Google Maps เท่านั้น";
      }
    }

    const isNonNegInt = (s: string) => /^\d+$/.test(s.trim());

    if (!isStaffRecruitClosed) {
      if (!isNonNegInt(staffEarlyMin)) {
        e.staffEarlyMin = "ใส่ตัวเลขจำนวนเต็มไม่ติดลบ";
      }
      if (!isNonNegInt(lateWindowMin)) {
        e.lateWindowMin = "ใส่ตัวเลขจำนวนเต็มไม่ติดลบ";
      }
    }

    if (!majorCategoryId) e.majorCategory = "เลือกสาขาที่จัดกิจกรรม";

    let expInvalid = false;

    const isFilled = (v: unknown) => String(v ?? "").trim() !== "";

    for (const day of expByDay ?? []) {
      for (const slot of day?.slots ?? []) {
        for (const it of slot?.items ?? []) {
          const hasMain = isFilled(it.categoryId);
          const hasSub = isFilled(it.skillId);
          const hasType = isFilled(it.activityType);

          const started = hasMain || hasSub || hasType;
          if (!started) continue;

          if (hasMain && (!hasSub || !hasType)) {
            expInvalid = true;
            break;
          }

          if (!hasMain && (hasSub || hasType)) {
            expInvalid = true;
            break;
          }
        }
        if (expInvalid) break;
      }
      if (expInvalid) break;
    }

    if (expInvalid) {
      e.expSkills =
        "กรุณาเลือก (หมวดหลัก + ทักษะย่อย + ประเภทกิจกรรม) ให้ครบในแถวที่เริ่มกรอกแล้ว";
    }

    return e;
  }

  async function saveEvent(
    fd: FormData,
    mode: EventFormMode,
    id?: number | null,
  ): Promise<{ id: number; slug?: string }> {
    if (mode === "edit") {
      const eventId = id ?? null;

      if (eventId == null) {
        throw new Error("Missing event_id for update");
      }

      fd.append("event_id", String(eventId));

      const result = await updateEvent(fd);

      return {
        id: result.data.id,
        slug: result.data.slug,
      };
    }

    // CREATE EVENT
    const result = await createEvent(fd);

    const eventId = result.data.id;

    // build slot payload
    const apiSlots = buildApiSlots();

    // create slots
    const slotIdMap = await createSlots(eventId, apiSlots, checkInTimeSlots);

    // create rewards
    await createRewards(eventId, expByDay, slotIdMap);

    return {
      id: result.data.id,
      slug: result.data.slug,
    };
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) {
      const order = [
        "nameTH",
        "nameEN",
        "sDate",
        "sTime",
        "eDate",
        "eTime",
        "rsDate",
        "rsTime",
        "reDate",
        "reTime",
        "meetingLink",
        "placeTH",
        "placeEN",
        "placeMapLink",
        "descTH",
        "descEN",
        "images",
        "majorCategory",
        "expSkills",
      ];
      const firstKey = order.find((k) => v[k]);

      if (firstKey === "images") {
        document
          .querySelector("#uploader-top")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (firstKey === "expSkills") {
        setExpValidateSignal((n) => n + 1);
        document
          .querySelector("#exp-editor")
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (firstKey) {
        document.getElementById(firstKey)?.focus();
      }
      return;
    }

    try {
      setSubmitting(true);
      setShowResult(null);
      setErrorMsg("");

      const fd = buildEventFormData();

      const hasExistingImages =
        mode === "edit" && (initialData?.photos?.length ?? 0) > 0;

      const skipImage =
        mode === "edit" &&
        hasExistingImages &&
        imagePayload.newFiles.length === 0;

      const missing = findMissingRequired(fd, {
        isOnline,
        skipImage,
      });

      if (missing.length) {
        throw new Error("Missing required fields: " + missing.join(", "));
      }

      const slugify = (s: string) =>
        (s || "")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

      const result = await saveEvent(fd, mode, eventId ?? createdId ?? null);
      setCreatedId(result.id);
      setCreatedSlug(result.slug ?? slugify(nameEN));
      setShowResult("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setShowResult("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mt-8 mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">
          {mode === "create" ? "สร้างกิจกรรม" : "แก้ไขกิจกรรม"}
        </h1>
        <Link
          to="/admin/events"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          <ChevronLeft className="h-4 w-4" />
          กลับไป หน้าจัดการกิจกรรม
        </Link>
      </div>

      <div className="border-t border-slate-200 pt-6"></div>

      <form
        id="createForm"
        noValidate
        onSubmit={submit}
        className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[320px_minmax(0,1fr)]"
      >
        <ImagesSection
          mode={mode}
          initialPhotos={normalizedPhotos}
          onChange={setImagePayload}
          error={errors.images}
        />

        <div className="min-w-0 space-y-6">
          <BasicInfoSection
            nameTH={nameTH}
            nameEN={nameEN}
            onNameTHChange={setNameTH}
            onNameENChange={setNameEN}
            errors={{
              nameTH: errors.nameTH,
              nameEN: errors.nameEN,
            }}
          />

          <MajorCategorySection
            majorCategoryId={majorCategoryId}
            majorName={majorName}
            majors={majors}
            onMajorChange={(id, name) => {
              setMajorCategoryId(id);
              setMajorName(name);
            }}
            isSupreme={isSupreme}
            isActivityAdmin={isActivityAdmin}
            majorsLoading={majorsLoading}
            majorsLoaded={majorsLoaded}
            showMajorSkeleton={showMajorSkeleton}
            skeletonGone={skeletonGone}
            allowedLoading={allowedLoading}
            showEmptyMajors={showEmptyMajors}
            majorError={errors.majorCategory}
            majorsError={majorsError}
            allowedError={allowedError}
            visible={visible}
            onVisibleChange={setVisible}
          />

          <ScheduleSection
            sDate={sDate}
            sTime={sTime}
            eDate={eDate}
            eTime={eTime}
            onSDateChange={setSDate}
            onSTimeChange={setSTime}
            onEDateChange={setEDate}
            onETimeChange={setETime}
            rsDate={rsDate}
            rsTime={rsTime}
            reDate={reDate}
            reTime={reTime}
            onRSDateChange={setRSDate}
            onRSTimeChange={setRSTime}
            onREDateChange={setREDate}
            onRETimeChange={setRETime}
            errors={{
              sDate: errors.sDate,
              sTime: errors.sTime,
              eDate: errors.eDate,
              eTime: errors.eTime,
              rsDate: errors.rsDate,
              rsTime: errors.rsTime,
              reDate: errors.reDate,
              reTime: errors.reTime,
            }}
          />

          <AudienceSection
            audience={aud}
            onAudienceToggle={toggleAud}
            capPreReg={capPreReg}
            capWalkin={capWalkin}
            onCapPreRegChange={setCapPreReg}
            onCapWalkinChange={setCapWalkin}
            AUDIENCE={AUDIENCE}
          />

          <StaffSection
            staffAudience={audStaff}
            onStaffAudienceToggle={toggleAudStaff}
            capStaff={capStaff}
            onCapStaffChange={setCapStaff}
            communicationLink={staffLink}
            onCommunicationLinkChange={setStaffLink}
            AUDIENCE={AUDIENCE}
          />
        </div>
      </form>
      <CheckInSection
        checkInTimeSlots={checkInTimeSlots}
        onAddSlot={handleAddSlot}
        onRemoveSlot={handleRemoveSlot}
        onSlotChange={handleSlotChange}
        activityStartDate={sDate}
        activityEndDate={eDate}
      />

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Labeled label="เวลาสามารถสแกนสตาฟได้ก่อนเริ่มงาน (นาที)" required>
            <Field id="staffEarlyMin" error={errors.staffEarlyMin}>
              <PillInput
                id="staffEarlyMin"
                type="number"
                value={staffEarlyMin}
                onChange={setStaffEarlyMin}
                inputMode="numeric"
                required={!isStaffRecruitClosed}
                disabled={isStaffRecruitClosed}
                placeholder={
                  isStaffRecruitClosed ? "ไม่เปิดรับสตาฟ" : undefined
                }
                error={errors.staffEarlyMin}
              />
            </Field>
          </Labeled>
          <Labeled label="เวลาที่ถือว่าเช็คอินสายหลังเริ่มงาน (นาที)" required>
            <Field id="lateWindowMin" error={errors.lateWindowMin}>
              <PillInput
                id="lateWindowMin"
                type="number"
                value={lateWindowMin}
                onChange={setLateWindowMin}
                inputMode="numeric"
                required={!isStaffRecruitClosed}
                disabled={isStaffRecruitClosed}
                placeholder={
                  isStaffRecruitClosed ? "ไม่เปิดรับสตาฟ" : undefined
                }
                error={errors.lateWindowMin}
              />
            </Field>
          </Labeled>
        </div>

        <LocationSection
          isOnline={isOnline}
          onIsOnlineChange={setIsOnline}
          meetingLink={meetingLink}
          onMeetingLinkChange={setMeetingLink}
          location_TH={placeTH}
          location_EN={placeEN}
          onLocationTHChange={setPlaceTH}
          onLocationENChange={setPlaceEN}
          locationMapUrl={placeMapLink}
          onLocationMapUrlChange={setPlaceMapLink}
          errors={{
            meetingLink: errors.meetingLink,
            locationMapUrl: errors.placeMapLink,
            placeTH: errors.placeTH,
          }}
        />
      </div>

      <div className="mt-6">
        <DescriptionSection
          descTH={descTH}
          descEN={descEN}
          onDescTHChange={setDescTH}
          onDescENChange={setDescEN}
          errors={{
            descTH: errors.descTH,
            descEN: errors.descEN,
          }}
        />
      </div>

      <EventModeSection
        eventMode={eventMode}
        onEventModeChange={setEventMode}
        requireList={requireList}
        onRequireListChange={setRequireList}
      />

      {requireList && (
        <div className="mb-6">
          <EventParticipantsEditor
            participants={participants}
            onChange={setParticipants}
          />
        </div>
      )}

      <SkillsSection
        dates={dates}
        expByDay={expByDay}
        onExpByDayChange={setExpByDay}
        checkInSlots={checkInTimeSlots}
        validateSignal={expValidateSignal}
      />

      <div className="mt-16 border-t border-slate-200 pt-6"></div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Link
          to="/admin/events"
          className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50"
        >
          ยกเลิก
        </Link>

        <button
          type="submit"
          form="createForm"
          formNoValidate
          className="rounded-xl bg-cyan-600 px-5 py-2 font-medium text-white shadow hover:bg-cyan-700"
        >
          {mode === "create" ? "บันทึกกิจกรรม" : "บันทึกการแก้ไข"}
        </button>
      </div>

      <LoadingDialog
        open={submitting}
        title="กำลังสร้างกิจกรรม"
        desc="โปรดรอสักครู่ กำลังบันทึกข้อมูลและอัปโหลดรูป"
      />

      <ResultDialog
        open={showResult === "success"}
        state="success"
        title={
          mode === "create" ? "สร้างกิจกรรมสำเร็จ!" : "บันทึกกิจกรรมสำเร็จ!"
        }
        hideDesc={true}
        primaryLabel="ดูหน้ากิจกรรม"
        onPrimary={() => {
          if (createdSlug) {
            navigate(`/activities/${createdSlug}`);
          } else if (createdId) {
            navigate(`/admin/events/${createdId}`);
          }
        }}
        secondaryLabel="กลับไปหน้าจัดการกิจกรรม"
        onSecondary={() => navigate("/admin/events")}
        onClose={() => setShowResult(null)}
      />

      <ResultDialog
        open={showResult === "error"}
        state="error"
        title={
          mode === "create" ? "สร้างกิจกรรมไม่สำเร็จ" : "บันทึกกิจกรรมไม่สำเร็จ"
        }
        desc={errorMsg || "ลองใหม่อีกครั้ง หรือตรวจสอบการเชื่อมต่อ"}
        primaryLabel="ปิด"
        onPrimary={() => setShowResult(null)}
        secondaryLabel="กลับไปหน้าจัดการกิจกรรม"
        onSecondary={() => navigate("/admin/events")}
        onClose={() => setShowResult(null)}
      />
    </div>
  );
}
