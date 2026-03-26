import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  current: number;
  max: number; // ใช้ max ตัดสินโหมด
  label?: string;
  icon?: ReactNode;
  className?: string;
  suffixText?: string; // ถ้าส่งมาก็จะ override ข้อความ default
};

export default function ProgressBar({
  current,
  max,
  label,
  icon,
  className,
  suffixText,
}: Props) {
  const { t } = useTranslation("eventCard");

  const safeCurrent = Number.isFinite(current) ? Math.max(0, current) : 0;

  // ✅ โหมดใหม่: อิง max
  const isClosed = Number.isFinite(max) && max === 0; // 0 = ไม่เปิดรับ
  const isUnlimited = Number.isFinite(max) && max >= 1_000_000; // ≥1,000,000 = ไม่จำกัด

  const safeMax = isUnlimited
    ? Math.max(1, safeCurrent || 1) // ใช้ current เป็นฐานคำนวณแถบ
    : Math.max(1, Number.isFinite(max) ? max : 1);

  const pct = Math.min(100, Math.round((safeCurrent / safeMax) * 100));

  const rightText =
    suffixText ??
    (isClosed
      ? t("quota.suffix.closed")
      : isUnlimited
      ? t("quota.suffix.unlimited", { count: safeCurrent })
      : t("quota.suffix.normal", { current: safeCurrent, max: safeMax }));

  return (
    <div className={className ?? ""}>
      {label && (
        <div className="flex items-center gap-2 mb-2">
          {icon && <span className="text-gray-900">{icon}</span>}
          <span className="text-[15px] font-semibold text-gray-900">
            {label}
          </span>
        </div>
      )}

      <div
        className="relative h-[24px] w-full rounded-full bg-gray-100 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={isUnlimited || isClosed ? undefined : safeMax}
        aria-valuenow={safeCurrent}
        aria-label={label}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300
                     bg-[linear-gradient(90deg,#B9E7F7_0%,#8DC6E4_100%)]"
          style={{ width: `${pct}%` }}
        />
        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center">
          <span className="text-[16px] font-semibold text-gray-800 tabular-nums">
            {rightText}
          </span>
        </div>
      </div>
    </div>
  );
}
