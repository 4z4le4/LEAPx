/**
 * CheckInSection - redesigned to match EventParticipantsEditor style
 */

import React from "react";
import PillInput from "../../../../../components/Event/PillInput";
import { Info, Plus, Trash2, ChevronDown, Clock } from "lucide-react";
import type { UICheckInTimeSlot } from "../../../../../../types/ui/checkIn.types";

interface CheckInSectionProps {
  checkInTimeSlots: UICheckInTimeSlot[];
  onAddSlot: () => void;
  onRemoveSlot: (id: number) => void;
  onSlotChange: (
    id: number,
    field: keyof UICheckInTimeSlot,
    value: string | number,
  ) => void;
  activityStartDate?: string;
  activityEndDate?: string;
}

function getSlotDisplayName(slot: UICheckInTimeSlot) {
  return slot.name_TH?.trim() || `รอบ ${slot.slot_number}`;
}

function isTimeOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
) {
  const startA = new Date(`1970-01-01T${aStart}`);
  const endA = new Date(`1970-01-01T${aEnd}`);
  const startB = new Date(`1970-01-01T${bStart}`);
  const endB = new Date(`1970-01-01T${bEnd}`);

  return startA < endB && endA > startB;
}

function findOverlap(slots: UICheckInTimeSlot[], target: UICheckInTimeSlot) {
  return slots.find((s) => {
    if (s.id === target.id) return false;
    if (s.date !== target.date) return false;

    if (!s.startTime || !s.endTime || !target.startTime || !target.endTime)
      return false;

    return isTimeOverlap(
      target.startTime,
      target.endTime,
      s.startTime,
      s.endTime,
    );
  });
}

