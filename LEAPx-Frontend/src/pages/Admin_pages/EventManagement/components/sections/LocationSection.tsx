/**
 * Location Section - Online/onsite toggle, meeting link, place fields
 */

import React from "react";
import PillInput from "../../../../../components/Event/PillInput";
import { Info, LinkIcon } from "lucide-react";
import Select from "../../../../../components/ui/CustomSelect";

interface LocationSectionProps {
  isOnline: boolean;
  onIsOnlineChange: (value: boolean) => void;

  meetingLink: string;
  onMeetingLinkChange: (value: string) => void;

  location_TH: string;
  location_EN: string;
  onLocationTHChange: (value: string) => void;
  onLocationENChange: (value: string) => void;

  // Google Maps embed (optional, can be managed by parent)
  locationMapUrl: string;
  onLocationMapUrlChange?: (value: string) => void;

  errors?: {
    meetingLink?: string;
    locationMapUrl?: string;
    placeTH?: string;
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

function Tooltip({
  content,
  children,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative inline-flex items-center group">
      {children}
      <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-lg bg-sky-100 px-3 py-2 text-xs text-slate-700 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {content}
      </div>
    </div>
  );
}

export default function LocationSection({
  isOnline,
  onIsOnlineChange,
  meetingLink,
  onMeetingLinkChange,
  location_TH,
  location_EN,
  onLocationTHChange,
  onLocationENChange,
  locationMapUrl,
  onLocationMapUrlChange,
  errors = {},
}: LocationSectionProps) {
  const modeOptions = [
    { value: "onsite", label: "on-site" },
    { value: "online", label: "online" },
  ];
  return (
    <div>
      {/* รูปแบบการจัด + Dynamic Field */}
      <div className="grid items-start gap-4 md:grid-cols-[max-content,110px,max-content,1fr]">
        {/* label: รูปแบบการจัด */}
        <div className="flex h-10 items-center">
          <SectionTitle required>รูปแบบการจัด</SectionTitle>
        </div>

        {/* select */}
        <div className="self-start">
          <Select
            className="[&>button]:h-10"
            value={isOnline ? "online" : "onsite"}
            onChange={(v) => onIsOnlineChange(v === "online")}
            options={modeOptions}
          />
          <div className="mt-1 min-h-[14px]" />
        </div>

        {/* Dynamic Label */}
        <div className="flex h-10 items-center">
          <SectionTitle required>
            {isOnline ? "Meeting Link" : "ชื่อสถานที่"}
          </SectionTitle>
        </div>

        {/* Dynamic Input */}
        {isOnline ? (
          <Field id="meetingLink" error={errors.meetingLink}>
            <PillInput
              id="meetingLink"
              className="h-10 w-full"
              type="text"
              value={meetingLink}
              onChange={onMeetingLinkChange}
              placeholder="https://..."
              required
              error={errors.meetingLink}
            />
          </Field>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field id="placeTH" error={errors.placeTH}>
              <PillInput
                id="placeTH"
                className="h-10 w-full"
                type="text"
                value={location_TH}
                onChange={onLocationTHChange}
                placeholder="ชื่อสถานที่ (ไทย)"
                required
                error={errors.placeTH}
              />
            </Field>
            <PillInput
              className="h-10 w-full"
              type="text"
              value={location_EN}
              onChange={onLocationENChange}
              placeholder="Place name (English)"
            />
          </div>
        )}
      </div>

      {/* Place fields (onsite only) */}
      {!isOnline && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <SectionTitle>Google Maps Embed URL</SectionTitle>

            <Tooltip
              content={
                <>
                  วิธีการนำลิงก์ Google Maps มาใส่ในช่องนี้:
                  <br />
                  1. เปิด Google Maps
                  <br />
                  2. คลิกปุ่ม Share
                  <br />
                  3. เลือก “Embed a map”
                  <br />
                  4. คัดลอกค่า src จาก iframe
                </>
              }
            >
              <Info className="h-4 w-4 cursor-help text-slate-400 hover:text-slate-600" />
            </Tooltip>
          </div>

          <Field id="locationMapUrl" error={errors.locationMapUrl}>
            <PillInput
              type="text"
              value={locationMapUrl}
              onChange={onLocationMapUrlChange}
              leftIcon={<LinkIcon className="h-4 w-4 text-slate-500" />}
              placeholder="(หากไม่กรอก ระบบจะปักหมุดแผนที่เป็น คณะวิศวกรรมศาสตร์ มช.)"
              error={errors.locationMapUrl}
            />
          </Field>
        </div>
      )}
    </div>
  );
}
