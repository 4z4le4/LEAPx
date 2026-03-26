import { Users, IdCard, Footprints } from "lucide-react";
import {
  formatDate,
  formatCapacity,
  getEventCover,
} from "../utils/eventHelpers";
import { mapEventStatus } from "../utils/eventStatus";
import type { EventDetail } from "../types/eventDetail.types";

interface Props {
  event: EventDetail;
}

export default function EventBannerLayout({ event }: Props) {
  const cover = getEventCover(event.photos);

  /* ===== status (ใช้ logic เดียวกับ list) ===== */
  const status = mapEventStatus({
    status: event.status,
    activityStart: event.activityStart,
    activityEnd: event.activityEnd,
    registrationStart: event.registrationStart,
    registrationEnd: event.registrationEnd,
  });

  const hasRegistration =
    event.registrationStart && event.registrationEnd;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 mb-6 sticky top-0 z-20">

      <div className="flex gap-4 items-start">

        {/* ===== image ===== */}
        <div className="h-[80px] w-[80px] overflow-hidden rounded-md bg-slate-200 flex-shrink-0">
          {cover ? (
            <img
              src={cover}
              alt={event.title_TH}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-[10px] text-slate-500">
              ไม่มีรูป
            </div>
          )}
        </div>

        {/* ===== content ===== */}
        <div className="flex-1 grid grid-cols-7 gap-4">
          {/* ===== title ===== */}
          <div className="col-span-2">
            <div className="text-sm font-medium text-slate-800">
              {event.title_TH}
            </div>

            {event.title_EN && (
              <div className="text-xs text-slate-500">
                {event.title_EN}
              </div>
            )}
          </div>

          {/* ===== category ===== */}
          <div className="text-sm text-slate-800">
            {event.majorCategory
              ? `${event.majorCategory.name_TH} (${event.majorCategory.code})`
              : "-"}
          </div>

          {/* ===== registration date ===== */}
          <div>
            {hasRegistration ? (
              <>
                <div className="text-xs text-slate-500">เริ่ม</div>
                <div className="whitespace-nowrap">
                  {formatDate(event.registrationStart)}
                </div>

                <div className="text-xs text-slate-500 mt-1">จบ</div>
                <div className="whitespace-nowrap">
                  {formatDate(event.registrationEnd)}
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400">
                ไม่มีช่วงลงทะเบียน
              </div>
            )}
          </div>

          {/* ===== activity date ===== */}
          <div>
            <div className="text-xs text-slate-500">เริ่ม</div>
            <div className="whitespace-nowrap">
              {formatDate(event.activityStart)}
            </div>

            <div className="text-xs text-slate-500 mt-1">จบ</div>
            <div className="whitespace-nowrap">
              {formatDate(event.activityEnd)}
            </div>
          </div>

          {/* ===== capacity ===== */}
          <div className="space-y-2 text-sm text-slate-800">

            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-slate-500" />
              {formatCapacity(
                event.currentParticipants,
                event.maxParticipants
              )}
            </div>

            <div className="flex items-center gap-1">
              <IdCard className="w-4 h-4 text-slate-500" />
              {formatCapacity(
                event.currentStaffCount,
                event.maxStaffCount
              )}
            </div>

            <div className="flex items-center gap-1">
              <Footprints className="w-4 h-4 text-slate-500" />
              {formatCapacity(
                event.currentWalkins,
                event.walkinCapacity
              )}
            </div>

          </div>

          {/* ===== status (เหมือน list) ===== */}
          <div className="flex justify-end items-center">
            <span
              className={`
                inline-flex items-center justify-center
                min-w-[110px]
                px-3 py-1.5
                rounded-full
                text-xs font-medium
                whitespace-nowrap
                ${status.className}
              `}
            >
              {status.label}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}