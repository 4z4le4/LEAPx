import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import EventCard from "../../components/Event/EventCard";
import { ArrowLeft } from "lucide-react";
import PrimaryFooter from "../../components/Footer/PrimaryFooter";
import type { ApiEvent } from "../../../types/api/event";
import toast, { Toaster } from "react-hot-toast";
import useSWR from "swr";
import { useTranslation } from "react-i18next";
import { backend_url } from "../../../utils/constants";

/* ===================== types & const ===================== */

type UiStatus = "SOON" | "OPEN" | "CLOSED";
type ApiEventState = { isRegistrationOpen?: boolean; isFull?: boolean };
type ApiMajorCategory = {
  id: number;
  name_TH: string;
  name_EN: string;
  code: string;
};

type ApiCurrentUserStatus = {
  isRegistered?: boolean;
  isStaff?: boolean;
  registrationStatus?: string | null;
  staffStatus?: string | null;
  staffRole?: string | null;
};

type ApiEventWithState = ApiEvent & {
  state?: ApiEventState;
  slug?: string;
  isForCMUEngineering?: boolean;

  majorCategory?: ApiMajorCategory | null;

  // ✅ เพิ่มจาก backend: ใช้เช็คสถานะลงทะเบียนของ user ปัจจุบัน
  currentUserStatus?: ApiCurrentUserStatus | null;

  // ✅ เผื่อ backend มีฟิลด์พิกัด/ลิงก์แมพจริง ๆ
  locationMapUrl?: string | null;
  googleMapUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
};

const USER_REGISTER_PATH = `${backend_url}/api/events/register/user`;
const STAFF_REGISTER_PATH = `${backend_url}/api/events/register/staff`;

function joinUrl(base: string, path: string) {
  const b = base.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return `${b}/${p}`;
}

// ---- extras on ApiEvent that might exist from backend ----
type ApiEventWithExtras = ApiEvent & {
  coverUrl?: string | null;
  imageUrl?: string | null;
};

function isNonEmptyString(x: unknown): x is string {
  return typeof x === "string" && x.length > 0;
}

function pickIfString<T extends object, K extends keyof T>(
  obj: T,
  key: K,
): string | null {
  const v = obj[key];
  return typeof v === "string" && v.length > 0 ? (v as string) : null;
}

/* ===================== helpers: date/time ===================== */

function formatDateUTC(iso: string | null | undefined, lang: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(+d)) return "-";
  const locale = lang === "th" ? "th-TH" : "en-US";
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * ✅ ดึง lat,lng จาก Google Maps URL หลายรูปแบบ
 * - /@lat,lng,zoom
 * - !3dLAT!4dLNG
 * - q=lat,lng / ll=lat,lng
 */
