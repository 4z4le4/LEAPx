/**
 * EventMode Section - Event mode (public/private) and participant list requirement
 */

import type { EventMode } from "../../../../../../types/api/event";

interface EventModeSectionProps {
  eventMode: string;
  onEventModeChange: (mode: EventMode) => void;
  requireList: boolean | null;
  onRequireListChange: (require: boolean) => void;
}

function RadioDot({
  checked,
  label,
  onChange,
  name,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
  name: string;
}) {
  return (
    <label className="inline-flex items-center gap-2">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span
        className={[
          "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition",
          "ring-1",
          checked
            ? "bg-cyan-50 text-slate-800 ring-cyan-200"
            : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
        ].join(" ")}
      >
        <span
          className={
            "h-2.5 w-2.5 rounded-full ring-2 " +
            (checked
              ? "bg-cyan-500 ring-cyan-100"
              : "bg-slate-300 ring-transparent")
          }
        />
        {label}
      </span>
    </label>
  );
}

export default function EventModeSection({
  eventMode,
  onEventModeChange,
  requireList,
  onRequireListChange,
}: EventModeSectionProps) {
  return (
    <section className="py-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          {/* Event Mode Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">
              โหมดกิจกรรม <span className="text-red-500">*</span>
            </span>
            <div className="relative">
              <select
                value={eventMode}
                onChange={(e) => onEventModeChange(e.target.value as EventMode)}
                className="h-9 appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-8 text-sm text-slate-800 outline-none transition hover:bg-white focus:ring-2 focus:ring-slate-300"
              >
                <option value="public">สาธารณะ</option>
                <option value="private">ส่วนตัว</option>
              </select>
              <svg
                className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z" />
              </svg>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden h-6 w-px bg-slate-200 md:block" />

          {/* Require List Radio Buttons */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <RadioDot
              name="requireList"
              checked={requireList === true}
              onChange={() => onRequireListChange(true)}
              label="ต้องการกำหนดรายชื่อผู้เข้าร่วม"
            />
            <RadioDot
              name="requireList"
              checked={requireList === false}
              onChange={() => onRequireListChange(false)}
              label="ไม่ต้องการกำหนดรายชื่อผู้เข้าร่วม"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
