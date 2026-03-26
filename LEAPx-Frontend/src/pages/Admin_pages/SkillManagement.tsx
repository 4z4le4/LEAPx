// src/pages/Admin/SkillManagement.tsx
import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
    Search,
    Filter,
    Plus,
    Pencil,
    Trash2,
    CheckCircle2,
    XCircle,
    ChevronDown,
    Eye,
    type LucideIcon,
} from "lucide-react";
import * as Lucide from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from "react-i18next";
import AdminPageHeader from "../../components/Admin/AdminPageHeader";
import { backend_url } from "../../../utils/constants";

/* ===================== types ===================== */
type SubSkill = {
    id: number | string;
    mainSkillCategory_id: number;
    name_TH: string;
    name_EN: string;
    description_TH?: string | null;
    description_EN?: string | null;
    slug: string;
    icon?: string | null;
    color?: string | null; // hex หรือ token ที่เรารองรับ
    sortOrder?: number | null;
    isActive?: boolean;
    createdAt?: string;
};

type MainSkill = {
    id: number;
    name_TH: string;
    name_EN: string;
    description_TH?: string | null;
    description_EN?: string | null;
    slug: string;
    icon?: string | null; // lucide icon (kebab-case) เช่น "bar-chart-3"
    color?: string | null; // hex หรือ token ที่เรารองรับ
    sortOrder?: number | null;
    isActive: boolean;
    createdAt?: string;
    subSkills?: SubSkill[];
};

type FilterMode = "all" | "active" | "inactive";

/* ===================== utils (no export to satisfy react-refresh) ===================== */
function getErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    try {
        return JSON.stringify(err);
    } catch {
        return "เกิดข้อผิดพลาด";
    }
}

function acronym(s?: string): string {
    return (s || "")
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((w) => w[0])
        .join("")
        .slice(0, 3)
        .toUpperCase();
}

function toPascal(kebab?: string | null): string {
    return (kebab || "")
        .split("-")
        .filter(Boolean)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join("");
}

// รับชื่อไอคอนจาก DB (kebab-case) แล้วคืน React component ของ Lucide
function getLucideIcon(name?: string | null): LucideIcon | null {
    if (!name) return null;

    const key = toPascal(name); // eg. "bar-chart-3" -> "BarChart3"
    const iconMap = Lucide as unknown as Record<string, unknown>;
    const candidate = iconMap[key];

    if (typeof candidate === "function") {
        return candidate as unknown as LucideIcon;
    }
    return null;
}

/**
 * ✅ แก้ warning "CSS inline styles" โดยไม่ใช้ style={}
 * แนวคิด: รองรับแค่สีที่เป็น token/hex ที่เรารู้จัก -> map เป็น className
 * ถ้าสีไม่อยู่ในรายการ -> ใช้ default class
 */
function colorToTextClass(color?: string | null): string | null {
    const c = (color || "").trim().toLowerCase();
    if (!c) return null;

    // รองรับ token แบบ "teal", "sky", "rose" ฯลฯ
    const tokenMap: Record<string, string> = {
        teal: "text-teal-600",
        sky: "text-sky-600",
        blue: "text-blue-600",
        indigo: "text-indigo-600",
        violet: "text-violet-600",
        purple: "text-purple-600",
        emerald: "text-emerald-600",
        green: "text-green-600",
        amber: "text-amber-600",
        orange: "text-orange-600",
        rose: "text-rose-600",
        red: "text-red-600",
        slate: "text-slate-600",
        gray: "text-slate-600",
    };

    if (c in tokenMap) return tokenMap[c];

    // รองรับ token แบบ "teal-500" / "sky-600" (เอาเฉพาะที่ปลอดภัย)
    // หมายเหตุ: tailwind ต้องรู้ class ล่วงหน้า เราอนุญาตเฉพาะชุดที่กำหนดไว้
    const safeTailwind = new Set<string>([
        "text-teal-500",
        "text-teal-600",
        "text-sky-500",
        "text-sky-600",
        "text-blue-500",
        "text-blue-600",
        "text-emerald-500",
        "text-emerald-600",
        "text-amber-500",
        "text-amber-600",
        "text-rose-500",
        "text-rose-600",
        "text-red-500",
        "text-red-600",
        "text-violet-500",
        "text-violet-600",
        "text-slate-500",
        "text-slate-600",
    ]);
    if (safeTailwind.has(`text-${c}`)) return `text-${c}`;

    // รองรับ hex ยอดฮิต (ตัวอย่าง) — เพิ่มได้ตามที่ระบบใช้จริง
    const hexMap: Record<string, string> = {
        "#0ea5e9": "text-sky-500",
        "#0284c7": "text-sky-600",
        "#14b8a6": "text-teal-500",
        "#0d9488": "text-teal-600",
        "#10b981": "text-emerald-500",
        "#059669": "text-emerald-600",
        "#f59e0b": "text-amber-500",
        "#d97706": "text-amber-600",
        "#fb7185": "text-rose-500",
        "#e11d48": "text-rose-600",
        "#ef4444": "text-red-500",
        "#dc2626": "text-red-600",
        "#8b5cf6": "text-violet-500",
        "#7c3aed": "text-violet-600",
    };

    return hexMap[c] ?? null;
}

function buildQuery(
    obj: Record<string, string | number | boolean | null | undefined>
): string {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(obj)) {
        if (v === undefined || v === null || v === "") continue;
        u.set(k, String(v));
    }
    const qs = u.toString();
    return qs ? `?${qs}` : "";
}

async function readJson(res: Response): Promise<unknown> {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) return res.json();
    const text = await res.text();
    throw new Error(`Non-JSON response (status ${res.status}). ${text.slice(0, 120)}`);
}

