/**
 * Schedule Section - Activity dates and registration dates
 */

import React from 'react';
import PillInput from '../../../../../components/Event/PillInput';

interface ScheduleSectionProps {
  // Activity dates
  sDate: string;
  sTime: string;
  eDate: string;
  eTime: string;
  onSDateChange: (value: string) => void;
  onSTimeChange: (value: string) => void;
  onEDateChange: (value: string) => void;
  onETimeChange: (value: string) => void;
  
  // Registration dates
  rsDate: string;
  rsTime: string;
  reDate: string;
  reTime: string;
  onRSDateChange: (value: string) => void;
  onRSTimeChange: (value: string) => void;
  onREDateChange: (value: string) => void;
  onRETimeChange: (value: string) => void;
  
  errors?: {
    sDate?: string;
    sTime?: string;
    eDate?: string;
    eTime?: string;
    rsDate?: string;
    rsTime?: string;
    reDate?: string;
    reTime?: string;
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

export default function ScheduleSection({
  sDate,
  sTime,
  eDate,
  eTime,
  onSDateChange,
  onSTimeChange,
  onEDateChange,
  onETimeChange,
  rsDate,
  rsTime,
  reDate,
  reTime,
  onRSDateChange,
  onRSTimeChange,
  onREDateChange,
  onRETimeChange,
  errors = {},
}: ScheduleSectionProps) {
  return (
    <div className="space-y-6">
      {/* Activity dates */}
      <div className="space-y-3">
        <SectionTitle required>วันจัดกิจกรรม</SectionTitle>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {/* Start */}
          <div className="min-w-0 grid grid-cols-1 items-start gap-3 sm:grid-cols-[36px_minmax(0,1fr)_140px]">
            <span className="pt-2 text-sm text-slate-600">เริ่ม</span>

            <Field id="sDate" error={errors.sDate}>
              <PillInput
                id="sDate"
                type="date"
                value={sDate}
                onChange={onSDateChange}
                required
                error={errors.sDate}
              />
            </Field>

            <Field id="sTime" error={errors.sTime}>
              <PillInput
                id="sTime"
                type="time"
                className="w-full"
                value={sTime}
                onChange={onSTimeChange}
                required
                error={errors.sTime}
              />
            </Field>
          </div>

          {/* End */}
          <div className="min-w-0 grid grid-cols-1 items-start gap-3 sm:grid-cols-[36px_minmax(0,1fr)_140px]">
            <span className="pt-2 text-sm text-slate-600">จบ</span>

            <Field id="eDate" error={errors.eDate}>
              <PillInput
                id="eDate"
                type="date"
                value={eDate}
                onChange={onEDateChange}
                required
                error={errors.eDate}
              />
            </Field>

            <Field id="eTime" error={errors.eTime}>
              <PillInput
                id="eTime"
                type="time"
                className="w-full"
                value={eTime}
                onChange={onETimeChange}
                required
                error={errors.eTime}
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Registration dates */}
      <div className="space-y-3">
        <SectionTitle required>วันเปิดลงทะเบียน</SectionTitle>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {/* Start */}
          <div className="min-w-0 grid grid-cols-1 items-start gap-3 sm:grid-cols-[36px_minmax(0,1fr)_140px]">
            <span className="pt-2 text-sm text-slate-600">เริ่ม</span>

            <Field id="rsDate" error={errors.rsDate}>
              <PillInput
                id="rsDate"
                type="date"
                value={rsDate}
                onChange={onRSDateChange}
                required
                error={errors.rsDate}
              />
            </Field>

            <Field id="rsTime" error={errors.rsTime}>
              <PillInput
                id="rsTime"
                type="time"
                className="w-full"
                value={rsTime}
                onChange={onRSTimeChange}
                required
                error={errors.rsTime}
              />
            </Field>
          </div>

          {/* End */}
          <div className="min-w-0 grid grid-cols-1 items-start gap-3 sm:grid-cols-[36px_minmax(0,1fr)_140px]">
            <span className="pt-2 text-sm text-slate-600">จบ</span>

            <Field id="reDate" error={errors.reDate}>
              <PillInput
                id="reDate"
                type="date"
                value={reDate}
                onChange={onREDateChange}
                required
                error={errors.reDate}
              />
            </Field>

            <Field id="reTime" error={errors.reTime}>
              <PillInput
                id="reTime"
                type="time"
                className="w-full"
                value={reTime}
                onChange={onRETimeChange}
                required
                error={errors.reTime}
              />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}
