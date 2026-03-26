/**
 * Form UI Primitives for EventForm
 * 
 * Reusable UI components for form controls:
 * - SectionTitle: Section headers with optional required indicator
 * - Field: Wrapper with error/help messages
 * - PillTextarea: Textarea with pill-style visual state
 * - Toggle: On/off switch component
 * - Labeled: Label + control wrapper
 * - RadioDot: Radio button with dot indicator
 */

import React from "react";

/* ===================== Types ===================== */

type WithDescribedBy = { "aria-describedby"?: string };

/* ===================== Components ===================== */

/**
 * Section title with optional required indicator
 */
export function SectionTitle({
  children,
  className,
  required,
}: {
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={`text-sm text-slate-500 ${className ?? ""}`}>
      {children}
      {required && <span className="text-red-500"> *</span>}
    </div>
  );
}

/**
 * Field wrapper with error/help messages (fixed height for consistent layout)
 */
export function Field<T extends WithDescribedBy>({
  children,
  error,
  help,
  id,
}: {
  children: React.ReactElement<T> | React.ReactNode;
  error?: string;
  help?: string;
  id?: string;
}) {
  const msg = error ?? help ?? " ";
  const descId = id ? `${id}__desc` : undefined;

  const child = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<WithDescribedBy>, {
        "aria-describedby": descId,
      })
    : children;

  return (
    <div>
      {child}
      <div
        id={descId}
        className={` mt-1 text-[11px] leading-snug ${
          error ? "text-red-600" : "text-slate-400"
        }`}
      >
        {msg}
      </div>
    </div>
  );
}

/**
 * Textarea with pill-style visual state (filled = cyan, empty = white)
 */
type PillTextareaRest = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange" | "placeholder" | "className" | "rows" | "required"
>;

type PillTextareaProps = {
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  required?: boolean; // UI only
  error?: string; // ใช้คุมสี/aria-invalid เท่านั้น
} & PillTextareaRest;

export function PillTextarea({
  value,
  onChange,
  placeholder,
  className,
  rows = 4,
  required,
  error,
  ...rest
}: PillTextareaProps) {
  const isFilled = value !== undefined && String(value).trim().length > 0;
  const base = "rounded-lg px-3 py-2 ring-1 transition-colors ";
  const normal = isFilled
    ? "bg-cyan-50 ring-cyan-100 focus-within:ring-cyan-300"
    : "bg-white ring-slate-200 hover:ring-slate-300 focus-within:ring-slate-300";
  const danger = "bg-red-50 ring-red-300 focus-within:ring-red-400";

  const {
    ["aria-invalid"]: ariaInvalidProp,
    ["aria-required"]: ariaRequiredProp,
    ...forward
  } = rest;

  return (
    <div className={`${base} ${error ? danger : normal} ${className ?? ""}`}>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        aria-invalid={ariaInvalidProp ?? (error ? true : undefined)}
        aria-required={ariaRequiredProp ?? (required ? true : undefined)}
        className="w-full resize-y bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
        {...forward}
      />
    </div>
  );
}

/**
 * Toggle switch component (on/off)
 */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={`h-6 w-11 rounded-full p-0.5 transition ${
          checked ? "bg-cyan-500" : "bg-slate-300"
        }`}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      {label && <span className="text-xs text-slate-600">{label}</span>}
    </div>
  );
}

/**
 * Label + control wrapper with optional required indicator
 */
export function Labeled({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  help?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <SectionTitle>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </SectionTitle>
      {children}
    </div>
  );
}

/**
 * Radio button with dot indicator (pill-style)
 */
export function RadioDot({
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