function parseLatLngFromMapUrl(url?: string | null): {
  lat?: number;
  lng?: number;
} {
  if (!url) return {};
  const raw = url.replace(/&amp;/g, "&").trim();
  if (!raw) return {};

  {
    const m = raw.match(/\/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)(?:,|$)/);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  }

  {
    const m = raw.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
  }

  try {
    const u = new URL(raw);
    const q =
      u.searchParams.get("q") ??
      u.searchParams.get("query") ??
      u.searchParams.get("ll");
    if (!q) return {};
    const mm = q.match(/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (!mm) return {};
    const lat = Number(mm[1]);
    const lng = Number(mm[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return {};
  } catch {
    return {};
  }
}

/** อ่าน cookie ง่าย ๆ */
function readCookie(name: string) {
  return document.cookie
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(name + "="))
    ?.split("=")[1];
}

// ---- Error helpers ----
class HttpError extends Error {
  status: number;
  code?: string;
  payload?: unknown;
  constructor(
    message: string,
    status: number,
    code?: string,
    payload?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

function safeJsonParse<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function extractServerMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;

  const obj = payload as {
    message?: unknown;
    error?: unknown;
    errors?: unknown;
  };

  if (typeof obj.message === "string" && obj.message) return obj.message;
  if (typeof obj.error === "string" && obj.error) return obj.error;

  if (Array.isArray(obj.errors) && obj.errors.length) {
    const first = obj.errors[0] as unknown;
    if (typeof first === "string") return first;
    if (
      first &&
      typeof first === "object" &&
      typeof (first as { message?: unknown }).message === "string"
    ) {
      return (first as { message: string }).message;
    }
  }
  return undefined;
}

// แปลงประโยคอังกฤษ/โค้ดสถานะ → ไทยอ่านง่าย
function toThaiMessage(
  rawMsg?: string,
  status?: number,
  role?: "attendee" | "staff",
): string {
  const isAtt = role === "attendee";
  const fallback = isAtt
    ? "เกิดข้อผิดพลาด ไม่สามารถลงทะเบียนเข้าร่วมได้"
    : "เกิดข้อผิดพลาด ไม่สามารถลงทะเบียนสตาฟได้";

  if (!rawMsg && !status) return fallback;

  const msg = (rawMsg || "").toLowerCase().trim();

  const onlyYear = /only\s+available\s+for\s+year\s+([0-9 ,\-–]+)/i.exec(
    rawMsg || "",
  );
  if (onlyYear) {
    const thYears = onlyYear[1]
      .replace(/[–-]/g, "–")
      .split(/[,\s]+/)
      .filter(Boolean)
      .join(" และ ");
    return `กิจกรรมนี้จัดขึ้นเฉพาะนักศึกษาชั้นปีที่ ${thYears} เท่านั้น`;
  }

  if (/\b(full|capacity|quota)\b/.test(msg)) return "ที่นั่งเต็มแล้ว";
  if (/close|closed|ended|expired|window|deadline/.test(msg))
    return "ปิดรับลงทะเบียนแล้ว";
  if (/already|duplicate|exists/.test(msg) || status === 409)
    return "คุณได้ลงทะเบียนไว้แล้ว";

  if (status === 422) return "ข้อมูลไม่ครบถ้วนหรือรูปแบบไม่ถูกต้อง";
  if (status === 401) return "กรุณาเข้าสู่ระบบก่อนลงทะเบียน";
  if (status === 403) return "คุณไม่มีสิทธิ์ลงทะเบียนกิจกรรมนี้";
  if (rawMsg && /network|fetch|failed|offline/i.test(rawMsg))
    return "ไม่สามารถเชื่อมต่อเครือข่ายได้ กรุณาลองใหม่อีกครั้ง";

  if (rawMsg && rawMsg.startsWith("{") && rawMsg.endsWith("}")) return fallback;
  if (rawMsg) return fallback;
  return fallback;
}

/** POST JSON + แนบ CSRF header (normalize 403 auth -> 401) */
function looksAuthish(msg?: string, payload?: unknown) {
  const s = (msg || "").toLowerCase();
  const obj =
    payload && typeof payload === "object"
      ? (payload as { code?: unknown } & Record<string, unknown>)
      : null;

  return (
    /auth|token|csrf|session|login|unauth/.test(s) ||
    (obj &&
      (obj.code === "UNAUTHENTICATED" ||
        "auth" in obj ||
        "token" in obj ||
        "session" in obj))
  );
}

async function postJSON<TReq extends object, TRes = unknown>(
  path: string,
  body: TReq,
): Promise<TRes> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const xsrf = readCookie("XSRF-TOKEN") || readCookie("CSRF-TOKEN");
  if (xsrf) {
    const token = decodeURIComponent(xsrf);
    headers["X-XSRF-TOKEN"] = token;
    headers["X-CSRF-Token"] = token;
  }
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    const payload = safeJsonParse(text);
    const serverMsg = extractServerMessage(payload) || text;
    const normalizedStatus =
      res.status === 403 && looksAuthish(serverMsg, payload) ? 401 : res.status;

    const code =
      payload &&
      typeof payload === "object" &&
      typeof (payload as { code?: unknown }).code === "string"
        ? ((payload as { code: string }).code as string)
        : payload &&
            typeof payload === "object" &&
            typeof (payload as { error?: unknown }).error === "string"
          ? ((payload as { error: string }).error as string)
          : undefined;

    throw new HttpError(
      serverMsg || `HTTP ${normalizedStatus}`,
      normalizedStatus,
      code,
      payload ?? text,
    );
  }
  try {
    return JSON.parse(text) as TRes;
  } catch {
    // @ts-expect-error — อนุญาตข้อความดิบ
    return text;
  }
}

