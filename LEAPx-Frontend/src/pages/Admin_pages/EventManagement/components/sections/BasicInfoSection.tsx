/**
 * Basic Info Section - Event names in Thai and English
 */

import React from "react";
import PillInput from "../../../../../components/Event/PillInput";

interface BasicInfoSectionProps {
  nameTH: string;
  nameEN: string;
  onNameTHChange: (value: string) => void;
  onNameENChange: (value: string) => void;
  errors?: {
    nameTH?: string;
    nameEN?: string;
  };
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

function Labeled({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm text-slate-500">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </div>
      {children}
    </div>
  );
}

export default function BasicInfoSection({
  nameTH,
  nameEN,
  onNameTHChange,
  onNameENChange,
  errors = {},
}: BasicInfoSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Labeled label="ชื่อกิจกรรม (ไทย)" required>
        <Field id="nameTH" error={errors.nameTH}>
          <PillInput
            id="nameTH"
            type="text"
            value={nameTH}
            onChange={onNameTHChange}
            required
            error={errors.nameTH}
          />
        </Field>
      </Labeled>

      <Labeled label="ชื่อกิจกรรม (อังกฤษ)" required>
        <Field id="nameEN" error={errors.nameEN}>
          <PillInput
            id="nameEN"
            type="text"
            value={nameEN}
            onChange={onNameENChange}
            required
            error={errors.nameEN}
          />
        </Field>
      </Labeled>
    </div>
  );
}
