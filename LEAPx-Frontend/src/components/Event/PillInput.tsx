// src/components/Form/PillInput.tsx
import * as React from "react";

export type PillInputProps = {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  type: "date" | "time" | "text" | "number";
  value: string | number;
  onChange?: (v: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  readOnly?: boolean;
  disabled?: boolean;
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"];
  required?: boolean;
  error?: string;
  form?: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  | "type"
  | "value"
  | "onChange"
  | "placeholder"
  | "className"
  | "id"
  | "readOnly"
  | "disabled"
  | "inputMode"
  | "required"
  | "form"
>;

export default function PillInput({
  leftIcon,
  rightIcon,
  type,
  value,
  onChange,
  placeholder,
  className,
  id,
  readOnly,
  disabled,
  inputMode,
  required,
  error,
  form,
  onClick,
  ...rest
}: PillInputProps) {
  const isFilled =
    !!readOnly || (value !== undefined && String(value).trim().length > 0);

  const base =
    "flex items-center gap-2 rounded-lg px-3 py-2 ring-1 transition-colors " +
    (disabled ? "opacity-60 " : "");
  const normal = isFilled
    ? "bg-cyan-50 ring-cyan-100 focus-within:ring-cyan-300"
    : "bg-white ring-slate-200 hover:ring-slate-300 focus-within:ring-slate-300";
  const danger = "bg-red-50 ring-red-300 focus-within:ring-red-400";

  // ✅ ถ้ามี onClick และไม่ disabled ให้ container เป็นปุ่มเสมอ
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
      tabIndex={containerIsButton ? 0 : undefined}
      onClick={(e) => {
        if (!containerIsButton) return;
        e.stopPropagation();
        onClick?.(e);
      }}
      onKeyDown={(e) => {
        if (!containerIsButton) return;

        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          (e.currentTarget as HTMLDivElement).click();
        }
      }}
      data-testid="pill-input"
    >
      {leftIcon}

      {/* ⛔ ปิด pointer events ที่ input เมื่อใช้เป็น trigger เพื่อให้คลิกวิ่งที่ container */}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        disabled={disabled}
        inputMode={inputMode}
        form={form}
        aria-invalid={ariaInvalidProp ?? (error ? true : undefined)}
        aria-required={ariaRequiredProp ?? (required ? true : undefined)}
        className={[
          "w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400",
          containerIsButton ? "pointer-events-none" : "",
        ].join(" ")}
        {...forward}
      />

      {rightIcon ? (
        containerIsButton ? (
          <button
            type="button"
            onClick={(e) => {
              if (!containerIsButton) return;
              e.stopPropagation();
              onClick?.(e);
            }}
          >
            {rightIcon}
          </button>
        ) : (
          <span className="shrink-0">{rightIcon}</span>
        )
      ) : null}
    </div>
  );
}
