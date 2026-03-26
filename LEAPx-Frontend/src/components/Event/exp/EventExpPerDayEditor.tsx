import React from "react";
import { ChevronDown, Plus, HelpCircle, Trash2, Info } from "lucide-react";
import { backend_url } from "../../../../utils/constants";
import type { UICheckInTimeSlot } from "../../../../types/ui/checkIn.types";
import Select from "../../../components/ui/CustomSelect";

/* ===================== Types ===================== */
export type ExpActivityType = "I" | "II" | "III" | "IV";

export type ExpItem = {
  // เก็บเป็น string (id ของ mainSkillCategory)
  categoryId?: string | null;
  // string (id ของ subSkill)
  skillId?: string | null;
  activityType?: ExpActivityType | null;
  exp: number | null; // คะแนน EXP
};

export type ExpTimeSlot = {
  useCheckInSlot: boolean; // ใช้ช่วงเวลา check-in
  checkInTimeSlotId?: number | null;
  requireCheckIn?: boolean;
  requireCheckOut?: boolean;
  useTimeWindow?: boolean;
  start?: string;
  end?: string;
  items: ExpItem[];
};

export type DayExpConfig = {
  date: string; // YYYY-MM-DD (ISO date only)
  expanded?: boolean;
  slots: ExpTimeSlot[];
};

export type ExpEditorProps = {
  dates: string[];
  value: DayExpConfig[];
  onChange: (v: DayExpConfig[]) => void;

  checkInSlots?: UICheckInTimeSlot[];

  validateSignal?: number;
};

/* ========= Types สำหรับ /api/skills ========= */
type ApiSubSkill = {
  id: number;
  mainSkillCategory_id: number;
  name_TH: string;
  name_EN: string;
  description_TH: string | null;
  description_EN: string | null;
  slug: string;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  sortOrder: number;
};

type ApiMainSkill = {
  id: number;
  name_TH: string;
  name_EN: string;
  description_TH: string | null;
  description_EN: string | null;
  slug: string;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  sortOrder: number;
  subSkills: ApiSubSkill[];
};

type LevelThreshold = {
  id: number;
  levelType: "I" | "II" | "III" | "IV";
  expRequired: number;
  levelName_TH: string;
  levelName_EN: string;
};

type SkillsApiResponse = {
  success: boolean;
  type: string;
  levelThresholds?: LevelThreshold[];
  data: ApiMainSkill[];
};

type ActivityTypeOption = {
  id: ExpActivityType;
  label: string;
  expRequired: number;
};

