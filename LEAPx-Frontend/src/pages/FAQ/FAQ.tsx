// src/pages/FAQ/FAQ.tsx
import React, { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import Navbar from "../../components/Navbar/Navbar";
import PrimaryFooter from "../../components/Footer/PrimaryFooter";

type ExpLevelKey = "l1" | "l2" | "l3" | "l4";

type ExpLevelCol = {
    key: ExpLevelKey;
    title: string;
    expText: string;
};

type ExpRowKey = "r1" | "r2" | "r3" | "r4" | "r5";

type ExpRow = {
    key: ExpRowKey;
    timeText: string;
    exp: Record<ExpLevelKey, number>;
};

const FAQ: React.FC = () => {
    const { t, i18n } = useTranslation("faq");
    const [isOpen, setIsOpen] = useState<boolean>(true);

    // ให้เปลี่ยนภาษาแล้วข้อความในตารางอัปเดตแน่นอน
    const levelCols: ExpLevelCol[] = useMemo(
        () => [
            {
                key: "l1",
                title: t("exp.table.levels.l1.title"),
                expText: t("exp.table.levels.l1.expText"),
            },
            {
                key: "l2",
                title: t("exp.table.levels.l2.title"),
                expText: t("exp.table.levels.l2.expText"),
            },
            {
                key: "l3",
                title: t("exp.table.levels.l3.title"),
                expText: t("exp.table.levels.l3.expText"),
            },
            {
                key: "l4",
                title: t("exp.table.levels.l4.title"),
                expText: t("exp.table.levels.l4.expText"),
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [i18n.language]
    );

    const rows: ExpRow[] = useMemo(
        () => [
            { key: "r1", timeText: t("exp.table.times.r1"), exp: { l1: 1, l2: 2, l3: 4, l4: 8 } },
            { key: "r2", timeText: t("exp.table.times.r2"), exp: { l1: 2, l2: 4, l3: 8, l4: 16 } },
            { key: "r3", timeText: t("exp.table.times.r3"), exp: { l1: 4, l2: 8, l3: 16, l4: 32 } },
            { key: "r4", timeText: t("exp.table.times.r4"), exp: { l1: 6, l2: 12, l3: 24, l4: 48 } },
            { key: "r5", timeText: t("exp.table.times.r5"), exp: { l1: 8, l2: 16, l3: 32, l4: 64 } },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [i18n.language]
    );

    return (
        <div className="w-full min-h-screen bg-white">
            <Navbar />

            <div className="w-full bg-gray-50 py-14">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-10">
                        {t("title")}
                    </h1>

                    {/* ใช้ details/summary แทน aria-expanded -> Edge Tools/axe ไม่ฟ้อง */}
                    <details
                        className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden"
                        open={isOpen}
                        onToggle={(e) => {
                            const el = e.currentTarget as HTMLDetailsElement;
                            setIsOpen(el.open);
                        }}
                    >
                        <summary className="list-none cursor-pointer select-none">
                            <div className="w-full flex items-center justify-between gap-3 px-5 md:px-6 py-4 bg-[#B7E8E8] hover:brightness-[0.99] transition">
                                <span className="text-base md:text-lg font-semibold text-slate-900 text-left">
                                    {t("exp.title")}
                                </span>
                                <ChevronDown
                                    className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"
                                        }`}
                                    size={20}
                                    aria-hidden="true"
                                />
                            </div>
                        </summary>

                        <div className="bg-gray-50 px-4 md:px-6 py-6">
                            <div className="rounded-xl bg-white border border-slate-200/70 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[820px] border-collapse">
                                        <thead>
                                            <tr className="bg-[#B7E8E8]/60">
                                                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900 border-b border-slate-200 w-[34%]">
                                                    {t("exp.table.timeHeader")}
                                                </th>

                                                {levelCols.map((c) => (
                                                    <th
                                                        key={c.key}
                                                        className="text-center px-4 py-3 text-sm font-semibold text-slate-900 border-b border-slate-200"
                                                    >
                                                        <div className="leading-tight">{c.title}</div>
                                                        <div className="text-[12px] font-medium text-slate-700 mt-0.5">
                                                            {c.expText}
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {rows.map((r) => (
                                                <tr key={r.key} className="bg-white">
                                                    <td className="px-4 py-4 text-sm text-slate-800 border-b border-slate-200">
                                                        {r.timeText}
                                                    </td>

                                                    {levelCols.map((c) => (
                                                        <td
                                                            key={`${r.key}-${c.key}`}
                                                            className="px-4 py-4 text-center text-sm text-slate-800 border-b border-slate-200"
                                                        >
                                                            <div className="font-medium">{t("exp.table.receive")}</div>
                                                            <div className="font-bold text-slate-900">
                                                                {r.exp[c.key]} EXP
                                                            </div>
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="mt-3 text-xs text-slate-500">{t("exp.note")}</div>
                        </div>
                    </details>
                </div>
            </div>

            <PrimaryFooter />
        </div>
    );
};

export default FAQ;
