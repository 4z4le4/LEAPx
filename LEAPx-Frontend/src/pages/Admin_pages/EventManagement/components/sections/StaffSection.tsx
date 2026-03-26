/**
 * Staff Section - Staff audience and capacity
 */

import React from "react";
import CapacityPopupField from "../../../../../components/Event/CapacityPopupField";
import type { AudienceKey, AUDIENCE } from "../../utils/audienceHelpers";
import { LinkIcon } from "lucide-react";
import PillInput from "../../../../../components/Event/PillInput";

interface StaffSectionProps {
  staffAudience: AudienceKey[];
  onStaffAudienceToggle: (key: AudienceKey) => void;

  capStaff: number;
  onCapStaffChange: (value: number) => void;

  communicationLink: string;
  onCommunicationLinkChange: (value: string) => void;

  AUDIENCE: typeof AUDIENCE;

  errors?: {
    communicationLink?: string;
  };
}

function SectionTitle({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="text-sm text-slate-500">
      {children}
      {required && <span className="text-red-500"> *</span>}
    </div>
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

function Chip({
  selected,
  children,
  onClick,
}: {
  selected?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-sm transition ring-1 ${
        selected
          ? "bg-cyan-50 text-cyan-700 ring-cyan-200"
          : "bg-white text-slate-700 ring-slate-200 hover:ring-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function TinyChip({
  selected,
  children,
  onClick,
}: {
  selected?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-7 min-w-7 rounded-md px-2 text-sm transition ring-1 ${
        selected
          ? "bg-cyan-50 text-cyan-700 ring-cyan-200"
          : "bg-white text-slate-700 ring-slate-200 hover:ring-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

export default function StaffSection({
  staffAudience,
  onStaffAudienceToggle,
  capStaff,
  onCapStaffChange,
  communicationLink,
  onCommunicationLinkChange,
  AUDIENCE,
  errors = {},
}: StaffSectionProps) {
  return (
    <div className="grid items-start gap-3 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_180px_180px]">
      {/* Staff audience */}
      <div className="space-y-2">
        <SectionTitle>กลุ่มผู้ที่สามารถสมัครเป็นสตาฟได้</SectionTitle>

        {/* Main groups */}
        <div className="flex flex-wrap items-center gap-2">
          <Chip
            selected={staffAudience.includes("all")}
            onClick={() => onStaffAudienceToggle("all")}
          >
            {AUDIENCE.all}
          </Chip>
          <Chip
            selected={staffAudience.includes("eng")}
            onClick={() => onStaffAudienceToggle("eng")}
          >
            {AUDIENCE.eng}
          </Chip>
        </div>

        {/* Year levels */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm text-slate-600">นักศึกษาชั้นปีที่</div>
          {(["y1", "y2", "y3", "y4"] as AudienceKey[]).map((k) => (
            <TinyChip
              key={k}
              selected={staffAudience.includes(k)}
              onClick={() => onStaffAudienceToggle(k)}
            >
              {AUDIENCE[k]}
            </TinyChip>
          ))}
        </div>
      </div>

      {/* Staff capacity */}
      <div className="min-w-0 space-y-2">
        <SectionTitle>จำนวนสตาฟที่เปิดรับสมัคร</SectionTitle>
        <CapacityPopupField
          label="จำนวนสตาฟที่ต้องการ"
          value={capStaff}
          onChange={onCapStaffChange}
          placeholder="ไม่จำกัด"
          allowClosed
          className="w-full"
        />
      </div>

      {/* Communication link */}
      <div className="min-w-0 space-y-2">
        <SectionTitle>ลิงก์ติดต่อในระหว่างกิจกรรม</SectionTitle>
        <Field id="communicationLink" error={errors.communicationLink}>
          <PillInput
            id="communicationLink"
            className={`w-full ${
              errors.communicationLink ? "ring-2 ring-red-400 bg-red-50" : ""
            }`}
            type="text"
            value={communicationLink}
            onChange={onCommunicationLinkChange}
            placeholder="(Link)"
            leftIcon={<LinkIcon className="h-4 w-4 text-slate-500" />}
          />
        </Field>
      </div>
    </div>
  );
}