function normalizeCount(n: unknown): number {
  if (typeof n === "string") return Number(n.replace(/[,\s]/g, "")) || 0;
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}
function modeFromMax(n?: unknown) {
  const m = normalizeCount(n);
  return {
    closed: m === 0,
    unlimited: m >= 1_000_000,
    limited: m > 0 && m < 1_000_000,
    max: m,
  };
}

function parseAsThaiTime(iso: string) {
  const d = new Date(iso);
  return d.getTime() - 7 * 60 * 60 * 1000;
}

function computeUiStatusFromApi(
  ev: ApiEventWithState,
  now = Date.now(),
): UiStatus {
  // const rs = ev.registrationStart
  //   ? new Date(ev.registrationStart).getTime()
  //   : NaN;

  //! todo: check time zone issus here
  const rs = parseAsThaiTime(ev.registrationStart || "");
  const re = ev.registrationEnd ? new Date(ev.registrationEnd).getTime() : NaN;
  const ae = ev.activityEnd ? new Date(ev.activityEnd).getTime() : NaN;

  // console.log(ev.registrationStart)

  // console.log('rs' , rs)

  // console.log('re' , re)
  // console.log('ae', ae)

  // console.log('Current time (UTC):', new Date(now).toISOString());
  // console.log('Current time (Local):', new Date(now).toLocaleString('th-TH'));
  // console.log('Registration Start (UTC):', ev.registrationStart);
  // console.log('Registration Start (Local):', new Date(rs).toLocaleString('th-TH'));
  // console.log('Comparison: now >= rs?', now >= rs, `(${now} >= ${rs})`);

  if (!Number.isNaN(ae) && now > ae) return "CLOSED";

  const leftOk = Number.isNaN(rs) || now >= rs;
  const rightOk = Number.isNaN(re) || now <= re;
  const windowOpen =
    leftOk && rightOk && ev.state?.isRegistrationOpen !== false;

  const maxP = Number(ev.maxParticipants ?? NaN);
  const maxS = Number(ev.maxStaffCount ?? NaN);

  const attClosed = Number.isFinite(maxP) && maxP === 0;
  const stfClosed = Number.isFinite(maxS) && maxS === 0;

  const attUnlimited = Number.isFinite(maxP) && maxP >= 1_000_000;
  const stfUnlimited = Number.isFinite(maxS) && maxS >= 1_000_000;

  const attCurrent = Number(ev.currentParticipants ?? 0);
  const stfCurrent = Number(ev.currentStaffCount ?? 0);

  const attLimitedFull =
    !attClosed &&
    !attUnlimited &&
    Number.isFinite(maxP) &&
    attCurrent >= (maxP || 0);
  const stfLimitedFull =
    !stfClosed &&
    !stfUnlimited &&
    Number.isFinite(maxS) &&
    stfCurrent >= (maxS || 0);

  const attendeeAvailable = !attClosed && (attUnlimited || !attLimitedFull);
  const staffAvailable = !stfClosed && (stfUnlimited || !stfLimitedFull);

  if (windowOpen && (attendeeAvailable || staffAvailable)) return "OPEN";
  if (!Number.isNaN(rs) && now < rs) return "SOON";
  return "CLOSED";
}

/* ===== helpers: year chips & staff text (ใช้ i18n) ===== */
function yearChips(levels: number[] | undefined | null, lang: "th" | "en") {
  if (!levels || levels.length === 0) {
    return [
      {
        id: "all",
        label: lang === "en" ? "All year levels" : "นักศึกษาทุกชั้นปี",
      },
    ];
  }
  const arr = [...new Set(levels)].sort((a, b) => a - b);
  return arr.map((y) => ({
    id: `y${y}`,
    label: lang === "en" ? `Year ${y}` : `ปี ${y}`,
  }));
}