function fmtTH(iso?: string): string {
    return iso
        ? new Intl.DateTimeFormat("th-TH", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(new Date(iso))
        : "-";
}

// ✅ ทำ headers ให้เป็น Headers เสมอ (ไม่มี Authorization: undefined)
function buildHeaders(token?: string): Headers {
    const h = new Headers();
    h.set("Content-Type", "application/json");
    if (token && token.trim()) h.set("Authorization", `Bearer ${token}`);
    return h;
}

// ดึง token จาก auth context แบบไม่ใช้ any (เผื่อโปรเจกต์คุณเก็บชื่อ field ต่างกัน)
function pickTokenFromAuth(auth: unknown): string | undefined {
    if (!auth || typeof auth !== "object") return undefined;

    const a = auth as Record<string, unknown>;
    const keys = ["token", "accessToken", "jwt", "idToken"];

    for (const k of keys) {
        const v = a[k];
        if (typeof v === "string" && v.trim()) return v;
    }
    return undefined;
}

/* ===================== small UI ===================== */
function Pill({ active }: { active: boolean }) {
    return (
        <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] ring-1 ${active
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-rose-50 text-rose-700 ring-rose-200"
                }`}
        >
            {active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
            {active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
        </span>
    );
}

function Switch({
    checked,
    onChange,
    disabled,
    label,
}: {
    checked: boolean;
    onChange: (next: boolean) => void;
    disabled?: boolean;
    label: string; // ✅ ใช้เป็น aria-label ให้ปุ่มมี accessible name
}) {
    // ✅ แก้ Edge Tools/axe: ต้องเป็นค่า valid token ("true"/"false") ไม่ใช่ boolean
    const ariaChecked: "true" | "false" = checked ? "true" : "false";

    return (
        <button
            type="button"
            onClick={() => !disabled && onChange(!checked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? "bg-teal-500" : "bg-slate-300"
                } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
            role="switch"
            aria-checked={ariaChecked}
            aria-label={label}
            aria-disabled={disabled ? "true" : "false"}
            title={label}
        >
            <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${checked ? "translate-x-6" : "translate-x-1"
                    }`}
            />
        </button>
    );
}

function Modal({
    open,
    onClose,
    title,
    children,
    footer,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-[min(880px,95vw)] rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b px-5 py-4">
                    <h3 className="font-semibold">{title}</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded p-1.5 hover:bg-slate-100"
                        aria-label="Close modal"
                        title="Close"
                    >
                        ✕
                    </button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto px-5 py-5">{children}</div>
                <div className="flex justify-end gap-2 border-t px-5 py-4">{footer}</div>
            </div>
        </div>
    );
}

/* ====== ฟอร์มสกิลหลัก (ใช้ทั้งสร้าง/แก้ไข) ====== */
type MainForm = {
    id?: number;
    name_TH: string;
    name_EN: string;
    description_TH?: string | null;
    description_EN?: string | null;
    icon?: string | null;
    color?: string | null;
    sortOrder?: number | null;
    isActive: boolean;
};

function MainFormFields({
    draft,
    setDraft,
}: {
    draft: MainForm;
    setDraft: (d: MainForm) => void;
}) {
    const idBase = "main-skill-form";

    return (
        <div className="grid gap-3 sm:grid-cols-2">
            <div>
                <label htmlFor={`${idBase}-nameTH`} className="mb-1 block text-xs text-slate-500">
                    ชื่อ (TH)
                </label>
                <input
                    id={`${idBase}-nameTH`}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={draft.name_TH}
                    onChange={(e) => setDraft({ ...draft, name_TH: e.target.value })}
                    placeholder="เช่น การสื่อสาร"
                    title="ชื่อ (TH)"
                />
            </div>

            <div>
                <label htmlFor={`${idBase}-nameEN`} className="mb-1 block text-xs text-slate-500">
                    ชื่อ (EN)
                </label>
                <input
                    id={`${idBase}-nameEN`}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={draft.name_EN}
                    onChange={(e) => setDraft({ ...draft, name_EN: e.target.value })}
                    placeholder="e.g. Communication"
                    title="ชื่อ (EN)"
                />
            </div>

            <div className="sm:col-span-2">
                <label htmlFor={`${idBase}-descTH`} className="mb-1 block text-xs text-slate-500">
                    คำอธิบาย (TH)
                </label>
                <textarea
                    id={`${idBase}-descTH`}
                    rows={2}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={draft.description_TH ?? ""}
                    onChange={(e) => setDraft({ ...draft, description_TH: e.target.value })}
                    placeholder="คำอธิบายสกิลหลัก (ภาษาไทย)"
                    title="คำอธิบาย (TH)"
                />
            </div>

            <div className="sm:col-span-2">
                <label htmlFor={`${idBase}-descEN`} className="mb-1 block text-xs text-slate-500">
                    Description (EN)
                </label>
                <textarea
                    id={`${idBase}-descEN`}
                    rows={2}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={draft.description_EN ?? ""}
                    onChange={(e) => setDraft({ ...draft, description_EN: e.target.value })}
                    placeholder="Main skill description (English)"
                    title="Description (EN)"
                />
            </div>

            <div>
                <label htmlFor={`${idBase}-icon`} className="mb-1 block text-xs text-slate-500">
                    ไอคอน (ชื่อไอคอน lucide เช่น users, bar-chart-3)
                </label>
                <input
                    id={`${idBase}-icon`}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={draft.icon ?? ""}
                    onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                    placeholder="เช่น users"
                    title="ไอคอน (lucide)"
                />
            </div>

            <div>
                <label htmlFor={`${idBase}-color`} className="mb-1 block text-xs text-slate-500">
                    สี (ไม่บังคับ)
                </label>
                <input
                    id={`${idBase}-color`}
                    placeholder="#0EA5E9 หรือ teal"
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={draft.color ?? ""}
                    onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                    title="สี (hex/token)"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                    * รองรับเฉพาะสีในรายการที่ระบบ map เป็น Tailwind class (กัน inline style warning)
                </p>
            </div>

            <div>
                <label htmlFor={`${idBase}-sortOrder`} className="mb-1 block text-xs text-slate-500">
                    ลำดับ (ตัวเลข, ไม่บังคับ)
                </label>
                <input
                    id={`${idBase}-sortOrder`}
                    type="number"
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={draft.sortOrder ?? ""}
                    onChange={(e) =>
                        setDraft({
                            ...draft,
                            sortOrder: e.target.value === "" ? null : Number(e.target.value),
                        })
                    }
                    placeholder="เช่น 1"
                    title="ลำดับ"
                />
            </div>

            <div className="flex items-center gap-3 pt-1">
                <Switch
                    checked={draft.isActive}
                    onChange={(v) => setDraft({ ...draft, isActive: v })}
                    label="สลับสถานะเปิดใช้งานสกิลหลัก"
                />
                <span className="text-sm text-slate-700">เปิดใช้งาน</span>
            </div>
        </div>
    );
}

