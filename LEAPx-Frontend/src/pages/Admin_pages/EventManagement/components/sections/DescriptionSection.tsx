/**
 * Description Section - Detailed descriptions in Thai and English
 */

import React from 'react';
import PillTextarea from '../../../../../components/Event/PillTextarea';

interface DescriptionSectionProps {
  descTH: string;
  descEN: string;
  onDescTHChange: (value: string) => void;
  onDescENChange: (value: string) => void;
  
  errors?: {
    descTH?: string;
    descEN?: string;
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
  const msg = error ?? ' ';
  const descId = id ? `${id}__desc` : undefined;

  const child = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<{ 'aria-describedby'?: string }>, {
        'aria-describedby': descId,
      })
    : children;

  return (
    <div>
      {child}
      <div
        id={descId}
        className={`mt-1 text-[11px] leading-snug ${
          error ? 'text-red-600' : 'text-slate-400'
        }`}
      >
        {msg}
      </div>
    </div>
  );
}

export default function DescriptionSection({
  descTH,
  descEN,
  onDescTHChange,
  onDescENChange,
  errors = {},
}: DescriptionSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <div className="space-y-2">
        <SectionTitle required>รายละเอียดกิจกรรม (ไทย)</SectionTitle>
        <Field id="descTH" error={errors.descTH}>
          <PillTextarea
            id="descTH"
            value={descTH}
            onChange={onDescTHChange}
            rows={8}
            required
            error={errors.descTH}
            placeholder="รายละเอียดกิจกรรมภาษาไทย..."
          />
        </Field>
      </div>

      <div className="space-y-2">
        <SectionTitle required>รายละเอียดกิจกรรม (อังกฤษ)</SectionTitle>
        <Field id="descEN" error={errors.descEN}>
          <PillTextarea
            id="descEN"
            value={descEN}
            onChange={onDescENChange}
            rows={8}
            required
            error={errors.descEN}
            placeholder="Event description in English..."
          />
        </Field>
      </div>
    </div>
  );
}
