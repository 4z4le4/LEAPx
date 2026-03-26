/**
 * Audience Section - Select target audience and capacity
 */

import React from "react";
import CapacityPopupField from "../../../../../components/Event/CapacityPopupField";
import type { AudienceKey, AUDIENCE } from "../../utils/audienceHelpers";

interface AudienceSectionProps {
  audience: AudienceKey[];
  onAudienceToggle: (key: AudienceKey) => void;
  capPreReg: number;
  capWalkin: number;
  onCapPreRegChange: (value: number) => void;
  onCapWalkinChange: (value: number) => void;
  AUDIENCE: typeof AUDIENCE;
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

export default function AudienceSection({
  audience,
  onAudienceToggle,
  capPreReg,
  capWalkin,
  onCapPreRegChange,
  onCapWalkinChange,
  AUDIENCE,
}: AudienceSectionProps) {
  return (
    <div className="grid items-start gap-3 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_180px_180px]">
      {/* Audience selection */}
      <div className="space-y-2">
        <SectionTitle required>
          กลุ่มผู้เข้าร่วมที่สามารถเข้าร่วมได้
        </SectionTitle>

        {/* Main groups */}
        <div className="flex flex-wrap items-center gap-2">
          <Chip
            selected={audience.includes("all")}
            onClick={() => onAudienceToggle("all")}
          >
            {AUDIENCE.all}
          </Chip>
          <Chip
            selected={audience.includes("eng")}
            onClick={() => onAudienceToggle("eng")}
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
              selected={audience.includes(k)}
              onClick={() => onAudienceToggle(k)}
            >
              {AUDIENCE[k]}
            </TinyChip>
          ))}
        </div>
      </div>

      {/* Pre-registration capacity */}
      <div className="min-w-0 space-y-2">
        <SectionTitle>จำนวนคนลงทะเบียนล่วงหน้า</SectionTitle>
        <CapacityPopupField
          label="จำนวนคนลงทะเบียนล่วงหน้า"
          value={capPreReg}
          onChange={onCapPreRegChange}
          placeholder="ไม่จำกัด"
          allowClosed
          className="w-full"
        />
      </div>

      {/* Walk-in capacity */}
      <div className="space-y-2">
        <SectionTitle>จำนวน Walk-in</SectionTitle>
        <CapacityPopupField
          label="จำนวน Walk-in"
          value={capWalkin}
          onChange={onCapWalkinChange}
          placeholder="ไม่จำกัด"
          allowClosed
          className="w-full"
        />
      </div>
    </div>
  );
}