/* ====== ฟอร์มสกิลรอง (เพิ่ม/แก้ไข) ====== */
type SubForm = {
    id?: number | string;
    mainSkillCategory_id: number;
    name_TH: string;
    name_EN: string;
    description_TH?: string | null;
    description_EN?: string | null;
    icon?: string | null;
    color?: string | null;
    sortOrder?: number | null;
    isActive: boolean;
};

function SubFormFields({
    draft,
    setDraft,
}: {
    draft: SubForm;
    setDraft: (d: SubForm) => void;
}) {
    const idBase = "sub-skill-form";

    return (
        <div className="grid gap-3 sm:grid-cols-2">
            <div>
                <label htmlFor={`${idBase}-nameTH`} className="mb-1 block text-xs text-slate-500">
                    ชื่อสกิลรอง (TH)
                </label>
                <input
                    id={`${idBase}-nameTH`}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={draft.name_TH}
                    onChange={(e) => setDraft({ ...draft, name_TH: e.target.value })}
                    placeholder="เช่น การพูดในที่สาธารณะ"
                    title="ชื่อสกิลรอง (TH)"
                />
            </div>

            <div>
                <label htmlFor={`${idBase}-nameEN`} className="mb-1 block text-xs text-slate-500">
                    ชื่อสกิลรอง (EN)
                </label>
                <input
                    id={`${idBase}-nameEN`}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={draft.name_EN}
                    onChange={(e) => setDraft({ ...draft, name_EN: e.target.value })}
                    placeholder="e.g. Public Speaking"
                    title="ชื่อสกิลรอง (EN)"
                />
            </div>

            <div className="sm:col-span-2">
                <label htmlFor={`${idBase}-descTH`} className="mb-1 block text-xs text-slate-500">
                    คำอธิบาย (TH)
                </label>
                <textarea
                    id={`${idBase}-descTH`}
                    rows={2}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={draft.description_TH ?? ""}
                    onChange={(e) => setDraft({ ...draft, description_TH: e.target.value })}
                    placeholder="คำอธิบายสกิลรอง (ภาษาไทย)"
                    title="คำอธิบาย (TH)"
                />
            </div>

            <div className="sm:col-span-2">
                <label htmlFor={`${idBase}-descEN`} className="mb-1 block text-xs text-slate-500">
                    Description (EN)
                </label>
                <textarea
                    id={`${idBase}-descEN`}
                    rows={2}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={draft.description_EN ?? ""}
                    onChange={(e) => setDraft({ ...draft, description_EN: e.target.value })}
                    placeholder="Sub skill description (English)"
                    title="Description (EN)"
                />
            </div>

            <div>
                <label htmlFor={`${idBase}-icon`} className="mb-1 block text-xs text-slate-500">
                    ไอคอน (lucide) เช่น users, award
                </label>
                <input
                    id={`${idBase}-icon`}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={draft.icon ?? ""}
                    onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                    placeholder="เช่น award"
                    title="ไอคอน (lucide)"
                />
            </div>

            <div>
                <label htmlFor={`${idBase}-color`} className="mb-1 block text-xs text-slate-500">
                    สี (ไม่บังคับ)
                </label>
                <input
                    id={`${idBase}-color`}
                    placeholder="#0EA5E9 หรือ teal"
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={draft.color ?? ""}
                    onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                    title="สี (hex/token)"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                    * รองรับเฉพาะสีในรายการที่ระบบ map เป็น Tailwind class (กัน inline style warning)
                </p>
            </div>

            <div>
                <label htmlFor={`${idBase}-sortOrder`} className="mb-1 block text-xs text-slate-500">
                    ลำดับ (1–3)
                </label>
                <input
                    id={`${idBase}-sortOrder`}
                    type="number"
                    min={1}
                    max={3}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={draft.sortOrder ?? ""}
                    onChange={(e) =>
                        setDraft({
                            ...draft,
                            sortOrder: e.target.value === "" ? null : Number(e.target.value),
                        })
                    }
                    placeholder="1"
                    title="ลำดับ (1–3)"
                />
            </div>

            <div className="flex items-center gap-3 pt-1">
                <Switch
                    checked={draft.isActive}
                    onChange={(v) => setDraft({ ...draft, isActive: v })}
                    label="สลับสถานะเปิดใช้งานสกิลรอง"
                />
                <span className="text-sm text-slate-700">เปิดใช้งาน</span>
            </div>
        </div>
    );
}

