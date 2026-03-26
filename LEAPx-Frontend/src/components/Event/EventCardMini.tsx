import React from "react";
import { Link } from "react-router-dom";
import { Calendar, MapPin, Tag } from "lucide-react";
import type { EventCardModel, UiStatus } from "../../../types/ui/events";
import { useTranslation } from "react-i18next";

type Chip = {
  id: string;
  kind: "tag" | "audience" | "major" | string;
  label: string;
};

export type EventCardMiniExtra = Partial<{
  regStart: string;
  imageUrl: string | null;
  capacity: {
    participantsMax?: number;
    participantsNow?: number;
    staffMax?: number;
    staffNow?: number;
  };
  chips: Chip[];

  //  รองรับข้อมูล 2 ภาษา (มาจาก backend)
  title_TH: string;
  title_EN: string;
  location_TH: string;
  location_EN: string;
  skills_TH: string[];
  skills_EN: string[];

  //  ใหม่: code ของสาขา (CPE/CE/...)
  majorCategoryCode: string | null;
}>;

type Props = { ev: EventCardModel & EventCardMiniExtra };

const isUnlimited = (n?: number) => typeof n === "number" && n >= 1_000_000;

function shouldShowQuota(max?: number): boolean {
  if (typeof max !== "number") return false;
  if (isUnlimited(max)) return true;
  return max >= 1;
}

function isThaiLang(lang?: string): boolean {
  return Boolean(lang && lang.toLowerCase().startsWith("th"));
}

function formatDate(iso?: string, lang?: string) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(+d)) return "-";
  const locale = isThaiLang(lang) ? "th-TH" : "en-US";
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ctaClass(status: UiStatus) {
  if (status === "SOON") return "bg-[#D9D9D9] text-slate-700 cursor-default";
  if (status === "OPEN")
    return "bg-[#B7E8E8] text-slate-900 hover:brightness-95";
  return "bg-[#FB8A86] text-white cursor-default";
}

