import React from "react";
import { useLocation, Link } from "react-router-dom";

type Props = {
    title?: string;
    right?: React.ReactNode; // เผื่อวางปุ่ม action ฝั่งขวา
};

function pretty(seg: string) {
    if (!seg) return "";
    return decodeURIComponent(seg)
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export default function AdminPageHeader({ title, right }: Props) {
    const location = useLocation();
    const parts = location.pathname.split("/").filter(Boolean);

    // สร้าง breadcrumb จาก pathname
    const crumbs = parts.map((p, i) => {
        const to = "/" + parts.slice(0, i + 1).join("/");
        return { label: pretty(p), to };
    });

    return (
        <div className="mb-4">
            {/* breadcrumb */}
            <nav className="text-xs text-slate-500 mb-1">
                <ol className="flex items-center gap-1 flex-wrap">
                    {crumbs.map((c, idx) => (
                        <li key={c.to} className="flex items-center gap-1">
                            {idx > 0 && <span>/</span>}
                            {idx === crumbs.length - 1 ? (
                                <span className="text-slate-700">{c.label}</span>
                            ) : (
                                <Link to={c.to} className="hover:text-teal-600">{c.label}</Link>
                            )}
                        </li>
                    ))}
                </ol>
            </nav>

            {/* title + right */}
            {(title || right) && (
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-semibold text-slate-800">
                        {title ?? crumbs[crumbs.length - 1]?.label ?? "Admin"}
                    </h1>
                    {right}
                </div>
            )}
        </div>
    );
}