/* ===================== PAGE ===================== */
export default function SkillManagement() {
    const { i18n } = useTranslation();
    const isTH = i18n.language?.startsWith("th");
    const auth = useAuth();

    const token = useMemo(() => pickTokenFromAuth(auth), [auth]);

    // top controls
    const [academicYear, setAcademicYear] = useState("ปีการศึกษา 2568"); // UI เท่านั้น
    const [filter, setFilter] = useState<FilterMode>("all");
    const [q, setQ] = useState("");

    // data
    const [list, setList] = useState<MainSkill[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    // create / edit (main)
    const [createMenuOpen, setCreateMenuOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [draft, setDraft] = useState<MainForm | null>(null);

    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // expand
    const [expanded, setExpanded] = useState<Set<number>>(new Set());
    const toggleExpand = (id: number) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // create / edit (sub)
    const [subOpen, setSubOpen] = useState(false);
    const [subSaving, setSubSaving] = useState(false);
    const [subDraft, setSubDraft] = useState<SubForm | null>(null);
    const [subMode, setSubMode] = useState<"create" | "edit">("create");
    const [subMainName, setSubMainName] = useState<string>("");

    const usage = useMemo(() => {
        const total = list.length;
        const active = list.filter((m) => m.isActive).length;
        return { total, active };
    }, [list]);

    const duplicateSort = useMemo(() => {
        const map = new Map<number, number>();
        list.forEach((m) => {
            const k = m.sortOrder ?? -999999;
            map.set(k, (map.get(k) || 0) + 1);
        });
        return map;
    }, [list]);

    const fetchList = useCallback(async () => {
        setLoading(true);
        setErr(null);

        try {
            // ✅ backend อาจมี default activeOnly=true ถ้าไม่ส่ง -> เราส่ง explicit
            const qs = buildQuery({
                includeSubSkills: true,
                activeOnly: filter === "all" ? false : filter === "active",
            });

            const res = await fetch(`${backend_url}/api/skills${qs}`, {
                method: "GET",
                headers: buildHeaders(token),
                credentials: "include",
            });

            const j = await readJson(res);

            if (!res.ok) {
                const msg =
                    typeof j === "object" && j && "error" in j
                        ? String((j as Record<string, unknown>).error ?? "โหลดข้อมูลล้มเหลว")
                        : "โหลดข้อมูลล้มเหลว";
                throw new Error(msg);
            }

            const data =
                typeof j === "object" && j && "data" in j ? (j as { data: unknown }).data : j;

            setList((data ?? []) as MainSkill[]);
        } catch (e: unknown) {
            setErr(getErrorMessage(e) || "โหลดข้อมูลล้มเหลว");
        } finally {
            setLoading(false);
        }
    }, [filter, token]);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const filtered = useMemo(() => {
        const text = q.trim().toLowerCase();
        let arr = list.slice();

        if (filter !== "all") {
            arr = arr.filter((m) => m.isActive === (filter === "active"));
        }

        if (text) {
            arr = arr.filter((m) => `${m.name_TH} ${m.name_EN}`.toLowerCase().includes(text));
        }

        return arr;
    }, [list, q, filter]);

    /* ===== actions: MAIN ===== */
    const openCreate = () => {
        setDraft({
            name_TH: "",
            name_EN: "",
            description_TH: "",
            description_EN: "",
            icon: "",
            color: "",
            sortOrder: null,
            isActive: true,
        });
        setCreateOpen(true);
    };

    const submitCreate = async () => {
        if (!draft) return;
        setCreating(true);

        try {
            const body = {
                type: "main",
                name_TH: draft.name_TH,
                name_EN: draft.name_EN,
                description_TH: draft.description_TH,
                description_EN: draft.description_EN,
                icon: draft.icon,
                color: draft.color,
                sortOrder: draft.sortOrder ?? undefined,
                isActive: draft.isActive,
            };

            const res = await fetch(`${backend_url}/api/skills`, {
                method: "POST",
                headers: buildHeaders(token),
                credentials: "include",
                body: JSON.stringify(body),
            });

            const j = await readJson(res);

            if (!res.ok) {
                const msg =
                    typeof j === "object" && j && "error" in j
                        ? String((j as Record<string, unknown>).error ?? "สร้างไม่สำเร็จ")
                        : "สร้างไม่สำเร็จ";
                throw new Error(msg);
            }

            setCreateOpen(false);
            await fetchList();
        } catch (e: unknown) {
            alert(getErrorMessage(e) || "เกิดข้อผิดพลาด");
        } finally {
            setCreating(false);
        }
    };

    const openEdit = (m: MainSkill) => {
        setDraft({
            id: m.id,
            name_TH: m.name_TH,
            name_EN: m.name_EN,
            description_TH: m.description_TH ?? "",
            description_EN: m.description_EN ?? "",
            icon: m.icon ?? "",
            color: m.color ?? "",
            sortOrder: m.sortOrder ?? null,
            isActive: m.isActive,
        });
        setEditOpen(true);
    };

    const submitEdit = async () => {
        if (!draft?.id) return;
        setSaving(true);

        try {
            const body = {
                type: "main",
                id: draft.id,
                name_TH: draft.name_TH,
                name_EN: draft.name_EN,
                description_TH: draft.description_TH,
                description_EN: draft.description_EN,
                icon: draft.icon,
                color: draft.color,
                sortOrder: draft.sortOrder ?? undefined,
                isActive: draft.isActive,
            };

            const res = await fetch(`${backend_url}/api/skills`, {
                method: "PUT",
                headers: buildHeaders(token),
                credentials: "include",
                body: JSON.stringify(body),
            });

            const j = await readJson(res);

            if (!res.ok) {
                const msg =
                    typeof j === "object" && j && "error" in j
                        ? String((j as Record<string, unknown>).error ?? "บันทึกไม่สำเร็จ")
                        : "บันทึกไม่สำเร็จ";
                throw new Error(msg);
            }

            setEditOpen(false);
            await fetchList();
        } catch (e: unknown) {
            alert(getErrorMessage(e) || "เกิดข้อผิดพลาด");
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = async (id: number, next: boolean) => {
        if (next === false) {
            const ok = confirm("ยืนยันต้องการปิดการใช้งานสกิลหลักนี้หรือไม่?");
            if (!ok) return;
        }

        try {
            const res = await fetch(`${backend_url}/api/skills${buildQuery({ type: "main", id })}`, {
                method: "PATCH",
                headers: buildHeaders(token),
                credentials: "include",
                body: JSON.stringify({ isActive: next }),
            });

            const j = await readJson(res);

            if (!res.ok) {
                const msg =
                    typeof j === "object" && j && "error" in j
                        ? String((j as Record<string, unknown>).error ?? "อัปเดตสถานะไม่สำเร็จ")
                        : "อัปเดตสถานะไม่สำเร็จ";
                throw new Error(msg);
            }

            await fetchList();
        } catch (e: unknown) {
            alert(getErrorMessage(e) || "เกิดข้อผิดพลาด");
        }
    };

    const delMain = async (id: number) => {
        if (!confirm("ยืนยันลบสกิลหลักแบบถาวร?")) return;

        try {
            const res = await fetch(`${backend_url}/api/skills${buildQuery({ type: "main", id })}`, {
                method: "DELETE",
                headers: buildHeaders(token),
                credentials: "include",
            });

            const j = await readJson(res);

            if (!res.ok) {
                const msg =
                    typeof j === "object" && j && "error" in j
                        ? String((j as Record<string, unknown>).error ?? "ลบไม่สำเร็จ")
                        : "ลบไม่สำเร็จ";
                throw new Error(msg);
            }

            await fetchList();
        } catch (e: unknown) {
            alert(getErrorMessage(e) || "เกิดข้อผิดพลาด");
        }
    };

    /* ===== actions: SUB ===== */
    const openCreateSub = (main: MainSkill) => {
        setSubMode("create");
        setSubMainName(isTH ? main.name_TH : main.name_EN);
        setSubDraft({
            mainSkillCategory_id: main.id,
            name_TH: "",
            name_EN: "",
            description_TH: "",
            description_EN: "",
            icon: "",
            color: "",
            sortOrder: null,
            isActive: true,
        });
        setSubOpen(true);
    };

    const openEditSub = (main: MainSkill, s: SubSkill) => {
        setSubMode("edit");
        setSubMainName(isTH ? main.name_TH : main.name_EN);
        setSubDraft({
            id: s.id,
            mainSkillCategory_id: s.mainSkillCategory_id,
            name_TH: s.name_TH,
            name_EN: s.name_EN,
            description_TH: s.description_TH ?? "",
            description_EN: s.description_EN ?? "",
            icon: s.icon ?? "",
            color: s.color ?? "",
            sortOrder: s.sortOrder ?? null,
            isActive: Boolean(s.isActive),
        });
        setSubOpen(true);
    };

    const submitCreateSub = async () => {
        if (!subDraft) return;
        setSubSaving(true);

        try {
            // ✅ backend ยัง require slug สำหรับ sub — เรา generate ให้ (กันว่าง)
            const autoSlug =
                (subDraft.name_EN || subDraft.name_TH || "")
                    .trim()
                    .toLowerCase()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9-]/g, "") || `sub-${Date.now()}`;

            const body = {
                type: "sub",
                mainSkillCategory_id: subDraft.mainSkillCategory_id,
                name_TH: subDraft.name_TH,
                name_EN: subDraft.name_EN,
                description_TH: subDraft.description_TH,
                description_EN: subDraft.description_EN,
                slug: autoSlug,
                icon: subDraft.icon,
                color: subDraft.color,
                sortOrder: subDraft.sortOrder,
                isActive: subDraft.isActive,
            };

            const res = await fetch(`${backend_url}/api/skills`, {
                method: "POST",
                headers: buildHeaders(token),
                credentials: "include",
                body: JSON.stringify(body),
            });

            const j = await readJson(res);

            if (!res.ok) {
                const msg =
                    typeof j === "object" && j && "error" in j
                        ? String((j as Record<string, unknown>).error ?? "สร้างสกิลรองไม่สำเร็จ")
                        : "สร้างสกิลรองไม่สำเร็จ";
                throw new Error(msg);
            }

            setSubOpen(false);
            await fetchList();
        } catch (e: unknown) {
            alert(getErrorMessage(e) || "เกิดข้อผิดพลาด");
        } finally {
            setSubSaving(false);
        }
    };

    const submitEditSub = async () => {
        if (!subDraft?.id) return;
        setSubSaving(true);

        try {
            const body = {
                type: "sub",
                id: subDraft.id,
                mainSkillCategory_id: subDraft.mainSkillCategory_id,
                name_TH: subDraft.name_TH,
                name_EN: subDraft.name_EN,
                description_TH: subDraft.description_TH,
                description_EN: subDraft.description_EN,
                icon: subDraft.icon,
                color: subDraft.color,
                sortOrder: subDraft.sortOrder ?? undefined,
                isActive: subDraft.isActive,
            };

            const res = await fetch(`${backend_url}/api/skills`, {
                method: "PUT",
                headers: buildHeaders(token),
                credentials: "include",
                body: JSON.stringify(body),
            });

            const j = await readJson(res);

            if (!res.ok) {
                const msg =
                    typeof j === "object" && j && "error" in j
                        ? String((j as Record<string, unknown>).error ?? "บันทึกสกิลรองไม่สำเร็จ")
                        : "บันทึกสกิลรองไม่สำเร็จ";
                throw new Error(msg);
            }

            setSubOpen(false);
            await fetchList();
        } catch (e: unknown) {
            alert(getErrorMessage(e) || "เกิดข้อผิดพลาด");
        } finally {
            setSubSaving(false);
        }
    };

    const toggleActiveSub = async (id: number | string, next: boolean) => {
        if (next === false) {
            const ok = confirm("ยืนยันต้องการปิดการใช้งานสกิลรองนี้หรือไม่?");
            if (!ok) return;
        }

        try {
            const res = await fetch(`${backend_url}/api/skills${buildQuery({ type: "sub", id })}`, {
                method: "PATCH",
                headers: buildHeaders(token),
                credentials: "include",
                body: JSON.stringify({ isActive: next }),
            });

            const j = await readJson(res);

            if (!res.ok) {
                const msg =
                    typeof j === "object" && j && "error" in j
                        ? String((j as Record<string, unknown>).error ?? "อัปเดตสถานะสกิลรองไม่สำเร็จ")
                        : "อัปเดตสถานะสกิลรองไม่สำเร็จ";
                throw new Error(msg);
            }

            await fetchList();
        } catch (e: unknown) {
            alert(getErrorMessage(e) || "เกิดข้อผิดพลาด");
        }
    };

    const delSub = async (id: number | string) => {
        if (!confirm("ยืนยันลบสกิลรองแบบถาวร?")) return;

        try {
            const res = await fetch(`${backend_url}/api/skills${buildQuery({ type: "sub", id })}`, {
                method: "DELETE",
                headers: buildHeaders(token),
                credentials: "include",
            });

            const j = await readJson(res);

            if (!res.ok) {
                const msg =
                    typeof j === "object" && j && "error" in j
                        ? String((j as Record<string, unknown>).error ?? "ลบสกิลรองไม่สำเร็จ")
                        : "ลบสกิลรองไม่สำเร็จ";
                throw new Error(msg);
            }

            await fetchList();
        } catch (e: unknown) {
            alert(getErrorMessage(e) || "เกิดข้อผิดพลาด");
        }
    };

    /* ===================== render ===================== */
    // ✅ แก้ Edge Tools/axe: aria-expanded ต้องเป็น token "true"/"false"
    const ariaCreateMenuExpanded: "true" | "false" = createMenuOpen ? "true" : "false";

    return (
        <div className="space-y-4">
            <AdminPageHeader />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold">จัดการสกิลภายในระบบ</h1>
                    <p className="text-sm text-slate-500">
                        สร้าง/แก้ไข “สกิลหลัก” (Main Skills) และ “สกิลรอง” (Sub Skills)
                    </p>
                </div>
            </div>

            {/* control row */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex w-full max-w-3xl flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="w-[220px]">
                        <label htmlFor="academicYear" className="sr-only">
                            ปีการศึกษา
                        </label>
                        <select
                            id="academicYear"
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                            className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none ring-teal-500 focus:ring-2"
                            title="ปีการศึกษา"
                        >
                            <option>ปีการศึกษา 2568</option>
                            <option>ปีการศึกษา 2567</option>
                            <option>ปีการศึกษา 2566</option>
                        </select>
                    </div>

                    <div
                        className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200"
                        aria-label="สรุปจำนวนสกิลที่เปิดใช้งาน"
                        title="สรุปจำนวนสกิลที่เปิดใช้งาน"
                    >
                        ใช้งานอยู่ {usage.active}/{usage.total}
                    </div>

                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <label htmlFor="searchSkill" className="sr-only">
                            ค้นหาสกิลหลัก
                        </label>
                        <input
                            id="searchSkill"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="ค้นหาสกิลหลัก"
                            className="w-full rounded-lg border bg-white py-2 pl-9 pr-3 text-sm outline-none ring-teal-500 focus:ring-2"
                            title="ค้นหาสกิลหลัก"
                        />
                    </div>

                    <div className="relative w-[200px]">
                        <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <label htmlFor="filterMode" className="sr-only">
                            ตัวกรองสถานะ
                        </label>
                        <select
                            id="filterMode"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as FilterMode)}
                            className="w-full appearance-none rounded-lg border bg-white py-2 pl-9 pr-8 text-sm outline-none ring-teal-500 focus:ring-2"
                            title="ตัวกรองสถานะ"
                        >
                            <option value="all">ทั้งหมด</option>
                            <option value="active">เปิดใช้งาน</option>
                            <option value="inactive">ปิดใช้งาน</option>
                        </select>
                    </div>
                </div>

                {/* add button (main) */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setCreateMenuOpen((v) => !v)}
                        className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-teal-700"
                        aria-expanded={ariaCreateMenuExpanded}
                        aria-haspopup="menu"
                        title="เพิ่มสกิล"
                    >
                        <Plus size={18} /> เพิ่มสกิล <ChevronDown size={16} className="opacity-80" />
                    </button>

                    {createMenuOpen && (
                        <div
                            className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                            onMouseLeave={() => setCreateMenuOpen(false)}
                            role="menu"
                            aria-label="เมนูเพิ่มสกิล"
                        >
                            <button
                                type="button"
                                className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                                onClick={() => {
                                    setCreateMenuOpen(false);
                                    openCreate();
                                }}
                                role="menuitem"
                                title="สร้างสกิลหลัก"
                            >
                                + สร้างสกิลหลัก
                            </button>
                            <div className="px-4 py-2 text-xs text-slate-400">
                                * เพิ่มสกิลรองทำได้ในแต่ละสกิลหลัก
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* cards */}
            <div className="grid gap-4 md:grid-cols-2">
                {loading ? (
                    <div className="md:col-span-2 rounded-2xl border bg-white p-6 text-sm text-slate-500">
                        กำลังโหลด...
                    </div>
                ) : err ? (
                    <div className="md:col-span-2 rounded-2xl border bg-white p-6 text-sm text-rose-600">{err}</div>
                ) : filtered.length === 0 ? (
                    <div className="md:col-span-2 rounded-2xl border bg-white p-6 text-sm text-slate-500">ไม่พบข้อมูล</div>
                ) : (
                    filtered.map((m) => {
                        const sortDup =
                            m.sortOrder !== null &&
                            m.sortOrder !== undefined &&
                            (duplicateSort.get(m.sortOrder) || 0) > 1;

                        const IconComp = getLucideIcon(m.icon);
                        const iconColorClass = colorToTextClass(m.color) ?? "text-teal-600";

                        const descTH = (m.description_TH ?? "").trim();
                        const descEN = (m.description_EN ?? "").trim();

                        return (
                            <div key={m.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                                {/* header */}
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={`flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 ${iconColorClass}`}
                                            title={m.icon || undefined}
                                            aria-label="ไอคอนสกิล"
                                        >
                                            {IconComp ? (
                                                <IconComp size={18} />
                                            ) : (
                                                <span className="text-[11px] font-semibold">
                                                    {acronym(m.name_EN || m.name_TH || m.slug)}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-slate-800">{m.name_TH}</div>
                                            <div className="text-xs text-slate-500">{m.name_EN}</div>
                                        </div>
                                    </div>
                                    <Pill active={m.isActive} />
                                </div>

                                {/* description */}
                                <div className="mb-3 grid gap-2 sm:grid-cols-2">
                                    <div className="rounded-lg border bg-slate-50/60 p-3 text-[13px]">
                                        <div className="mb-1 text-[11px] font-medium text-slate-500">คำอธิบาย (TH)</div>
                                        <div className={descTH ? "text-slate-800" : "italic text-slate-500"}>
                                            {descTH || "ไม่ได้ใส่คำอธิบายไว้"}
                                        </div>
                                    </div>
                                    <div className="rounded-lg border bg-slate-50/60 p-3 text-[13px]">
                                        <div className="mb-1 text-[11px] font-medium text-slate-500">Description (EN)</div>
                                        <div className={descEN ? "text-slate-800" : "italic text-slate-500"}>
                                            {descEN || "No description provided."}
                                        </div>
                                    </div>
                                </div>

                                {/* meta */}
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    <span className="rounded bg-slate-50 px-2 py-1 text-[11px] ring-1 ring-slate-200">
                                        สร้างเมื่อ: {fmtTH(m.createdAt)}
                                    </span>
                                    <span
                                        className={`rounded px-2 py-1 text-[11px] ring-1 ${sortDup
                                            ? "bg-rose-50 text-rose-700 ring-rose-200"
                                            : "bg-slate-50 text-slate-600 ring-slate-200"
                                            }`}
                                        title={sortDup ? "ลำดับซ้ำกับรายการอื่น" : "ลำดับ"}
                                    >
                                        ลำดับ: {m.sortOrder ?? "-"}
                                    </span>
                                </div>

                                {/* actions */}
                                <div className="flex items-center justify-between">
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50"
                                            title={isTH ? "ดู/ซ่อนสกิลรอง" : "Toggle sub skills"}
                                            aria-label={isTH ? "ดู/ซ่อนสกิลรอง" : "Toggle sub skills"}
                                            aria-expanded={expanded.has(m.id) ? "true" : "false"}
                                            onClick={() => toggleExpand(m.id)}
                                        >
                                            <Eye size={16} />
                                            {expanded.has(m.id)
                                                ? isTH
                                                    ? "ซ่อนสกิลรอง"
                                                    : "Hide Sub Skills"
                                                : isTH
                                                    ? "ดูสกิลรอง"
                                                    : "View Sub Skills"}
                                        </button>

                                        <button
                                            type="button"
                                            className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50"
                                            onClick={() => openCreateSub(m)}
                                            title={isTH ? "เพิ่มสกิลรอง" : "Add Sub Skill"}
                                            aria-label={isTH ? "เพิ่มสกิลรอง" : "Add Sub Skill"}
                                        >
                                            <Plus size={16} /> {isTH ? "เพิ่มสกิลรอง" : "Add Sub Skill"}
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={m.isActive}
                                            onChange={(v) => toggleActive(m.id, v)}
                                            label="สลับสถานะสกิลหลัก"
                                        />
                                        <button
                                            type="button"
                                            className="rounded-lg border p-2 text-slate-600 hover:bg-slate-50"
                                            title="แก้ไขสกิลหลัก"
                                            aria-label="แก้ไขสกิลหลัก"
                                            onClick={() => openEdit(m)}
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            className="rounded-lg border p-2 text-rose-600 hover:bg-rose-50"
                                            title="ลบสกิลหลัก"
                                            aria-label="ลบสกิลหลัก"
                                            onClick={() => delMain(m.id)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Sub-skills area */}
                                {expanded.has(m.id) && (
                                    <div className="mt-3 rounded-xl border bg-white/60 p-3">
                                        {!m.subSkills || m.subSkills.length === 0 ? (
                                            <div className="px-1 py-1 text-sm text-slate-500">
                                                {isTH ? "ยังไม่มีสกิลรอง" : "No sub skills yet"}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-3">
                                                {m.subSkills.map((s) => {
                                                    const SIcon = getLucideIcon(s.icon);
                                                    const sIconColorClass = colorToTextClass(s.color) ?? "text-slate-600";

                                                    const sDescTH = (s.description_TH ?? "").trim();
                                                    const sDescEN = (s.description_EN ?? "").trim();

                                                    return (
                                                        <div key={String(s.id)} className="rounded-lg border bg-white p-3">
                                                            <div className="mb-2 flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <div
                                                                        className={`flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 ${sIconColorClass}`}
                                                                        title={s.icon || undefined}
                                                                        aria-label="ไอคอนสกิลรอง"
                                                                    >
                                                                        {SIcon ? (
                                                                            <SIcon size={18} />
                                                                        ) : (
                                                                            <span className="text-[10px] font-semibold">
                                                                                {acronym(s.name_EN || s.name_TH || s.slug)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-sm font-medium text-slate-800">{s.name_TH}</div>
                                                                        <div className="text-[11px] text-slate-500">{s.name_EN}</div>
                                                                    </div>
                                                                </div>
                                                                {typeof s.isActive === "boolean" && <Pill active={Boolean(s.isActive)} />}
                                                            </div>

                                                            <div className="grid gap-2 sm:grid-cols-2">
                                                                <div className="rounded-lg border bg-slate-50/60 p-2 text-[13px] text-slate-700">
                                                                    <div className="mb-0.5 text-[11px] font-medium text-slate-500">คำอธิบาย (TH)</div>
                                                                    {sDescTH ? sDescTH : <span className="italic text-slate-500">ไม่ได้ใส่คำอธิบายไว้</span>}
                                                                </div>
                                                                <div className="rounded-lg border bg-slate-50/60 p-2 text-[13px] text-slate-700">
                                                                    <div className="mb-0.5 text-[11px] font-medium text-slate-500">
                                                                        Description (EN)
                                                                    </div>
                                                                    {sDescEN ? (
                                                                        sDescEN
                                                                    ) : (
                                                                        <span className="italic text-slate-500">No description provided.</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="mt-2 flex items-center justify-between gap-2">
                                                                <div className="flex items-center gap-2">
                                                                    <Switch
                                                                        checked={Boolean(s.isActive)}
                                                                        onChange={(v) => toggleActiveSub(s.id, v)}
                                                                        label="สลับสถานะสกิลรอง"
                                                                    />
                                                                    <span className="text-xs text-slate-600">
                                                                        {s.isActive ? (isTH ? "เปิดใช้งาน" : "Active") : isTH ? "ปิดใช้งาน" : "Inactive"}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        type="button"
                                                                        className="rounded-lg border p-2 text-slate-600 hover:bg-slate-50"
                                                                        title="แก้ไขสกิลรอง"
                                                                        aria-label="แก้ไขสกิลรอง"
                                                                        onClick={() => openEditSub(m, s)}
                                                                    >
                                                                        <Pencil size={16} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="rounded-lg border p-2 text-rose-600 hover:bg-rose-50"
                                                                        title="ลบสกิลรอง"
                                                                        aria-label="ลบสกิลรอง"
                                                                        onClick={() => delSub(s.id)}
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Create Main Modal */}
            <Modal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                title="สร้างสกิลหลัก"
                footer={
                    <>
                        <button
                            type="button"
                            className="rounded-lg px-4 py-2 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                            onClick={() => setCreateOpen(false)}
                            disabled={creating}
                            title="ยกเลิก"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="button"
                            className="rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 disabled:opacity-50"
                            onClick={submitCreate}
                            disabled={creating || !draft?.name_TH || !draft?.name_EN}
                            title="บันทึก"
                        >
                            {creating ? "กำลังบันทึก..." : "บันทึก"}
                        </button>
                    </>
                }
            >
                {draft && <MainFormFields draft={draft} setDraft={setDraft} />}
            </Modal>

            {/* Edit Main Modal */}
            <Modal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                title="แก้ไขสกิลหลัก"
                footer={
                    <>
                        <button
                            type="button"
                            className="rounded-lg px-4 py-2 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                            onClick={() => setEditOpen(false)}
                            disabled={saving}
                            title="ยกเลิก"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="button"
                            className="rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 disabled:opacity-50"
                            onClick={submitEdit}
                            disabled={saving || !draft?.name_TH || !draft?.name_EN}
                            title="บันทึก"
                        >
                            {saving ? "กำลังบันทึก..." : "บันทึก"}
                        </button>
                    </>
                }
            >
                {draft && <MainFormFields draft={draft} setDraft={setDraft} />}
            </Modal>

            {/* Create/Edit Sub Modal */}
            <Modal
                open={subOpen}
                onClose={() => setSubOpen(false)}
                title={`${subMode === "create" ? "เพิ่มสกิลรอง" : "แก้ไขสกิลรอง"} — ${subMainName}`}
                footer={
                    <>
                        <button
                            type="button"
                            className="rounded-lg px-4 py-2 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                            onClick={() => setSubOpen(false)}
                            disabled={subSaving}
                            title="ยกเลิก"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="button"
                            className="rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700 disabled:opacity-50"
                            onClick={subMode === "create" ? submitCreateSub : submitEditSub}
                            disabled={
                                subSaving ||
                                !subDraft?.name_TH ||
                                !subDraft?.name_EN ||
                                !subDraft?.mainSkillCategory_id ||
                                subDraft?.sortOrder == null
                            }
                            title="บันทึก"
                        >
                            {subSaving ? "กำลังบันทึก..." : "บันทึก"}
                        </button>
                    </>
                }
            >
                {subDraft && <SubFormFields draft={subDraft} setDraft={setSubDraft} />}
            </Modal>
        </div>
    );
}
