// src/components/Event/PillTextarea.tsx
import * as React from "react";

export type PillTextareaProps = {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  readOnly?: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  form?: string;
  rows?: number;
} & Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  | "value"
  | "onChange"
  | "placeholder"
  | "className"
  | "id"
  | "readOnly"
  | "disabled"
  | "required"
  | "form"
  | "rows"
>;

export default function PillTextarea({
  leftIcon,
  rightIcon,
  value,
  onChange,
  placeholder,
  className,
  id,
  readOnly,
  disabled,
  required,
  error,
  form,
  rows = 4,
  onClick,
  ...rest
}: PillTextareaProps) {
  const isFilled =
    !!readOnly || (value !== undefined && String(value).trim().length > 0);

  const base =
    "flex items-start gap-2 rounded-lg px-3 py-2 ring-1 transition-colors " +
    (disabled ? "opacity-60 " : "");
  const normal = isFilled
    ? "bg-cyan-50 ring-cyan-100 focus-within:ring-cyan-300"
    : "bg-white ring-slate-200 hover:ring-slate-300 focus-within:ring-slate-300";
  const danger = "bg-red-50 ring-red-300 focus-within:ring-red-400";

  const containerIsButton = !!onClick && !disabled;

  const {
    ["aria-invalid"]: ariaInvalidProp,
    ["aria-required"]: ariaRequiredProp,
    ...forward
  } = rest;

  return (
    <div
      className={[
        base,
        error ? danger : normal,
        className ?? "",
        containerIsButton ? "cursor-pointer select-none" : "",
      ].join(" ")}
      role={containerIsButton ? "button" : undefined}
      onClick={containerIsButton ? (onClick as unknown as React.MouseEventHandler<HTMLDivElement>) : undefined}
      tabIndex={containerIsButton ? 0 : undefined}
    >
      {leftIcon && <div className="shrink-0">{leftIcon}</div>}
      <textarea
        id={id}
        value={value ?? ""}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        readOnly={readOnly}
        disabled={disabled}
        required={required}
        aria-required={required || ariaRequiredProp}
        aria-invalid={error ? true : ariaInvalidProp}
        form={form}
        rows={rows}
        className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
        {...forward}
      />
      {rightIcon && <div className="shrink-0">{rightIcon}</div>}
    </div>
  );
}