function mergeChipsWithMajor(ev: EventCardModel & EventCardMiniExtra): Chip[] {
  const base: Chip[] =
    (ev.chips && ev.chips.length
      ? ev.chips
      : (ev.badges ?? []).map(
          (label, idx): Chip => ({
            id: `${ev.id}-badge-${idx}`,
            kind: "audience",
            label,
          })
        )) ?? [];

  const code = (ev.majorCategoryCode ?? "").trim();
  const majorChip: Chip | null = code
    ? { id: `${ev.id}-major-code`, kind: "major", label: code }
    : null;

  // กันซ้ำ (เผื่อมีคนส่ง chip code มาแล้ว)
  const seen = new Set<string>();
  const out: Chip[] = [];
  const push = (c: Chip) => {
    const key = `${c.kind}::${c.label}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(c);
  };

  if (majorChip) push(majorChip);
  base.forEach((c: Chip) => push(c));

  return out;
}

const EventCardMiniBase: React.FC<Props> = ({ ev }) => {
  const { t, i18n } = useTranslation("eventCardMini");
  const lang = i18n.language || "th";
  const th = isThaiLang(lang);

  const status: UiStatus = (ev.status as UiStatus) || "CLOSED";
  const imgUrl = ev.imageUrl ?? "";

  const chips: Chip[] = mergeChipsWithMajor(ev);

  const displayTitle =
    (th ? ev.title_TH || ev.title : ev.title_EN || ev.title) ||
    (th ? "กิจกรรม" : "Activity");

  const displayLocation =
    (th ? ev.location_TH || ev.location : ev.location_EN || ev.location) || "";

  const displaySkills: string[] = (th ? ev.skills_TH : ev.skills_EN)?.length
    ? (th ? ev.skills_TH : ev.skills_EN) ?? []
    : ev.skills ?? [];

  const showDate = formatDate(
    status === "SOON" ? ev.regStart || ev.date : ev.date,
    lang
  );

  const dateLabel =
    status === "SOON" ? t("label.openRegistration") : t("label.startActivity");

  const pNow = ev.capacity?.participantsNow;
  const pMax = ev.capacity?.participantsMax;
  const sNow = ev.capacity?.staffNow;
  const sMax = ev.capacity?.staffMax;

  const showParticipantsQuota = shouldShowQuota(pMax);
  const showStaffQuota = shouldShowQuota(sMax);

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    ev.slug ? (
      <Link
        to={`/activities/${encodeURIComponent(ev.slug)}`}
        state={{ initial: ev }}
        aria-label={displayTitle}
        className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-2xl"
      >
        {children}
      </Link>
    ) : (
      <div className="block">{children}</div>
    );

  const ctaText =
    status === "OPEN"
      ? t("cta.open")
      : status === "SOON"
      ? t("cta.soon")
      : t("cta.closed");

  const skillsText = displaySkills?.length
    ? displaySkills.join(" • ")
    : t("skillsDefault");

  return (
    <Wrapper>
      <article
        className="h-full rounded-2xl bg-white border border-slate-200/70 shadow-sm overflow-hidden flex flex-col
                   transition hover:shadow-md hover:-translate-y-[1px] cursor-pointer"
      >
        <div className="aspect-[3/4] bg-slate-200 relative overflow-hidden">
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={displayTitle}
              className="absolute inset-0 w-full h-full object-cover transition duration-300 group-hover:scale-[1.02]"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "";
              }}
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-slate-500 text-sm">
              {t("noImage")}
            </div>
          )}
        </div>

        <div className="p-4 flex-1">
          <h3 className="font-bold text-lg text-slate-900 line-clamp-2">
            {displayTitle}
          </h3>

          {chips.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {chips.map((c: Chip) => {
                const isMajor = c.kind === "major";
                return (
                  <span
                    key={c.id}
                    className={[
                      "text-[11px] px-2 py-0.5 rounded-full bg-white border",
                      isMajor
                        ? [
                            "border-[#B7E8E8]",
                            "border-2",
                            "text-slate-900",
                            "shadow-[0_1px_0_0_rgba(15,23,42,0.04)]",
                          ].join(" ")
                        : "text-slate-600 border-slate-200",
                    ].join(" ")}
                    title={c.kind}
                  >
                    {isMajor ? `${t("chips.organizedBy")} ${c.label}` : c.label}
                  </span>
                );
              })}
            </div>
          )}

          <div className="mt-3 space-y-1.5 text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="shrink-0" />
              <span className="text-slate-500 mr-1">{dateLabel}</span>
              {showDate}
            </div>

            <div className="flex items-start gap-2">
              <Tag size={16} className="shrink-0 mt-0.5" />
              <span className="line-clamp-2">{skillsText}</span>
            </div>

            {!!displayLocation && (
              <div className="flex items-center gap-2">
                <MapPin size={16} className="shrink-0" />
                <span className="line-clamp-1">{displayLocation}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 pt-0 space-y-2">
          {(showParticipantsQuota || showStaffQuota) && (
            <div className="flex flex-wrap gap-2 justify-center">
              {showParticipantsQuota && typeof pMax === "number" && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border">
                  {t("quota.participants")}{" "}
                  {isUnlimited(pMax)
                    ? t("quota.unlimited")
                    : `${pNow ?? 0}/${pMax}`}
                </span>
              )}
              {showStaffQuota && typeof sMax === "number" && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border">
                  {t("quota.staff")}{" "}
                  {isUnlimited(sMax)
                    ? t("quota.unlimited")
                    : `${sNow ?? 0}/${sMax}`}
                </span>
              )}
            </div>
          )}

          {ev.slug && (
            <Link
              to={`/activities/${encodeURIComponent(ev.slug)}`}
              state={{ initial: ev }}
              className={`block text-center w-full rounded-xl px-4 py-2 font-semibold transition ${ctaClass(
                status
              )}`}
            >
              {ctaText}
            </Link>
          )}
        </div>
      </article>
    </Wrapper>
  );
};

const EventCardMini = React.memo(EventCardMiniBase);
export default EventCardMini;
