/**
 * Major Category Section - Select major/department and visibility toggle
 */

import React from "react";
import PillInput from "../../../../../components/Event/PillInput";
import Select from "../../../../../components/ui/CustomSelect";

interface MajorCategory {
  id: number;
  name_TH: string;
  name_EN: string;
}

interface MajorCategorySectionProps {
  // Major selection
  majorCategoryId: number | null;
  majorName: string;
  majors: MajorCategory[];
  onMajorChange: (id: number | null, name: string) => void;

  // User permissions
  isSupreme: boolean;
  isActivityAdmin: boolean;

  // Loading states
  majorsLoading: boolean;
  majorsLoaded: boolean;
  showMajorSkeleton: boolean;
  skeletonGone: boolean;
  allowedLoading: boolean;
  showEmptyMajors: boolean;

  // Errors
  majorError?: string;
  majorsError: string | null;
  allowedError: string | null;

  // Visibility toggle
  visible: boolean;
  onVisibleChange: (value: boolean) => void;
}

function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`text-sm text-slate-500 ${className ?? ""}`}>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />

      <div
        className={`relative h-6 w-11 rounded-full transition ${
          checked ? "bg-cyan-600" : "bg-slate-300"
        }`}
      >
        <div
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </div>

      <span className="text-sm text-slate-600">{label}</span>
    </label>
  );
}

function Field({
  children,
  error,
  id,
}: {
  children: React.ReactElement;
  error?: string;
  id?: string;
}) {
  const msg = error ?? " ";
  const descId = id ? `${id}__desc` : undefined;

  const child = React.isValidElement(children)
    ? React.cloneElement(
        children as React.ReactElement<{ "aria-describedby"?: string }>,
        {
          "aria-describedby": descId,
        },
      )
    : children;

  return (
    <div>
      {child}
      <div
        id={descId}
        className={`mt-1 text-[11px] leading-snug ${
          error ? "text-red-600" : "text-slate-400"
        }`}
      >
        {msg}
      </div>
    </div>
  );
}

export default function MajorCategorySection({
  majorCategoryId,
  majorName,
  majors,
  onMajorChange,
  isSupreme,
  isActivityAdmin,
  majorsLoading,
  majorsLoaded,
  showMajorSkeleton,
  skeletonGone,
  allowedLoading,
  showEmptyMajors,
  majorError,
  majorsError,
  allowedError,
  visible,
  onVisibleChange,
}: MajorCategorySectionProps) {
  const majorOptions = majors.map((m) => ({
    value: String(m.id),
    label: m.name_TH || m.name_EN || `#${m.id}`,
  }));

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 lg:gap-x-4">
      {/* Left: Major selection */}
      <div className="flex min-w-[260px] flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="shrink-0 whitespace-nowrap h-10 flex items-center">
          <SectionTitle className="m-0">
            หมวดหมู่/สาขาที่จัดกิจกรรม <span className="text-red-500">*</span>
          </SectionTitle>
        </div>

        <div className="min-w-0 flex-1">
          <Field id="majorCategory" error={majorError}>
            <div className="relative h-10">
              {/* Actual input */}
              <div
                aria-hidden={showMajorSkeleton ? true : undefined}
                className={`absolute inset-0 ${
                  showMajorSkeleton
                    ? "opacity-0 pointer-events-none"
                    : "opacity-100"
                }`}
              >
                {isSupreme ? (
                  // SUPREME: dropdown all majors
                  <div className="relative h-10">
                    <Select
                      className="h-10 [&>button]:h-10"
                      value={majorCategoryId ? String(majorCategoryId) : ""}
                      onChange={(v) => {
                        const id = v ? Number(v) : null;
                        const m = majors.find((mm) => mm.id === id);
                        const name =
                          m?.name_TH || m?.name_EN || (id ? `#${id}` : "");
                        onMajorChange(id, name);
                      }}
                      placeholder="-- เลือกสาขาที่จัด --"
                      disabled={majorsLoading}
                      error={majorError}
                      options={majorOptions}
                    />
                  </div>
                ) : isActivityAdmin ? (
                  majors.length <= 1 ? (
                    // Single major: read-only
                    <PillInput
                      type="text"
                      value={majorName || "สาขาที่คุณมีสิทธิ์"}
                      readOnly
                      aria-required
                      aria-invalid={majorError ? true : undefined}
                    />
                  ) : (
                    // Multiple majors: dropdown
                    <Select
                      className="h-10 [&>button]:h-10"
                      value={majorCategoryId ? String(majorCategoryId) : ""}
                      onChange={(v) => {
                        const id = v ? Number(v) : null;
                        const m = majors.find((mm) => mm.id === id);
                        const name =
                          m?.name_TH || m?.name_EN || (id ? `#${id}` : "");
                        onMajorChange(id, name);
                      }}
                      placeholder="-- เลือกสาขาที่จัด (สิทธิ์ของคุณ) --"
                      disabled={majorsLoading}
                      error={majorError}
                      options={majorOptions}
                    />
                  )
                ) : (
                  // Other roles: no permission
                  <PillInput
                    type="text"
                    value={
                      majorName || "คุณไม่มีสิทธิ์เลือกสาขาในการสร้างกิจกรรม"
                    }
                    readOnly
                    aria-required
                    aria-invalid={majorError ? true : undefined}
                  />
                )}
              </div>

              {/* Skeleton overlay */}
              {!skeletonGone && (
                <div
                  className={`absolute inset-0 rounded-xl bg-slate-100 animate-pulse transition-opacity duration-200 ${
                    showMajorSkeleton
                      ? "opacity-100"
                      : "opacity-0 pointer-events-none"
                  }`}
                  aria-hidden
                />
              )}
            </div>
          </Field>

          {/* Helper messages */}
          {isActivityAdmin && allowedLoading && (
            <div className="mt-1 text-[11px] text-slate-400">
              กำลังตรวจสิทธิ์สาขา…
            </div>
          )}
          {!majorsLoading && majorsLoaded && showEmptyMajors && (
            <div className="mt-1 text-[11px] text-amber-600">
              ไม่พบรายการสาขาที่คุณมีสิทธิ์จัดกิจกรรม
            </div>
          )}
          {majorsError && (
            <div className="mt-1 text-[11px] text-red-600">
              โหลดข้อมูลสาขาไม่สำเร็จ ลองใหม่อีกครั้ง
            </div>
          )}
          {allowedError && (
            <div className="mt-1 text-[11px] text-red-600">
              ตรวจสอบสิทธิ์สาขาไม่สำเร็จ ลองโหลดหน้าใหม่หรือติดต่อผู้ดูแลระบบ
            </div>
          )}
        </div>
      </div>

      {/* Right: Visibility toggle */}
      <div className="flex h-10 items-center gap-2 whitespace-nowrap">
        <SectionTitle className="m-0 whitespace-nowrap">แสดงผล</SectionTitle>
        <Toggle
          checked={visible}
          onChange={onVisibleChange}
          label="เปิด/ปิด การแสดงผลหน้าหลัก"
        />
      </div>
    </div>
  );
}
