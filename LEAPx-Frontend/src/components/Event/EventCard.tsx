import * as React from "react";
import { type FC, type ReactNode } from "react";
import {
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Loader2,
  CheckCircle,
  ImageOff,
  Building2,
} from "lucide-react";

import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import GoogleMapNoKey from "./GoogleMapNoKey";
import ProgressBar from "./ProgressBar";
import type { UiStatus } from "../../../types/ui/events";
import { formatDateTimeRange } from "../../../utils/dateTime";

/* ===================== Types ===================== */
type SkillBadge = {
  id: number;
  label: string;
  subLabel?: string;
  color?: string | null;
  icon?: string | null;
};

type Chip = { id: string; label: string };

type MajorCategory = {
  id: number;
  name_TH: string;
  name_EN: string;
  code: string;
};

export type EventCardProps = {
  title: string;
  photos?: string[];
  chips?: Chip[];
  staffConditionChips?: Chip[];
  majorCategory?: MajorCategory | null;

  // ให้เหลือปุ่มเดียวเมื่อกิจกรรมจบแล้ว
  isEventEnded?: boolean;

  registrationStart: string | Date;
  registrationEnd: string | Date;
  activityStart: string | Date;
  activityEnd: string | Date;

  venueText: string;
  skillBadges?: SkillBadge[];
  description: string;

  uiStatus: UiStatus; // "OPEN" | "SOON" | "CLOSED"
  statusNote?: string;

  lat?: number | null;
  lng?: number | null;
  addressForMap?: string | null;
  googleMapUrl?: string | null;

  participants: { current: number; max: number };
  staff: { current: number; max: number };

  walkins?: {
    enabled?: boolean;
    current: number;
    max: number;
  };

  isRegisteredOnsite?: boolean; // สตาฟ
  isRegisteredOnline?: boolean; // ผู้เข้าร่วม

  // ปุ่มสมัคร
  canRegisterOnsite?: boolean;
  canRegisterOnline?: boolean;
  onRegisterOnsite?: () => void;
  onRegisterOnline?: () => void;

  // สถานะกำลังโพสต์ (ให้ปุ่มไม่หาย แต่ disabled + แสดงสปินเนอร์)
  isPostingOnsite?: boolean;
  isPostingOnline?: boolean;

  // ข้อความปิดเฉพาะฝั่ง
  cannotRegisterOnsiteNote?: string | null;
  cannotRegisterOnlineNote?: string | null;

  // ข้อความช่วงปีสตาฟ
  staffAllowedYearsText?: string | null;

  footerExtra?: ReactNode;
};