function staffYearChips(
  levels: number[] | undefined | null,
  lang: "th" | "en",
) {
  if (!levels || levels.length === 0) {
    return [
      {
        id: "staff-all",
        label: lang === "en" ? "All year levels" : "นักศึกษาทุกชั้นปี",
      },
    ];
  }
  const arr = [...new Set(levels)]
    .filter((n) => typeof n === "number" && Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

  return arr.map((y) => ({
    id: `staff-y${y}`,
    label: lang === "en" ? `Year ${y}` : `ปี ${y}`,
  }));
}

/** ---------- helpers: photos ---------- */
function pickPhotoUrl(p: unknown): string | null {
  if (typeof p === "string" && p.length > 0) return p;
  if (!p || typeof p !== "object") return null;
  const obj = p as {
    photoUrl?: unknown;
    url?: unknown;
    imageUrl?: unknown;
    publicUrl?: unknown;
    secureUrl?: unknown;
    secure_url?: unknown;
    cloudinaryImage?: {
      secureUrl?: unknown;
      secure_url?: unknown;
      url?: unknown;
    };
  };

  const cand = [
    obj.secureUrl,
    obj.secure_url,
    obj.url,
    obj.photoUrl,
    obj.imageUrl,
    obj.publicUrl,
    obj.cloudinaryImage?.secureUrl,
    obj.cloudinaryImage?.secure_url,
    obj.cloudinaryImage?.url,
  ].find((x): x is string => typeof x === "string" && x.length > 0);

  return cand ?? null;
}

/** ---------- helpers: skill badges ---------- */
type MaybeSkillReward = {
  id?: number | null;
  subSkillCategoryId?: number | null;
  subSkillCategory_id?: number | null;
  baseExperience?: number | null;
  subSkillCategory?: {
    id?: number | null;
    name_TH?: string | null;
    name_EN?: string | null;
    color?: string | null;
    icon?: string | null;
    mainSkillCategory?: {
      name_TH?: string | null;
      name_EN?: string | null;
      color?: string | null;
      icon?: string | null;
    } | null;
  } | null;
};

// ✅ เลือกชื่อให้ตรงกับภาษา (แก้ปัญหา TH || EN ทำให้ EN ไม่ขึ้น)
function pickNameByLang(
  lang: string,
  th?: string | null,
  en?: string | null,
  fallback = "",
): string {
  const thTrim = (th ?? "").trim();
  const enTrim = (en ?? "").trim();

  if (lang === "th") return thTrim || enTrim || fallback;
  return enTrim || thTrim || fallback;
}

function toSkillBadge(r: MaybeSkillReward, idx: number, lang: string) {
  const id =
    r.id ??
    r.subSkillCategoryId ??
    r.subSkillCategory_id ??
    r.subSkillCategory?.id ??
    idx;

  const sub = r.subSkillCategory;
  const main = sub?.mainSkillCategory;

  const mainName = pickNameByLang(lang, main?.name_TH, main?.name_EN, "Skill");
  const subName = pickNameByLang(lang, sub?.name_TH, sub?.name_EN, "");

  const exp =
    typeof r.baseExperience === "number" && r.baseExperience > 0
      ? `${r.baseExperience} EXP`
      : null;

  return {
    id: Number(id),
    label: mainName,
    subLabel:
      [subName || undefined, exp].filter(Boolean).join(" · ") || undefined,
    color: sub?.color || main?.color || null,
    icon: main?.icon || sub?.icon || null,
  };
}

function mergeSkillRewards(rows: MaybeSkillReward[]): MaybeSkillReward[] {
  const map = new Map<string, { proto: MaybeSkillReward; sum: number }>();

  for (const r of rows) {
    const subId =
      r.subSkillCategoryId ??
      r.subSkillCategory_id ??
      r.subSkillCategory?.id ??
      null;

    const key = subId != null ? `sub:${subId}` : `fallback:${r.id ?? ""}`;
    const exp = typeof r.baseExperience === "number" ? r.baseExperience : 0;

    const hit = map.get(key);
    if (hit) hit.sum += exp;
    else map.set(key, { proto: r, sum: exp });
  }

  return Array.from(map.values()).map(({ proto, sum }) => ({
    ...proto,
    id:
      proto.subSkillCategoryId ??
      proto.subSkillCategory_id ??
      proto.subSkillCategory?.id ??
      proto.id ??
      null,
    baseExperience: sum,
  }));
}

/* ===================== SWR fetcher ===================== */

type EventApiResponse = { data?: ApiEvent | ApiEvent[] | null };

async function fetcher(url: string): Promise<EventApiResponse> {
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  const text = await res.text();
  const payload = safeJsonParse<unknown>(text);

  if (!res.ok) {
    const serverMsg = extractServerMessage(payload) || text;
    throw new HttpError(
      serverMsg || `HTTP ${res.status}`,
      res.status,
      undefined,
      payload ?? text,
    );
  }

  if (payload && typeof payload === "object") {
    const obj = payload as { success?: unknown; data?: unknown };

    if ("data" in obj) {
      return { data: obj.data as ApiEvent | ApiEvent[] | null };
    }

    if (obj.success === true && !("data" in obj)) {
      throw new Error("Invalid response: missing data");
    }
  }

  throw new Error("Invalid response");
}

/* ===================== page ===================== */

export default function ActivityDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation("activityDetail");
  const lang = i18n.language?.toLowerCase().startsWith("en") ? "en" : "th";

  const [posting, setPosting] = useState<null | "attendee" | "staff">(null);

  const url = slug
    ? joinUrl(
        backend_url,
        `/api/events/slug/${encodeURIComponent(
          slug,
        )}?includeSkillRewards=true&includePhotos=true&includeCreator=true`,
      )
    : null;

  const { data, error, isLoading, mutate } = useSWR<EventApiResponse>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      errorRetryCount: 0,
      onErrorRetry: () => {},
      revalidateIfStale: false,
      revalidateOnReconnect: false,
    },
  );

  const apiEvent: ApiEvent | null = (() => {
    const raw = data?.data;
    if (Array.isArray(raw)) return raw[0] ?? null;
    return (raw as ApiEvent | null) ?? null;
  })();

  function friendlyError(e: unknown, role: "attendee" | "staff"): string {
    if (e instanceof HttpError) return toThaiMessage(e.message, e.status, role);
    if (e instanceof Error) return toThaiMessage(e.message, undefined, role);
    return toThaiMessage(String(e ?? ""), undefined, role);
  }

  async function registerAttendee() {
    if (!apiEvent || posting) return;
    setPosting("attendee");
    try {
      const slugOpt = (apiEvent as { slug?: string }).slug;
      await toast.promise(
        postJSON(USER_REGISTER_PATH, {
          eventId: apiEvent.id,
          slug: slugOpt,
          action: "register",
        }),
        {
          loading: t("toast.registerAttendee.loading"),
          success: t("toast.registerAttendee.success"),
          error: (e) => friendlyError(e, "attendee"),
        },
      );
      await mutate();
    } finally {
      setPosting(null);
    }
  }

  async function registerStaff() {
    if (!apiEvent || posting) return;
    setPosting("staff");
    try {
      const slugOpt = (apiEvent as { slug?: string }).slug;
      await toast.promise(
        postJSON(STAFF_REGISTER_PATH, {
          eventId: apiEvent.id,
          slug: slugOpt,
          action: "register",
        }),
        {
          loading: t("toast.registerStaff.loading"),
          success: t("toast.registerStaff.success"),
          error: (e) => friendlyError(e, "staff"),
        },
      );
      await mutate();
    } finally {
      setPosting(null);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Toaster position="top-center" />
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 text-center mt-10">
          <div className="text-slate-600">{t("loading")}</div>
        </div>
      </div>
    );
  }

  if (error || !apiEvent) {
    const msg =
      error instanceof Error
        ? toThaiMessage(
            error.message,
            error instanceof HttpError ? error.status : undefined,
            "attendee",
          )
        : t("notFound.description");

    return (
      <div className="min-h-screen bg-gray-50 grid place-items-center p-6">
        <Toaster position="top-center" />
        <div className="max-w-md text-center">
          <div className="text-2xl font-semibold text-gray-900 mb-2">
            {t("notFound.title")}
          </div>
          <p className="text-gray-600 mb-4">{msg}</p>
          <Link
            to="/activities"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-700 text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("notFound.backButton")}
          </Link>
        </div>
      </div>
    );
  }

  const ev = apiEvent as ApiEventWithState;

  const cus = ev.currentUserStatus ?? null;
  const isStaff =
    !!cus?.isStaff || cus?.staffRole != null || cus?.staffStatus != null;

  const isAttendee =
    !!cus?.isRegistered || cus?.registrationStatus != null || false;

  const isRegisteredOnsite = isStaff;
  const isRegisteredOnline = isAttendee && !isStaff;

  const uiStatus: UiStatus = computeUiStatusFromApi(ev);

  const attMax = modeFromMax(ev.maxParticipants);
  const stfMax = modeFromMax(ev.maxStaffCount);

  const currentAtt = normalizeCount(ev.currentParticipants);
  const currentStf = normalizeCount(ev.currentStaffCount);

  const attendeeFull = attMax.limited && currentAtt >= attMax.max;
  const staffFull = stfMax.limited && currentStf >= stfMax.max;

  const bothUnavailable =
    (attMax.closed || attendeeFull) && (stfMax.closed || staffFull);

  const isEventEnded =
    !!ev.activityEnd && new Date(ev.activityEnd).getTime() < Date.now();

  const statusNote =
    uiStatus === "SOON"
      ? ev.registrationStart
        ? t("status.opensAt", {
            date: formatDateUTC(ev.registrationStart, lang),
            defaultValue:
              lang === "en"
                ? `Registration opens on ${formatDateUTC(ev.registrationStart, "en")}`
                : `จะเปิดลงทะเบียนวันที่ ${formatDateUTC(ev.registrationStart, "th")}`,
          })
        : t("status.notOpenYet", {
            defaultValue:
              lang === "en"
                ? "Registration not open yet"
                : "ยังไม่เปิดให้ลงทะเบียน",
          })
      : uiStatus === "CLOSED"
        ? bothUnavailable
          ? attMax.closed && stfMax.closed
            ? t("status.neverOpened")
            : t("status.full")
          : isEventEnded
            ? t("status.ended")
            : t("status.registrationClosed")
        : undefined;

  // ✅ canRegister ต้อง “ไม่เคยลงมาก่อน” ด้วย
  const canRegisterOnline =
    uiStatus === "OPEN" &&
    !isRegisteredOnline &&
    !attMax.closed &&
    (attMax.unlimited || !attendeeFull);

  const canRegisterOnsite =
    uiStatus === "OPEN" &&
    !isRegisteredOnsite &&
    !stfMax.closed &&
    (stfMax.unlimited || !staffFull);

  const cannotRegisterOnlineNote =
    uiStatus === "OPEN" &&
    !isRegisteredOnline &&
    (attMax.closed || attendeeFull)
      ? attMax.closed
        ? t("onlineClosed.notAccepting")
        : t("onlineClosed.full")
      : null;

  const cannotRegisterOnsiteNote =
    uiStatus === "OPEN" && !isRegisteredOnsite && (stfMax.closed || staffFull)
      ? stfMax.closed
        ? t("staffClosed.notAccepting")
        : t("staffClosed.full")
      : null;

  const venueText = ev.isOnline
    ? ev.meetingLink
      ? lang === "en"
        ? `Online · ${ev.meetingLink}`
        : `ออนไลน์ · ${ev.meetingLink}`
      : lang === "en"
        ? "Online"
        : "ออนไลน์"
    : (lang === "en" ? ev.location_EN : ev.location_TH) ||
      ev.location_TH ||
      ev.location_EN ||
      "-";

  const mapUrl: string | null =
    (typeof (ev as unknown as { locationMapUrl?: unknown }).locationMapUrl ===
      "string" &&
    (ev as unknown as { locationMapUrl: string }).locationMapUrl.trim().length >
      0
      ? (ev as unknown as { locationMapUrl: string }).locationMapUrl
      : null) ??
    (typeof (ev as unknown as { googleMapUrl?: unknown }).googleMapUrl ===
      "string" &&
    (ev as unknown as { googleMapUrl: string }).googleMapUrl.trim().length > 0
      ? (ev as unknown as { googleMapUrl: string }).googleMapUrl
      : null) ??
    null;

  const directLat =
    typeof (ev as unknown as { lat?: unknown }).lat === "number"
      ? (ev as unknown as { lat: number }).lat
      : null;
  const directLng =
    typeof (ev as unknown as { lng?: unknown }).lng === "number"
      ? (ev as unknown as { lng: number }).lng
      : null;

  const parsed = parseLatLngFromMapUrl(mapUrl);
  const lat = directLat ?? parsed.lat;
  const lng = directLng ?? parsed.lng;

  //  chips เงื่อนไขการลงทะเบียน
  const baseChips = yearChips(ev.allowedYearLevels, lang);

  const chips = ev.isForCMUEngineering
    ? [
        {
          id: "eng",
          label:
            lang === "en"
              ? "CMU Engineering students"
              : "นักศึกษาคณะวิศวกรรมศาสตร์",
        },
        ...baseChips,
      ]
    : baseChips;

  const staffBaseChips = staffYearChips(ev.staffAllowedYears, lang);

  const staffConditionChips = ev.isForCMUEngineering
    ? [
        {
          id: "staff-eng",
          label:
            lang === "en"
              ? "CMU Engineering students"
              : "นักศึกษาคณะวิศวกรรมศาสตร์",
        },
        ...staffBaseChips,
      ]
    : staffBaseChips;

  const evExt: ApiEventWithExtras = ev as unknown as ApiEventWithExtras;

  const photos: string[] = [
    ...(((ev as unknown as { photos?: unknown[] }).photos ?? []) as unknown[])
      .map(pickPhotoUrl)
      .filter(isNonEmptyString),
    pickIfString(evExt, "coverUrl"),
    pickIfString(evExt, "imageUrl"),
  ]
    .filter(isNonEmptyString)
    .slice(0, 4);

  const rawRewards = ((ev as unknown as { skillRewards?: unknown[] })
    .skillRewards ?? []) as unknown as MaybeSkillReward[];
  const mergedRewards = mergeSkillRewards(rawRewards);
  const skillBadges = mergedRewards.map((r, i) => toSkillBadge(r, i, lang));

  const title =
    lang === "th"
      ? (ev as unknown as { title_TH?: string | null }).title_TH ||
        (ev as unknown as { title_EN?: string | null }).title_EN ||
        t("fallbackTitle")
      : (ev as unknown as { title_EN?: string | null }).title_EN ||
        (ev as unknown as { title_TH?: string | null }).title_TH ||
        t("fallbackTitle");

  const descriptionRaw =
    lang === "th"
      ? (ev as unknown as { description_TH?: string | null }).description_TH ||
        (ev as unknown as { description_EN?: string | null }).description_EN
      : (ev as unknown as { description_EN?: string | null }).description_EN ||
        (ev as unknown as { description_TH?: string | null }).description_TH;
  const description = descriptionRaw?.trim() || t("noDescription");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Toaster position="top-center" />

      <div className="mb-20 max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-10 space-y-6">
        <EventCard
          title={title}
          photos={photos}
          majorCategory={(ev as ApiEventWithState).majorCategory ?? null}
          chips={chips}
          staffConditionChips={staffConditionChips}
          // ✅ ส่ง datetime ตรง ๆ
          registrationStart={ev.registrationStart}
          registrationEnd={ev.registrationEnd}
          activityStart={ev.activityStart}
          activityEnd={ev.activityEnd}
          venueText={venueText}
          skillBadges={skillBadges}
          description={description}
          googleMapUrl={mapUrl ?? undefined}
          lat={lat}
          lng={lng}
          addressForMap={
            lat == null || lng == null
              ? (ev as unknown as { location_TH?: string | null })
                  .location_TH ||
                (ev as unknown as { location_EN?: string | null })
                  .location_EN ||
                null
              : null
          }
          participants={{
            current: currentAtt,
            max: normalizeCount(ev.maxParticipants),
          }}
          staff={{
            current: currentStf,
            max: normalizeCount(ev.maxStaffCount),
          }}
          walkins={{
            enabled: !!(ev as unknown as { walkinEnabled?: unknown })
              .walkinEnabled,
            current: normalizeCount(
              (ev as unknown as { currentWalkins?: unknown }).currentWalkins,
            ),
            max: normalizeCount(
              (ev as unknown as { walkinCapacity?: unknown }).walkinCapacity,
            ),
          }}
          uiStatus={uiStatus}
          statusNote={statusNote}
          isEventEnded={isEventEnded}
          isRegisteredOnline={isRegisteredOnline}
          isRegisteredOnsite={isRegisteredOnsite}
          canRegisterOnsite={canRegisterOnsite}
          canRegisterOnline={canRegisterOnline}
          isPostingOnsite={posting === "staff"}
          isPostingOnline={posting === "attendee"}
          cannotRegisterOnsiteNote={cannotRegisterOnsiteNote}
          cannotRegisterOnlineNote={cannotRegisterOnlineNote}
          onRegisterOnsite={registerStaff}
          onRegisterOnline={registerAttendee}
        />
      </div>
      <PrimaryFooter />
    </div>
  );
}