/* ===================== Small UI primitives ===================== */
const Row = ({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) => (
  <div
    className={`grid gap-3 md:grid-cols-[minmax(220px,1fr)_minmax(240px,1.2fr)_minmax(180px,0.9fr)_minmax(120px,0.5fr)] items-start ${className}`}
  >
    {children}
  </div>
);

function Hint({ text }: { text: string }) {
  return (
    <span
      className="relative inline-flex items-center justify-center group"
      aria-haspopup="true"
    >
      <HelpCircle
        className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-500"
        aria-hidden="true"
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-20
                   mt-1 -translate-x-1/2 whitespace-nowrap rounded-md
                   bg-sky-100 px-2 py-1 text-[11px] text-gray-600 shadow
                   opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

function getSlotDisplayName(slot: UICheckInTimeSlot) {
  return slot.name_TH?.trim() || `รอบ ${slot.slot_number}`;
}

/* ===================== Main component ===================== */
export default function EventExpPerDayEditor({
  dates,
  value,
  onChange,
  checkInSlots,
  validateSignal,
}: ExpEditorProps) {
  /** โหลด mainSkill + subSkill จาก backend */
  const [skillCategories, setSkillCategories] = React.useState<ApiMainSkill[]>(
    [],
  );
  const [loadingSkills, setLoadingSkills] = React.useState(false);
  const [skillsError, setSkillsError] = React.useState<string | null>(null);

  // เก็บ level thresholds จาก API
  const [levelThresholds, setLevelThresholds] = React.useState<
    LevelThreshold[]
  >([]);

  // ✅ โหมดโชว์ error ใต้ช่อง (เปิดตอนกดบันทึกจาก parent)
  const [showValidation, setShowValidation] = React.useState(false);
  const prevSignalRef = React.useRef<number | undefined>(undefined);

  React.useEffect(() => {
    if (validateSignal == null) return;
    if (prevSignalRef.current === undefined) {
      prevSignalRef.current = validateSignal;
      return;
    }
    if (prevSignalRef.current !== validateSignal) {
      prevSignalRef.current = validateSignal;
      setShowValidation(true);
    }
  }, [validateSignal]);

  React.useEffect(() => {
    const API_SKILLS = `${backend_url}/api/skills`;
    const ac = new AbortController();

    const fetchSkills = async () => {
      try {
        setLoadingSkills(true);
        setSkillsError(null);

        console.log("[skills] fetching:", API_SKILLS);

        const res = await fetch(API_SKILLS, {
          credentials: "include",
          signal: ac.signal,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error("[skills] non-OK response", res.status, text);
          throw new Error(`HTTP ${res.status}`);
        }

        const json: SkillsApiResponse = await res.json();
        if (!json.success) throw new Error("API success = false");

        // เก็บ thresholds ถ้ามี
        if (Array.isArray(json.levelThresholds)) {
          setLevelThresholds(json.levelThresholds);
        }

        const sortedMain = [...json.data]
          .filter((m) => m.isActive)
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((m) => ({
            ...m,
            subSkills: [...(m.subSkills ?? [])]
              .filter((s) => s.isActive)
              .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
          }));

        setSkillCategories(sortedMain);
      } catch (err) {
        if ((err as DOMException).name === "AbortError") return;
        console.error("Failed to load skills:", err);
        setSkillsError("ไม่สามารถโหลดหมวดทักษะได้");
      } finally {
        setLoadingSkills(false);
      }
    };

    fetchSkills();

    return () => ac.abort();
  }, []); // เรียกครั้งเดียวตอน mount

  // options สำหรับ select "ประเภทกิจกรรม"
  const activityTypeOptions: ActivityTypeOption[] = React.useMemo(
    () =>
      levelThresholds.length
        ? levelThresholds.map((lt, index) => ({
            id: lt.levelType,
            label: `ระดับ ${index + 1} (${lt.levelName_TH})`,
            expRequired: lt.expRequired,
          }))
        : [
            { id: "I", label: "ระดับ 1 (รู้จัก)", expRequired: 8 },
            { id: "II", label: "ระดับ 2 (เข้าใจ)", expRequired: 16 },
            { id: "III", label: "ระดับ 3 (ใช้เป็น)", expRequired: 32 },
            { id: "IV", label: "ระดับ 4 (ผู้นำ)", expRequired: 64 },
          ],
    [levelThresholds],
  );

  const ensureDays = React.useMemo<DayExpConfig[]>(() => {
    const byDate = new Map(value.map((d) => [d.date, d]));

    return dates.map((date, idx) => {
      const existing = byDate.get(date);

      if (existing) return existing;

      return {
        date,
        expanded: idx === 0,
        slots: [
          {
            useCheckInSlot: false,
            checkInTimeSlotId: null,
            requireCheckIn: true,
            requireCheckOut: false,
            items: [{ exp: null }],
          },
        ],
      };
    });
  }, [dates, value]);

  React.useEffect(() => {
    if (ensureDays.length !== value.length) {
      onChange(ensureDays);
      return;
    }

    const changed = ensureDays.some((d, i) => d.date !== value[i]?.date);

    if (changed) {
      onChange(ensureDays);
    }
  }, [ensureDays, value, onChange]);

  React.useEffect(() => {
    if (!checkInSlots) return;

    let changed = false;

    const next = ensureDays.map((day) => {
      const validIds = new Set(
        checkInSlots.filter((s) => s.date === day.date).map((s) => s.id),
      );

      return {
        ...day,
        slots: day.slots.map((slot) => {
          if (
            slot.useCheckInSlot &&
            slot.checkInTimeSlotId &&
            !validIds.has(slot.checkInTimeSlotId)
          ) {
            changed = true;

            return {
              ...slot,
              checkInTimeSlotId: null,
            };
          }

          return slot;
        }),
      };
    });

    if (changed) {
      onChange(next);
    }
  }, [checkInSlots, ensureDays, onChange]);

  /* ---------- helpers ---------- */
  const patch = (i: number, next: Partial<DayExpConfig>) => {
    const copy = [...ensureDays];
    copy[i] = { ...copy[i], ...next };
    onChange(copy);
  };

  const patchSlot = (di: number, si: number, next: Partial<ExpTimeSlot>) => {
    const copy = [...ensureDays];
    const slots = [...copy[di].slots];
    slots[si] = { ...slots[si], ...next };
    copy[di] = { ...copy[di], slots };
    onChange(copy);
  };

  const patchItem = (
    di: number,
    si: number,
    ii: number,
    next: Partial<ExpItem>,
  ) => {
    const copy = [...ensureDays];
    const slots = [...copy[di].slots];
    const items = [...slots[si].items];
    items[ii] = { ...items[ii], ...next };
    slots[si] = { ...slots[si], items };
    copy[di] = { ...copy[di], slots };
    onChange(copy);
  };

  const addItem = (di: number, si: number) =>
    patchSlot(di, si, {
      items: [...ensureDays[di].slots[si].items, { exp: null }],
    });

  const removeItem = (di: number, si: number, ii: number) => {
    const items = [...ensureDays[di].slots[si].items].filter(
      (_, k) => k !== ii,
    );
    patchSlot(di, si, { items });
  };

  const addTimeSlot = (di: number) =>
    patch(di, {
      slots: [
        ...ensureDays[di].slots,
        {
          useCheckInSlot: true,
          checkInTimeSlotId: null,
          requireCheckIn: true,
          requireCheckOut: false,
          items: [{ exp: null }],
        },
      ],
    });

  const removeTimeSlot = (di: number, si: number) => {
    const slots = ensureDays[di].slots.filter((_, k) => k !== si);
    patch(di, {
      slots: slots.length
        ? slots
        : [
            {
              useCheckInSlot: false,
              checkInTimeSlotId: null,
              items: [{ exp: null }],
            },
          ],
    });
  };

  /* ---------- validation helpers ---------- */
  const isFilled = (v: unknown) => String(v ?? "").trim() !== "";

  const getItemErrors = (it: ExpItem) => {
    const hasCategory = isFilled(it.categoryId);
    const hasSkill = isFilled(it.skillId);
    const hasType = isFilled(it.activityType);

    // ✅ ถ้ายังไม่เริ่มเลือกอะไรเลยในแถวนั้น → ไม่ต้อง error แม้กดบันทึก
    const started = hasCategory || hasSkill || hasType;
    if (!started) {
      return { categoryId: "", skillId: "", activityType: "" };
    }

    // ✅ ถ้าเลือกหมวดหลักแล้ว → ต้องเลือกทักษะย่อย + ประเภทกิจกรรม ให้ครบ
    if (hasCategory) {
      return {
        categoryId: "",
        skillId: hasSkill ? "" : "กรุณาเลือกทักษะย่อย",
        activityType: hasType ? "" : "กรุณาเลือกประเภทกิจกรรม",
      };
    }

    // ✅ ถ้าไปเลือก skill/type ทั้งที่ยังไม่เลือกหมวดหลัก → เตือนให้เลือกหมวดหลักก่อน
    return {
      categoryId: "กรุณาเลือกหมวดหมู่หลัก",
      skillId: "",
      activityType: "",
    };
  };

  /* ---------- rendering ---------- */
  const formatThaiDate = (iso: string) => {
    const d = new Date(iso + "T00:00:00");
    const thYear = d.getFullYear() + 543;
    const day = d.getDate().toString().padStart(2, "0");
    const thMonths = [
      "ม.ค.",
      "ก.พ.",
      "มี.ค.",
      "เม.ย.",
      "พ.ค.",
      "มิ.ย.",
      "ก.ค.",
      "ส.ค.",
      "ก.ย.",
      "ต.ค.",
      "พ.ย.",
      "ธ.ค.",
    ];
    return `${day} / ${thMonths[d.getMonth()]} / ${thYear}`;
  };

  return (
    <div className="space-y-4">
      <div className="border-t border-slate-200 pt-4 text-base font-medium text-slate-900">
        การประเมินคะแนน EXP สำหรับกิจกรรม
      </div>

      {dates.length === 0 && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600"
        >
          <Info className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
          <span>โปรดเลือกวันจัดกิจกรรม</span>
        </div>
      )}

      {skillsError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
        >
          <Info className="mt-0.5 h-3.5 w-3.5 text-rose-400" />
          <span>{skillsError}</span>
        </div>
      )}

      {ensureDays.map((day, di) => {
        const slotsForThisDay = checkInSlots?.filter(
          (s) => s.date === day.date,
        );

        return (
          <div
            key={day.date}
            className="overflow-visible rounded-xl border border-slate-200"
          >
            <button
              type="button"
              onClick={() => patch(di, { expanded: !day.expanded })}
              className="flex w-full items-center justify-between bg-cyan-100/80 px-4 py-2 text-left focus:outline-none"
              aria-expanded={day.expanded}
            >
              <span className="font-medium">{formatThaiDate(day.date)}</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  day.expanded ? "rotate-0" : "-rotate-90"
                }`}
              />
            </button>

            {day.expanded && (
              <div className="space-y-5 bg-slate-50 p-4">
                {day.slots.map((slot, si) => (
                  <div
                    key={si}
                    className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200"
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      {" "}
                      {/* ใช้ Check-in Slot */}{" "}
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        {" "}
                        <input
                          type="checkbox"
                          checked={slot.useCheckInSlot}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            if (checked) {
                              patchSlot(di, si, {
                                useCheckInSlot: true,
                                checkInTimeSlotId: null,
                              });
                            } else {
                              patchSlot(di, si, {
                                useCheckInSlot: false,
                                checkInTimeSlotId: null,
                              });
                            }
                          }}
                          className="h-4 w-4 accent-cyan-600"
                        />
                        ต้องการกำหนดตามช่วงเวลา
                      </label>
                      {/* Select Check-in Time Slot */}
                      {slot.useCheckInSlot && (
                        <div className="flex items-center gap-2 text-sm">
                          <Select
                            className="w-56 [&>button]:py-1.5 [&>button]:px-3"
                            value={
                              slot.checkInTimeSlotId
                                ? String(slot.checkInTimeSlotId)
                                : ""
                            }
                            onChange={(v) =>
                              patchSlot(di, si, {
                                checkInTimeSlotId: v ? Number(v) : null,
                              })
                            }
                            placeholder={
                              slotsForThisDay?.length
                                ? "เลือกช่วงเวลา"
                                : "ไม่มีช่วงเวลาในวันนี้"
                            }
                            options={
                              slotsForThisDay?.length
                                ? slotsForThisDay.map((s) => ({
                                    value: String(s.id),
                                    label: `${getSlotDisplayName(s)} (${s.startTime} - ${s.endTime})`,
                                  }))
                                : []
                            }
                          />
                          <div className="flex gap-4 text-xs text-slate-600">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={slot.requireCheckIn ?? false}
                                onChange={(e) =>
                                  patchSlot(di, si, {
                                    requireCheckIn: e.target.checked,
                                  })
                                }
                                className="h-4 w-4 accent-cyan-600"
                              />
                              ต้อง Check-in ถึงจะได้รับ EXP
                            </label>

                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={slot.requireCheckOut ?? false}
                                onChange={(e) =>
                                  patchSlot(di, si, {
                                    requireCheckOut: e.target.checked,
                                  })
                                }
                                className="h-4 w-4 accent-cyan-600"
                              />
                              ต้อง Check-out ถึงจะได้รับ EXP
                            </label>
                          </div>
                        </div>
                      )}
                      {/* Actions */}
                      <div className="ml-auto flex items-center gap-2">
                        {" "}
                        <button
                          type="button"
                          onClick={() => addItem(di, si)}
                          className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          {" "}
                          <Plus className="h-4 w-4" /> เพิ่มสกิล{" "}
                        </button>
                        <button
                          type="button"
                          onClick={() => addTimeSlot(di)}
                          className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <Plus className="h-4 w-4" />
                          เพิ่มช่วงเวลา
                        </button>
                        {day.slots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTimeSlot(di, si)}
                            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            ลบช่วงนี้
                          </button>
                        )}
                      </div>{" "}
                    </div>

                    <div className="space-y-2">
                      {slot.items.map((it, ii) => {
                        const cat = skillCategories.find(
                          (c) => String(c.id) === (it.categoryId ?? ""),
                        );
                        const skills = cat?.subSkills ?? [];

                        const errs = showValidation ? getItemErrors(it) : null;

                        return (
                          <Row key={ii} className="items-start">
                            {/* Category */}
                            <div>
                              <div className="mb-1 text-xs text-slate-500">
                                เลือกหมวดหมู่หลักจาก 6 ด้าน
                              </div>
                              <Select
                                value={it.categoryId ?? ""}
                                onChange={(v) => {
                                  if (!v) {
                                    patchItem(di, si, ii, {
                                      categoryId: null,
                                      skillId: null,
                                      activityType: null,
                                    });
                                  } else {
                                    patchItem(di, si, ii, {
                                      categoryId: v,
                                      skillId: null,
                                      activityType: it.activityType ?? null,
                                    });
                                  }
                                }}
                                placeholder={
                                  loadingSkills
                                    ? "กำลังโหลดหมวดหมู่..."
                                    : "เลือกหมวดหมู่หลัก"
                                }
                                disabled={loadingSkills || !!skillsError}
                                error={errs?.categoryId}
                                options={skillCategories.map((c) => ({
                                  value: String(c.id),
                                  label: c.name_TH,
                                }))}
                              />
                            </div>

                            {/* Skill */}
                            <div>
                              <div className="mb-1 text-xs text-slate-500">
                                เลือกทักษะที่ได้รับจากหมวดนี้
                              </div>
                              <Select
                                value={it.skillId ?? ""}
                                onChange={(v) => {
                                  patchItem(di, si, ii, { skillId: v || null });
                                }}
                                placeholder={
                                  cat
                                    ? "เลือกทักษะที่จะรับ"
                                    : "เลือกหมวดหลักก่อน"
                                }
                                disabled={!cat || !!skillsError}
                                error={errs?.skillId}
                                options={skills.map((s) => ({
                                  value: String(s.id),
                                  label: s.name_TH,
                                }))}
                              />
                            </div>

                            {/* Activity Type */}
                            <div>
                              <div className="mb-1 text-xs text-slate-500">
                                ประเภทกิจกรรม
                              </div>
                              <Select
                                value={it.activityType ?? ""}
                                onChange={(v) => {
                                  const lvl = v as ExpActivityType;

                                  const th = activityTypeOptions.find(
                                    (opt) => opt.id === lvl,
                                  );

                                  patchItem(di, si, ii, {
                                    activityType: (lvl ||
                                      null) as ExpActivityType | null,
                                    exp: th ? th.expRequired : null,
                                  });
                                }}
                                placeholder={
                                  !cat
                                    ? "เลือกหมวดหมู่หลักก่อน"
                                    : "เลือกประเภทกิจกรรม"
                                }
                                disabled={!cat || !!skillsError}
                                error={errs?.activityType}
                                options={activityTypeOptions.map((opt) => ({
                                  value: opt.id,
                                  label: opt.label,
                                }))}
                              />
                            </div>

                            {/* EXP */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="w-full">
                                <div className="mb-1 flex items-center gap-1.5 text-xs text-slate-500">
                                  <span>ได้รับ EXP</span>
                                  <Hint text="ค่าเริ่มต้น EXP อิงจากระดับทักษะ" />
                                </div>

                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={0}
                                    value={it.exp ?? ""}
                                    disabled={!it.activityType}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      patchItem(di, si, ii, {
                                        exp: v === "" ? null : Number(v),
                                      });
                                    }}
                                    className={[
                                      "w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2",
                                      !it.activityType
                                        ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed focus:ring-slate-300"
                                        : "border-slate-200 bg-white text-slate-800 focus:ring-slate-300",
                                    ].join(" ")}
                                  />

                                  <button
                                    type="button"
                                    onClick={() => removeItem(di, si, ii)}
                                    className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
                                    aria-label="ลบแถวสกิล"
                                  >
                                    ✕
                                  </button>
                                </div>

                                {/* ✅ spacer ให้สูงเท่า Select (กันแถวเบี้ยว) */}
                                <div className="mt-1 min-h-[14px] text-[11px] leading-snug text-transparent">
                                  {" "}
                                </div>
                              </div>
                            </div>
                          </Row>
                        );
                      })}

                      {slot.items.length === 0 && (
                        <div className="rounded-md border border-dashed border-slate-300 p-3 text-center text-sm text-slate-500">
                          ยังไม่มีสกิลในช่วงเวลานี้ — กด “เพิ่มสกิล”
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