export default function CheckInSection({
  checkInTimeSlots,
  onAddSlot,
  onRemoveSlot,
  onSlotChange,
  activityStartDate,
  activityEndDate,
}: CheckInSectionProps) {
  const [expanded, setExpanded] = React.useState(true);
  const [slotErrors, setSlotErrors] = React.useState<Record<number, string>>(
    {},
  );
  const canAddSlot = !!activityStartDate && !!activityEndDate;

  return (
    <section className="py-6">
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden ">
        {/* ── Header ── */}
        <div
          className={`flex items-start justify-between gap-3 px-4 py-3 ${
            expanded ? "border-b border-slate-200" : ""
          }`}
        >
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-slate-800 hover:bg-slate-50"
              aria-expanded={expanded}
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  expanded ? "rotate-0" : "-rotate-90"
                }`}
              />
              <span className="font-medium">
                ช่วงเวลาเช็คอิน - เช็คเอาท์ (Check-in Time Slots)
              </span>
            </button>
            <div className="text-xs text-slate-400 pl-2">
              กำหนดรอบและช่วงเวลาสำหรับการเช็คอินกิจกรรม
            </div>
          </div>

          <button
            type="button"
            onClick={canAddSlot ? onAddSlot : undefined}
            disabled={!canAddSlot}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-white transition ${
              canAddSlot
                ? "bg-cyan-500 hover:bg-cyan-700"
                : "cursor-not-allowed bg-slate-300"
            }`}
          >
            <Plus className="h-4 w-4" />
            เพิ่มช่วงเวลา
          </button>
        </div>

        {/* ── Collapsible content ── */}
        {expanded && (
          <>
            {/* Summary bar */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <div className="text-sm text-slate-600">
                ทั้งหมด{" "}
                <span className="font-medium text-slate-900">
                  {checkInTimeSlots.length}
                </span>{" "}
                ช่วงเวลา
              </div>
            </div>

            <div className="px-3 py-1 space-y-0">
              {/* ── No date selected warning ── */}
              {!canAddSlot ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500 justify-center"
                >
                  <Info className="mt-0.5 h-4 w-4 text-slate-400 shrink-0" />
                  <span>โปรดเลือกวันจัดกิจกรรมก่อน จึงจะเพิ่มช่วงเวลาได้</span>
                </div>
              ) : checkInTimeSlots.length === 0 ? (
                /* ── Empty state ── */
                <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                  <Clock className="h-8 w-8 text-slate-300" />
                  <p className="text-sm">
                    ยังไม่มีช่วงเวลา — กด "เพิ่มช่วงเวลา" เพื่อเริ่ม
                  </p>
                </div>
              ) : (
                /* ── Slot table ── */
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="px-3 py-2">ชื่อรอบ</th>
                        <th className="px-3 py-2">วันที่</th>
                        <th className="px-3 py-2">เวลาเริ่มกิจกรรม</th>
                        <th className="px-3 py-2">เวลาจบกิจกรรม</th>
                        <th className="px-3 py-2">
                          สามารถสแกนได้ก่อนเวลา (นาที)
                        </th>
                        <th className="px-3 py-2 text-right">
                          <span className="text-xs text-slate-400">จัดการ</span>
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {checkInTimeSlots.map((slot) => (
                        <React.Fragment key={slot.id}>
                          <tr key={slot.id} className="align-middle">
                            {/* ชื่อรอบ */}
                            <td className="px-1 py-1.5 align-top">
                              <PillInput
                                type="text"
                                value={slot.name_TH ?? ""}
                                placeholder={getSlotDisplayName(slot)}
                                onChange={(val: string) =>
                                  onSlotChange(slot.id, "name_TH", val)
                                }
                              />
                            </td>

                            {/* วันที่ */}
                            <td className="px-1 py-2 align-top ">
                              <PillInput
                                type="date"
                                min={activityStartDate}
                                max={activityEndDate}
                                value={slot.date}
                                onChange={(val: string) =>
                                  onSlotChange(slot.id, "date", val)
                                }
                              />
                            </td>

                            {/* เวลาเริ่ม */}
                            <td className="px-1 py-2 align-top">
                              <PillInput
                                type="time"
                                value={slot.startTime}
                                className={
                                  slotErrors[slot.id]
                                    ? "border-red-400 bg-red-50 focus:ring-red-400 focus:border-red-400"
                                    : ""
                                }
                                onChange={(val: string) => {
                                  const updated = { ...slot, startTime: val };

                                  const overlap = findOverlap(
                                    checkInTimeSlots,
                                    updated,
                                  );

                                  if (overlap) {
                                    setSlotErrors((prev) => ({
                                      ...prev,
                                      [slot.id]: "ช่วงเวลานี้ซ้ำกับรอบอื่น",
                                    }));
                                  } else {
                                    setSlotErrors((prev) => ({
                                      ...prev,
                                      [slot.id]: "",
                                    }));
                                    onSlotChange(slot.id, "startTime", val);
                                  }
                                }}
                              />
                              {slotErrors[slot.id] && (
                                <div className="mt-2 h-[16px] text-[11px] text-red-500 leading-tight">
                                  {slotErrors[slot.id] || ""}
                                </div>
                              )}
                            </td>

                            {/* เวลาจบ */}
                            <td className="px-1 py-2 align-top">
                              <PillInput
                                type="time"
                                value={slot.endTime}
                                className={
                                  slotErrors[slot.id]
                                    ? "border-red-400 bg-red-50 focus:ring-red-400 focus:border-red-400"
                                    : ""
                                }
                                onChange={(val: string) => {
                                  const updated = { ...slot, endTime: val };

                                  const overlap = findOverlap(
                                    checkInTimeSlots,
                                    updated,
                                  );

                                  if (overlap) {
                                    setSlotErrors((prev) => ({
                                      ...prev,
                                      [slot.id]: "ช่วงเวลานี้ซ้ำกับรอบอื่น",
                                    }));
                                  } else {
                                    setSlotErrors((prev) => ({
                                      ...prev,
                                      [slot.id]: "",
                                    }));
                                    onSlotChange(slot.id, "endTime", val);
                                  }
                                }}
                              />
                              {slotErrors[slot.id] && (
                                <div className="mt-2 h-[16px] text-[11px] text-red-500 leading-tight">
                                  {slotErrors[slot.id] || ""}
                                </div>
                              )}
                            </td>

                            {/* เช็คอินก่อนเวลา */}
                            <td className="px-1 py-2 align-top">
                              <PillInput
                                type="number"
                                min={0}
                                value={slot.allowCheckInBefore ?? 0}
                                onChange={(val: string) => {
                                  let num = Number(val);
                                  if (isNaN(num) || num < 0) num = 0;
                                  onSlotChange(
                                    slot.id,
                                    "allowCheckInBefore",
                                    String(num),
                                  );
                                }}
                              />
                            </td>

                            {/* ลบ */}
                            <td className="px-3 py-2.5 text-right align-top">
                              <button
                                type="button"
                                onClick={() => onRemoveSlot(slot.id)}
                                className="rounded-full p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-500 transition"
                                aria-label="ลบรอบนี้"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