/* ===================== Helpers ===================== */
function toPascalFromKebab(name: string) {
  return name
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

function SkillIcon({
  name,
  className,
}: {
  name?: string | null;
  className?: string;
}) {
  const DefaultIcon: LucideIcon = Icons.BadgeCheck;
  if (!name) return <DefaultIcon className={className} />;

  const compName = toPascalFromKebab(name);
  const iconsMap = Icons as unknown as Record<string, LucideIcon>;
  const Comp = iconsMap[compName] ?? DefaultIcon;

  return <Comp className={className} />;
}

function normalizeNum(n: unknown): number {
  if (typeof n === "string") return Number(n.replace(/[,\s]/g, "")) || 0;
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

function modeFromMax(n?: unknown) {
  const m = normalizeNum(n);
  return {
    closed: m === 0,
    unlimited: m >= 1_000_000,
    limited: m > 0 && m < 1_000_000,
    max: m,
  };
}

/* ===================== Component ===================== */
const EventCard: FC<EventCardProps> = ({
  title,
  photos = [],
  chips = [],
  staffConditionChips = [],
  majorCategory,
  isEventEnded,

  registrationStart,
  registrationEnd,
  activityStart,
  activityEnd,
  venueText,
  skillBadges = [],
  description,
  uiStatus,
  statusNote,
  lat,
  lng,
  addressForMap,
  googleMapUrl,
  participants,
  staff,
  walkins,
  isRegisteredOnsite,
  isRegisteredOnline,
  canRegisterOnsite,
  canRegisterOnline,
  onRegisterOnsite,
  onRegisterOnline,
  isPostingOnsite,
  isPostingOnline,
  cannotRegisterOnsiteNote,
  cannotRegisterOnlineNote,
  footerExtra,
}) => {
  const { t, i18n } = useTranslation("eventCard");
  const lang: "th" | "en" = i18n.language?.toLowerCase().startsWith("en")
    ? "en"
    : "th";

  const registrationText = formatDateTimeRange(
    registrationStart,
    registrationEnd,
    lang,
  );

  const activityText = formatDateTimeRange(activityStart, activityEnd, lang);

  const hasPhotos = photos && photos.length > 0;
  const safePhotos = (photos ?? []).slice(0, 4);
  const [idx, setIdx] = React.useState(0);

  const goPrev = () =>
    setIdx((p) => (p - 1 + safePhotos.length) % safePhotos.length);
  const goNext = () => setIdx((p) => (p + 1) % safePhotos.length);
  const setDot = (i: number) => setIdx(i);

  const [lightbox, setLightbox] = React.useState(false);
  const closeLightbox = () => setLightbox(false);
  const openLightbox = () => setLightbox(true);

  const btnBase =
    "inline-flex items-center justify-center gap-2 rounded-full " +
    "px-5 sm:px-6 py-2.5 text-[15px] font-semibold leading-snug " +
    "text-center min-h-[44px]";

  const btnNoWrap = "whitespace-nowrap";
  const btnWide = "w-full sm:w-[240px]";
  const helperSlot = "mt-1 text-xs text-slate-500 min-h-[16px]";

  const staffHelperText =
    cannotRegisterOnsiteNote?.trim() ||
    (uiStatus !== "OPEN" ? statusNote?.trim() : null) ||
    "\u00A0";

  const attendeeHelperText =
    cannotRegisterOnlineNote?.trim() ||
    (uiStatus !== "OPEN" ? statusNote?.trim() : null) ||
    "\u00A0";

  const majorLabel =
    (lang === "en" ? majorCategory?.name_EN : majorCategory?.name_TH)?.trim() ||
    majorCategory?.name_TH?.trim() ||
    majorCategory?.name_EN?.trim() ||
    null;

  // ✅ ป้ายหลักของปุ่มตอน disabled (รองรับ CLOSED + จบกิจกรรม)
  const disabledLabel =
    uiStatus === "SOON"
      ? t("cta.notOpenYet", { defaultValue: "ยังไม่เปิดลงทะเบียน" })
      : uiStatus === "CLOSED" && !!isEventEnded
        ? t("cta.ended", { defaultValue: "กิจกรรมจบแล้ว" })
        : t("cta.closed", { defaultValue: "ปิดรับลงทะเบียนแล้ว" });

  // ✅ เคสปุ่มเดียว: SOON หรือ CLOSED (ทุกกรณี)
  const showSingleButton = uiStatus !== "OPEN";

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white shadow-[0_1px_0_0_rgba(15,23,42,0.02),0_12px_30px_-12px_rgba(15,23,42,0.2)] overflow-hidden">
      <div className="h-1.5 bg-gradient-to-r from-[#a0fff1] via-sky-300 to-[#a0fff1]" />

      <div className="p-5 md:p-6">
        {/* ✅ เปลี่ยน items-stretch -> items-start เพื่อไม่ให้รูปโดนยืดตามฝั่งขวา */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,320px),1fr] gap-6 lg:gap-8 items-start">
          {/* Cover */}
          {/* ✅ self-start + max-h กันรูปสูงเกินเมื่อฝั่งขวามีหลายบรรทัด */}
          <div className="relative self-start rounded-2xl bg-slate-100 overflow-hidden aspect-[4/3] sm:aspect-[16/10] lg:aspect-[3/4] max-w-full lg:max-w-none mx-auto lg:mx-0 lg:max-h-[520px]">
            {hasPhotos ? (
              <>
                <img
                  key={safePhotos[idx]}
                  src={safePhotos[idx]}
                  alt={`${title} - ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {safePhotos.length > 1 && (
                  <>
                    <button
                      onClick={goPrev}
                      className="absolute left-2 top-1/2 -translate-y-1/2 grid place-items-center rounded-full bg-black/50 text-white w-9 h-9 backdrop-blur active:scale-[.98]"
                      aria-label={t("lightbox.prev")}
                      type="button"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={goNext}
                      className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center rounded-full bg-black/50 text-white w-9 h-9 backdrop-blur active:scale-[.98]"
                      aria-label={t("lightbox.next")}
                      type="button"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5">
                      {safePhotos.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setDot(i)}
                          className={[
                            "w-2.5 h-2.5 rounded-full",
                            i === idx ? "bg-white" : "bg-white/60",
                          ].join(" ")}
                          aria-label={`Go to image ${i + 1}`}
                          type="button"
                        />
                      ))}
                    </div>
                  </>
                )}

                <button
                  onClick={openLightbox}
                  className="absolute bottom-2 right-2 grid place-items-center rounded-full bg-black/55 text-white w-9 h-9 backdrop-blur active:scale-[.98]"
                  title={t("hero.expandImage")}
                  type="button"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-slate-100">
                <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/80 px-4 py-3 text-slate-500 shadow-sm">
                  <ImageOff className="h-6 w-6" />
                  <span className="text-sm font-medium">
                    {t("hero.noImage")}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="flex h-full flex-col min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight break-words">
              {title}
            </h1>
            <div className="mt-2 h-px w-full bg-slate-200" />

            {(chips.length > 0 || staffConditionChips.length > 0) && (
              <div className="mt-3 space-y-1.5">
                {chips.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold text-slate-700">
                      {t("meta.registrationCondition")}:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {chips.map((c) => (
                        <span
                          key={c.id}
                          className="inline-flex items-center rounded-full border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white"
                        >
                          {c.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {uiStatus === "OPEN" &&
                  canRegisterOnsite &&
                  staffConditionChips.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold text-slate-700">
                        {t("meta.staffCondition")}:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {staffConditionChips.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center rounded-full border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white"
                          >
                            {c.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}

            <ul className="mt-4 space-y-3 text-slate-900">
              <li className="flex items-start gap-3">
                <Calendar className="w-5 h-5 mt-[2px]" />
                <div>
                  <div className="text-[12px] font-semibold text-slate-600">
                    {t("meta.registrationWindow")}
                  </div>
                  <div className="text-[15px] text-slate-900">
                    {registrationText}
                  </div>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <Calendar className="w-5 h-5 mt-[2px]" />
                <div>
                  <div className="text-[12px] font-semibold text-slate-600">
                    {t("meta.activityDate")}
                  </div>
                  <div className="text-[15px] text-slate-900">
                    {activityText}
                  </div>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 mt-[2px]" />
                <div className="min-w-0">
                  <div className="text-[15px]">{venueText}</div>
                </div>
              </li>

              {majorCategory && (
                <li className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 mt-[2px]" />
                  <div className="min-w-0">
                    <div className="text-[15px] text-slate-900">
                      {lang === "th" ? "จัดโดย " : "Organized by "} {majorLabel}
                    </div>
                  </div>
                </li>
              )}

              {skillBadges.length > 0 && (
                <li className="pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {skillBadges.map((b) => (
                      <span
                        key={b.id}
                        className="inline-flex items-start gap-2 rounded-2xl border border-sky-300 px-3 py-2 text-xs min-w-0"
                        title={b.subLabel}
                        style={b.color ? { borderColor: b.color } : undefined}
                      >
                        <SkillIcon
                          name={b.icon}
                          className="w-4 h-4 mt-0.5 shrink-0"
                        />
                        <span className="min-w-0">
                          <span className="block font-semibold text-slate-800 leading-snug">
                            {b.label}
                          </span>
                          {b.subLabel && (
                            <span className="block text-slate-500 leading-snug break-words">
                              {b.subLabel}
                            </span>
                          )}
                        </span>
                      </span>
                    ))}
                  </div>
                </li>
              )}
            </ul>

            {/* CTA */}
            <div
              className={[
                "mt-6",
                "pt-3 md:pt-5",
                "lg:mt-auto",
                "sm:ml-auto",
                "flex flex-col sm:flex-row sm:flex-wrap",
                "gap-2 sm:gap-3",
                "items-stretch sm:items-start",
                "justify-stretch sm:justify-end",
                "pb-2 lg:pb-0",
              ].join(" ")}
            >
              {/* ✅ NOT OPEN (SOON) หรือ CLOSED -> ปุ่มเดียว */}
              {showSingleButton ? (
                <div className="flex flex-col items-stretch sm:items-end w-full">
                  <button
                    disabled
                    aria-disabled
                    className={[
                      btnBase,
                      btnWide,
                      btnNoWrap,
                      "bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed",
                    ].join(" ")}
                    type="button"
                  >
                    {disabledLabel}
                  </button>

                  <div
                    className={["w-full", "sm:w-[240px]", helperSlot].join(" ")}
                  >
                    {statusNote?.trim() || "\u00A0"}
                  </div>
                </div>
              ) : (
                <>
                  {/* === Staff === */}
                  <div className="flex flex-col items-stretch w-full sm:w-[240px]">
                    {isRegisteredOnsite ? (
                      <button
                        disabled
                        aria-disabled
                        className={[
                          btnBase,
                          btnWide,
                          btnNoWrap,
                          "bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed",
                        ].join(" ")}
                        type="button"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {t("cta.registeredStaff", {
                          defaultValue: "ลงทะเบียนสตาฟแล้ว",
                        })}
                      </button>
                    ) : uiStatus === "OPEN" && canRegisterOnsite ? (
                      <button
                        onClick={onRegisterOnsite}
                        disabled={!!isPostingOnsite}
                        aria-busy={!!isPostingOnsite}
                        className={[
                          btnBase,
                          btnWide,
                          btnNoWrap,
                          "text-slate-900 shadow-sm active:scale-[.98] transition",
                          "bg-[linear-gradient(180deg,#C7F0E5_0%,#96DED1_100%)]",
                          isPostingOnsite ? "opacity-90 cursor-wait" : "",
                        ].join(" ")}
                        type="button"
                      >
                        {isPostingOnsite && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        {isPostingOnsite
                          ? t("cta.registerStaffLoading")
                          : t("cta.registerStaff")}
                      </button>
                    ) : (
                      <button
                        disabled
                        aria-disabled
                        title={
                          cannotRegisterOnsiteNote ?? statusNote ?? undefined
                        }
                        className={[
                          btnBase,
                          btnWide,
                          btnNoWrap,
                          "bg-slate-200 text-slate-500 disabled:opacity-90 cursor-not-allowed",
                        ].join(" ")}
                        type="button"
                      >
                        {t("cta.staffDisabled", {
                          defaultValue: "ไม่สามารถลงทะเบียนสตาฟได้",
                        })}
                      </button>
                    )}

                    <div className={helperSlot}>{staffHelperText}</div>
                  </div>

                  {/* === Attendee === */}
                  <div className="flex flex-col items-stretch w-full sm:w-[240px]">
                    {isRegisteredOnline ? (
                      <button
                        disabled
                        aria-disabled
                        className={[
                          btnBase,
                          btnWide,
                          btnNoWrap,
                          "bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed",
                        ].join(" ")}
                        type="button"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {t("cta.registeredAttendee", {
                          defaultValue: "ลงทะเบียนแล้ว",
                        })}
                      </button>
                    ) : uiStatus === "OPEN" && canRegisterOnline ? (
                      <button
                        onClick={onRegisterOnline}
                        disabled={!!isPostingOnline}
                        aria-busy={!!isPostingOnline}
                        className={[
                          btnBase,
                          btnWide,
                          btnNoWrap,
                          "text-slate-900 shadow-sm active:scale-[.98] transition",
                          "bg-[linear-gradient(180deg,#7DB5DC_0%,#5C9BC8_100%)]",
                          isPostingOnline ? "opacity-90 cursor-wait" : "",
                        ].join(" ")}
                        type="button"
                      >
                        {isPostingOnline && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        {isPostingOnline
                          ? t("cta.registerAttendeeLoading")
                          : t("cta.registerAttendee")}
                      </button>
                    ) : (
                      <button
                        disabled
                        aria-disabled
                        title={
                          cannotRegisterOnlineNote ?? statusNote ?? undefined
                        }
                        className={[
                          btnBase,
                          btnWide,
                          btnNoWrap,
                          "bg-slate-200 text-slate-500 disabled:opacity-90 cursor-not-allowed",
                        ].join(" ")}
                        type="button"
                      >
                        {t("cta.attendeeDisabled", {
                          defaultValue: "ไม่สามารถลงทะเบียนเข้าร่วมได้",
                        })}
                      </button>
                    )}

                    <div className={helperSlot}>{attendeeHelperText}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-slate-200" />

      <div className="p-5 md:p-6 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 mb-2">
            {t("section.detail")}
          </h2>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-slate-700 whitespace-pre-wrap break-words">
            {description}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-3">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              {t("section.place")}
            </h3>
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
              {googleMapUrl || lat != null || addressForMap ? (
                <GoogleMapNoKey
                  lat={lat ?? undefined}
                  lng={lng ?? undefined}
                  address={addressForMap ?? undefined}
                  mapUrl={googleMapUrl ?? undefined}
                  className="absolute inset-0 w-full h-full border-0"
                />
              ) : (
                <div className="w-full h-full grid place-items-center text-slate-400">
                  {t("hero.noMap")}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5">
            <div className="space-y-4">
              {(() => {
                const m = modeFromMax(participants?.max);
                const label = m.closed
                  ? t("quota.participants.closed")
                  : m.unlimited
                    ? t("quota.participants.unlimited")
                    : t("quota.participants.normal");

                return (
                  <ProgressBar
                    current={normalizeNum(participants?.current)}
                    max={normalizeNum(participants?.max)}
                    label={label}
                  />
                );
              })()}

              <div className="h-px bg-slate-200" />

              {(() => {
                const m = modeFromMax(staff?.max);
                const label = m.closed
                  ? t("quota.staff.closed")
                  : m.unlimited
                    ? t("quota.staff.unlimited")
                    : t("quota.staff.normal");

                return (
                  <ProgressBar
                    current={normalizeNum(staff?.current)}
                    max={normalizeNum(staff?.max)}
                    label={label}
                  />
                );
              })()}

              {walkins?.enabled && (
                <>
                  <div className="h-px bg-slate-200" />
                  {(() => {
                    const m = modeFromMax(walkins.max);
                    const label = m.closed
                      ? t("quota.walkin.closed")
                      : m.unlimited
                        ? t("quota.walkin.unlimited")
                        : t("quota.walkin.normal");

                    return (
                      <ProgressBar
                        current={normalizeNum(walkins.current)}
                        max={normalizeNum(walkins.max)}
                        label={label}
                      />
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {footerExtra && (
        <>
          <div className="h-px w-full bg-slate-200" />
          <div className="p-5 md:p-6">{footerExtra}</div>
        </>
      )}

      {lightbox && hasPhotos && (
        <div
          className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-[2px] flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeLightbox();
            }}
            className="absolute top-4 right-4 text-white/90 hover:text-white p-2"
            aria-label={t("lightbox.closeTitle")}
            title={t("lightbox.closeTitle")}
            type="button"
          >
            <X className="w-6 h-6" />
          </button>

          <img
            src={safePhotos[idx]}
            alt={`${title} - ${idx + 1}`}
            className="max-h-[88vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {safePhotos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 grid place-items-center rounded-full bg-white/15 text-white w-10 h-10 backdrop-blur active:scale-[.98]"
                aria-label={t("lightbox.prev")}
                type="button"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 grid place-items-center rounded-full bg-white/15 text-white w-10 h-10 backdrop-blur active:scale-[.98]"
                aria-label={t("lightbox.next")}
                type="button"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2">
                {safePhotos.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDot(i);
                    }}
                    className={[
                      "w-2.5 h-2.5 rounded-full",
                      i === idx ? "bg-white" : "bg-white/60",
                    ].join(" ")}
                    aria-label={`Go to image ${i + 1}`}
                    type="button"
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default EventCard;
