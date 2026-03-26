// src/pages/Admin_pages/EventManagement/EventCategories.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    Search,
    Filter,
    Pencil,
    Trash2,
    CheckCircle2,
    XCircle,
    X,
    Plus,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";
import AdminPageHeader from "../../../components/Admin/AdminPageHeader";
import { backend_url } from "../../../../utils/constants";
//"../../../utils/constants";

/* ===================== types ===================== */

type MajorAdminRole = "OWNER" | "ADMIN";

type MajorAdmin = {
    role: MajorAdminRole;
    assignedAt?: string | null;
    user: {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        photo?: string | null;
    };
};

type MajorEventStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

type MajorEvent = {
    id: number;
    title_TH?: string | null;
    title_EN?: string | null;
    status: MajorEventStatus;
    activityStart?: string | null;
    activityEnd?: string | null;
};

type MajorCategory = {
    id: number;
    code: string;
    name_TH: string;
    name_EN: string;
    icon?: string | null;
    isActive: boolean;
    description_TH?: string | null;
    description_EN?: string | null;
    faculty_TH?: string | null;
    faculty_EN?: string | null;
    createdAt?: string;
    updatedAt?: string;
    admins?: MajorAdmin[];
    events?: MajorEvent[];
};



type StatusFilter = "all" | "active" | "inactive";

const STATUS_FILTERS: ReadonlyArray<StatusFilter> = [
    "all",
    "active",
    "inactive",
];

/* ===================== utils ===================== */

const DEFAULT_FACULTY_TH = "คณะวิศวกรรมศาสตร์";
const DEFAULT_FACULTY_EN = "Faculty of Engineering";

function asRecord(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null;
}

function getErrorMessage(e: unknown): string {
    if (e instanceof Error) return e.message;
    if (typeof e === "string") return e;
    return "Unknown error";
}

// cpu / bar-chart-3 / BarChart3 -> BarChart3
function toPascal(anyCase?: string | null): string {
    if (!anyCase) return "";
    const kebab = anyCase.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
    return kebab
        .split("-")
        .filter(Boolean)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join("");
}

type LucideIconComponent = React.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
>;

function getLucideIconByAny(name?: string | null): LucideIconComponent | null {
    if (!name) return null;
    const key = toPascal(name);
    const raw = (LucideIcons as Record<string, unknown>)[key];

    // lucide-react icons เป็น ForwardRefExoticComponent (runtime มักเป็น object)
    if (raw && (typeof raw === "function" || typeof raw === "object")) {
        return raw as LucideIconComponent;
    }
    return null;
}

function acronym(s?: string): string {
    return (s || "")
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w[0])
        .join("")
        .slice(0, 3)
        .toUpperCase();
}

type QueryValue = string | number | boolean | null | undefined;

function buildQuery(params: Record<string, QueryValue>): string {
    const u = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "") return;
        u.set(k, String(v));
    });
    const qs = u.toString();
    return qs ? `?${qs}` : "";
}

function formatDate(dt?: string | null): string {
    if (!dt) return "-";
    try {
        return new Intl.DateTimeFormat("th-TH", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(new Date(dt));
    } catch {
        return dt;
    }
}

/**  ดึง token จาก AuthContext  */
function getTokenFromAuth(auth: unknown): string | undefined {
    if (!asRecord(auth)) return undefined;
    const candidates = ["token", "accessToken", "jwt", "idToken"] as const;
    for (const k of candidates) {
        const v = auth[k];
        if (typeof v === "string" && v.trim()) return v;
    }
    return undefined;
}

function parseStatusFilter(v: string): StatusFilter {
    return (STATUS_FILTERS as readonly string[]).includes(v) ? (v as StatusFilter) : "all";
}

function extractMajorCategories(json: unknown): MajorCategory[] {
    // backend ส่งได้ทั้ง {success,data:[...]} หรือส่ง array ตรง ๆ
    if (Array.isArray(json)) return json as MajorCategory[];
    if (asRecord(json) && Array.isArray(json.data)) return json.data as MajorCategory[];
    return [];
}

/* ===================== Edit modal ===================== */

type EditModalProps = {
    open: boolean;
    onClose: () => void;
    onSave: (p: {
        id: number;
        code: string;
        name_TH: string;
        name_EN: string;
        description_TH?: string;
        description_EN?: string;
        icon?: string;
        isActive: boolean;
    }) => Promise<void>;
    data?: MajorCategory | null;
    saving?: boolean;
};

const EditModal: React.FC<EditModalProps> = ({
    open,
    onClose,
    onSave,
    data,
    saving,
}) => {
    const [code, setCode] = useState(data?.code ?? "");
    const [nameTH, setNameTH] = useState(data?.name_TH ?? "");
    const [nameEN, setNameEN] = useState(data?.name_EN ?? "");
    const [descTH, setDescTH] = useState(data?.description_TH ?? "");
    const [descEN, setDescEN] = useState(data?.description_EN ?? "");
    const [icon, setIcon] = useState(data?.icon ?? "");
    const [active, setActive] = useState<boolean>(data?.isActive ?? true);

    useEffect(() => {
        setCode(data?.code ?? "");
        setNameTH(data?.name_TH ?? "");
        setNameEN(data?.name_EN ?? "");
        setDescTH(data?.description_TH ?? "");
        setDescEN(data?.description_EN ?? "");
        setIcon(data?.icon ?? "");
        setActive(data?.isActive ?? true);
    }, [data, open]);

    if (!open || !data) return null;

    const canSave = Boolean(code.trim() && nameTH.trim() && nameEN.trim());
    const IconComp = getLucideIconByAny(icon);

    const idPrefix = `edit-major-${data.id}`;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label="Close modal"
                onClick={onClose}
            />
            <div className="relative w-[min(880px,95vw)] rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between px-5 py-4 border-b">
                    <h3 className="font-semibold">แก้ไขหมวดหมู่สาขา</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded hover:bg-slate-100"
                        aria-label="Close"
                        title="ปิด"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="px-5 py-5 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label
                                htmlFor={`${idPrefix}-code`}
                                className="block text-sm text-slate-600 mb-1"
                            >
                                รหัสสาขา (CODE)
                            </label>
                            <input
                                id={`${idPrefix}-code`}
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ring-teal-500 uppercase"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor={`${idPrefix}-icon`}
                                className="block text-sm text-slate-600 mb-1"
                            >
                                ไอคอน (lucide/ข้อความ)
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    id={`${idPrefix}-icon`}
                                    value={icon}
                                    onChange={(e) => setIcon(e.target.value)}
                                    placeholder="เช่น Cpu, bar-chart-3"
                                    className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ring-teal-500"
                                />
                                <div className="h-10 w-10 rounded-md bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                                    {IconComp ? (
                                        <IconComp size={18} aria-hidden="true" />
                                    ) : (
                                        <span className="text-xs font-semibold">
                                            {acronym(icon || code)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="mt-1 text-xs text-slate-400">
                                รองรับชื่อไอคอนของ lucide เช่น <code>Cpu</code>,{" "}
                                <code>bar-chart-3</code>
                            </p>
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label
                                htmlFor={`${idPrefix}-name-th`}
                                className="block text-sm text-slate-600 mb-1"
                            >
                                ชื่อ (TH)
                            </label>
                            <input
                                id={`${idPrefix}-name-th`}
                                value={nameTH}
                                onChange={(e) => setNameTH(e.target.value)}
                                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ring-teal-500"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor={`${idPrefix}-name-en`}
                                className="block text-sm text-slate-600 mb-1"
                            >
                                ชื่อ (EN)
                            </label>
                            <input
                                id={`${idPrefix}-name-en`}
                                value={nameEN}
                                onChange={(e) => setNameEN(e.target.value)}
                                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ring-teal-500"
                            />
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label
                                htmlFor={`${idPrefix}-desc-th`}
                                className="block text-sm text-slate-600 mb-1"
                            >
                                คำอธิบาย (TH)
                            </label>
                            <textarea
                                id={`${idPrefix}-desc-th`}
                                value={descTH}
                                onChange={(e) => setDescTH(e.target.value)}
                                rows={3}
                                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ring-teal-500"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor={`${idPrefix}-desc-en`}
                                className="block text-sm text-slate-600 mb-1"
                            >
                                คำอธิบาย (EN)
                            </label>
                            <textarea
                                id={`${idPrefix}-desc-en`}
                                value={descEN}
                                onChange={(e) => setDescEN(e.target.value)}
                                rows={3}
                                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ring-teal-500"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                        <div className="space-y-0.5">
                            <div className="text-sm text-slate-700">สถานะ</div>
                            <div className="text-xs text-slate-500">เปิด/ปิด การใช้งานบนระบบ</div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setActive((s) => !s)}
                            className={`relative h-7 w-12 rounded-full transition ${active ? "bg-emerald-500" : "bg-slate-300"
                                }`}
                            aria-label="Toggle active"
                            title="สลับสถานะ"
                        >
                            <span
                                className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white shadow transition ${active ? "right-1" : "left-1"
                                    }`}
                            />
                        </button>
                    </div>
                </div>

                <div className="flex justify-end gap-2 px-5 py-4 border-t">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border text-slate-700 hover:bg-slate-50"
                        disabled={saving}
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            onSave({
                                id: data.id,
                                code: code.trim(),
                                name_TH: nameTH.trim(),
                                name_EN: nameEN.trim(),
                                description_TH: descTH.trim() || undefined,
                                description_EN: descEN.trim() || undefined,
                                icon: icon.trim() || undefined,
                                isActive: active,
                            })
                        }
                        className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                        disabled={saving || !canSave}
                    >
                        {saving ? "กำลังบันทึก..." : "บันทึก"}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ===================== Create modal ===================== */

type CreateModalProps = {
    open: boolean;
    onClose: () => void;
    onCreate: (p: {
        code: string;
        name_TH: string;
        name_EN: string;
        description_TH?: string;
        description_EN?: string;
        icon?: string;
        isActive: boolean;
        faculty_TH: string;
        faculty_EN: string;
    }) => Promise<void>;
    creating?: boolean;
};

const CreateModal: React.FC<CreateModalProps> = ({
    open,
    onClose,
    onCreate,
    creating,
}) => {
    const [code, setCode] = useState("");
    const [nameTH, setNameTH] = useState("");
    const [nameEN, setNameEN] = useState("");
    const [descTH, setDescTH] = useState("");
    const [descEN, setDescEN] = useState("");
    const [icon, setIcon] = useState("");
    const [facultyTH, setFacultyTH] = useState(DEFAULT_FACULTY_TH);
    const [facultyEN, setFacultyEN] = useState(DEFAULT_FACULTY_EN);
    const [active, setActive] = useState(true);

    useEffect(() => {
        if (open) {
            setCode("");
            setNameTH("");
            setNameEN("");
            setDescTH("");
            setDescEN("");
            setIcon("");
            setFacultyTH(DEFAULT_FACULTY_TH);
            setFacultyEN(DEFAULT_FACULTY_EN);
            setActive(true);
        }
    }, [open]);

    if (!open) return null;

    const canSave = Boolean(code.trim() && nameTH.trim() && nameEN.trim());
    const IconComp = getLucideIconByAny(icon);

    const idPrefix = "create-major";

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <button
                type="button"
                className="absolute inset-0 bg-black/40"
                aria-label="Close modal"
                onClick={onClose}
            />
            <div className="relative w-[min(880px,95vw)] rounded-2xl bg-white shadow-xl">
                <div className="flex items-center justify-between px-5 py-4 border-b">
                    <h3 className="font-semibold">สร้างสาขาใหม่</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded hover:bg-slate-100"
                        aria-label="Close"
                        title="ปิด"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="px-5 py-5 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label
                                htmlFor={`${idPrefix}-code`}
                                className="block text-sm text-slate-600 mb-1"
                            >
                                รหัสสาขา (CODE)
                            </label>
                            <input
                                id={`${idPrefix}-code`}
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ring-teal-500 uppercase"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor={`${idPrefix}-icon`}
                                className="block text-sm text-slate-600 mb-1"
                            >
                                ไอคอน (lucide/ข้อความ) *ไม่บังคับ
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    id={`${idPrefix}-icon`}
                                    value={icon}
                                    onChange={(e) => setIcon(e.target.value)}
                                    placeholder="เช่น Cpu, bar-chart-3"
                                    className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ring-teal-500"
                                />
                                <div className="h-10 w-10 rounded-md bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                                    {IconComp ? (
                                        <IconComp size={18} aria-hidden="true" />
                                    ) : (
                                        <span className="text-xs font-semibold">{acronym(icon || code)}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label
                                htmlFor={`${idPrefix}-name-th`}
                                className="block text-sm text-slate-600 mb-1"
                            >
                                ชื่อ (TH)
                            </label>
                            <input
                                id={`${idPrefix}-name-th`}
                                value={nameTH}
                                onChange={(e) => setNameTH(e.target.value)}
                                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ring-teal-500"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor={`${idPrefix}-name-en`}
                                className="block text-sm text-slate-600 mb-1"
                            >
                                ชื่อ (EN)
                            </label>
                            <input
                                id={`${idPrefix}-name-en`}
                                value={nameEN}
                                onChange={(e) => setNameEN(e.target.value)}
                                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ring-teal-500"
                            />
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label
                                htmlFor={`${idPrefix}-desc-th`}
                                className="block text-sm text-slate-600 mb-1"
                            >
                                คำอธิบาย (TH)
                            </label>
                            <textarea
                                id={`${idPrefix}-desc-th`}
                                value={descTH}
                                onChange={(e) => setDescTH(e.target.value)}
                                rows={3}
                                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ring-teal-500"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor={`${idPrefix}-desc-en`}
                                className="block text-sm text-slate-600 mb-1"
                            >
                                คำอธิบาย (EN)
                            </label>
                            <textarea
                                id={`${idPrefix}-desc-en`}
                                value={descEN}
                                onChange={(e) => setDescEN(e.target.value)}
                                rows={3}
                                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ring-teal-500"
                            />
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label
                                htmlFor={`${idPrefix}-faculty-th`}
                                className="block text-sm text-slate-600 mb-1"
                            >
                                คณะ (TH)
                            </label>
                            <input
                                id={`${idPrefix}-faculty-th`}
                                value={facultyTH}
                                onChange={(e) => setFacultyTH(e.target.value)}
                                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ring-teal-500"
                            />
                        </div>
                        <div>
                            <label
                                htmlFor={`${idPrefix}-faculty-en`}
                                className="block text-sm text-slate-600 mb-1"
                            >
                                คณะ (EN)
                            </label>
                            <input
                                id={`${idPrefix}-faculty-en`}
                                value={facultyEN}
                                onChange={(e) => setFacultyEN(e.target.value)}
                                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 ring-teal-500"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                        <div className="space-y-0.5">
                            <div className="text-sm text-slate-700">สถานะ</div>
                            <div className="text-xs text-slate-500">เปิด/ปิด การใช้งานบนระบบ</div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setActive((s) => !s)}
                            className={`relative h-7 w-12 rounded-full transition ${active ? "bg-emerald-500" : "bg-slate-300"
                                }`}
                            aria-label="Toggle active"
                            title="สลับสถานะ"
                        >
                            <span
                                className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white shadow transition ${active ? "right-1" : "left-1"
                                    }`}
                            />
                        </button>
                    </div>
                </div>

                <div className="flex justify-end gap-2 px-5 py-4 border-t">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border text-slate-700 hover:bg-slate-50"
                        disabled={creating}
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            onCreate({
                                code: code.trim(),
                                name_TH: nameTH.trim(),
                                name_EN: nameEN.trim(),
                                description_TH: descTH.trim() || undefined,
                                description_EN: descEN.trim() || undefined,
                                icon: icon.trim() || undefined,
                                isActive: active,
                                faculty_TH: facultyTH.trim() || DEFAULT_FACULTY_TH,
                                faculty_EN: facultyEN.trim() || DEFAULT_FACULTY_EN,
                            })
                        }
                        className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                        disabled={creating || !canSave}
                    >
                        {creating ? "กำลังสร้าง..." : "สร้างสาขา"}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ===================== main page ===================== */

const EventCategories: React.FC = () => {
    const auth = useAuth();
    const token = getTokenFromAuth(auth as unknown);

    const [raw, setRaw] = useState<MajorCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [q, setQ] = useState("");
    const [status, setStatus] = useState<StatusFilter>("all");

    const [editOpen, setEditOpen] = useState(false);
    const [editing, setEditing] = useState<MajorCategory | null>(null);
    const [saving, setSaving] = useState(false);

    const [createOpen, setCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);

    const fetchMajors = useCallback(async () => {
        setLoading(true);
        setErr(null);
        try {
            const res = await fetch(
                `${backend_url}/api/major/category${buildQuery({ includeEvents: true })}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    credentials: "include",
                }
            );

            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

            const json: unknown = await res.json();
            const list = extractMajorCategories(json);
            setRaw(list);
        } catch (e: unknown) {
            setErr(getErrorMessage(e) || "โหลดข้อมูลไม่สำเร็จ");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        void fetchMajors();
    }, [fetchMajors]);

    const rows = useMemo(() => {
        const text = q.trim().toLowerCase();
        let list = raw.slice();

        if (status !== "all") {
            list = list.filter((r) => r.isActive === (status === "active"));
        }
        if (text) {
            list = list.filter((r) =>
                `${r.name_TH} ${r.name_EN} ${r.code}`.toLowerCase().includes(text)
            );
        }
        return list;
    }, [raw, q, status]);

    const openEdit = (item: MajorCategory) => {
        setEditing(item);
        setEditOpen(true);
    };

    const saveEdit = useCallback(
        async (payload: {
            id: number;
            code: string;
            name_TH: string;
            name_EN: string;
            description_TH?: string;
            description_EN?: string;
            icon?: string;
            isActive: boolean;
        }) => {
            setSaving(true);
            try {
                const res = await fetch(`${backend_url}/api/major/category`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        id: payload.id,
                        code: payload.code,
                        name_TH: payload.name_TH,
                        name_EN: payload.name_EN,
                        description_TH: payload.description_TH,
                        description_EN: payload.description_EN,
                        icon: payload.icon,
                        isActive: payload.isActive,
                    }),
                });

                const data: unknown = await res.json().catch(() => ({}));
                if (!res.ok) {
                    const msg =
                        asRecord(data) && typeof data.error === "string"
                            ? data.error
                            : res.statusText;
                    throw new Error(msg);
                }

                setEditOpen(false);
                setEditing(null);
                await fetchMajors();
            } catch (e: unknown) {
                alert(`บันทึกไม่สำเร็จ: ${getErrorMessage(e)}`);
            } finally {
                setSaving(false);
            }
        },
        [token, fetchMajors]
    );

    const removeSoft = useCallback(
        async (id: number) => {
            if (!confirm("ยืนยันการปิดการใช้งานหมวดหมู่นี้?")) return;

            try {
                const res = await fetch(
                    `${backend_url}/api/major/category${buildQuery({ id })}`,
                    {
                        method: "DELETE",
                        headers: {
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        credentials: "include",
                    }
                );

                const data: unknown = await res.json().catch(() => ({}));
                if (!res.ok) {
                    const msg =
                        asRecord(data) && typeof data.error === "string"
                            ? data.error
                            : res.statusText;
                    throw new Error(msg);
                }

                await fetchMajors();
            } catch (e: unknown) {
                alert(`ลบไม่สำเร็จ: ${getErrorMessage(e)}`);
            }
        },
        [token, fetchMajors]
    );

    const createMajor = useCallback(
        async (p: {
            code: string;
            name_TH: string;
            name_EN: string;
            description_TH?: string;
            description_EN?: string;
            icon?: string;
            isActive: boolean;
            faculty_TH: string;
            faculty_EN: string;
        }) => {
            setCreating(true);
            try {
                const res = await fetch(`${backend_url}/api/major/category`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        code: p.code,
                        name_TH: p.name_TH,
                        name_EN: p.name_EN,
                        description_TH: p.description_TH,
                        description_EN: p.description_EN,
                        faculty_TH: p.faculty_TH || DEFAULT_FACULTY_TH,
                        faculty_EN: p.faculty_EN || DEFAULT_FACULTY_EN,
                        icon: p.icon,
                        isActive: p.isActive,
                    }),
                });

                const data: unknown = await res.json().catch(() => ({}));
                if (!res.ok) {
                    const msg =
                        asRecord(data) && typeof data.error === "string"
                            ? data.error
                            : res.statusText;
                    throw new Error(msg);
                }

                setCreateOpen(false);
                await fetchMajors();
            } catch (e: unknown) {
                alert(`สร้างไม่สำเร็จ: ${getErrorMessage(e)}`);
            } finally {
                setCreating(false);
            }
        },
        [token, fetchMajors]
    );

    return (
        <div className="space-y-4">
            <AdminPageHeader />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold">หมวดหมู่สาขาที่จัดทำ</h1>
                    <p className="text-sm text-slate-500">รายการเมเจอร์ปัจจุบันในระบบ</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-3">
                <div className="w-full max-w-3xl flex flex-col sm:flex-row gap-2 sm:items-center">
                    <div className="relative flex-1 min-w-[260px]">
                        <label htmlFor="major-search" className="sr-only">
                            ค้นหาหมวดหมู่ / โค้ด
                        </label>
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2"
                            size={16}
                            aria-hidden="true"
                        />
                        <input
                            id="major-search"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="ค้นหาหมวดหมู่ / โค้ด"
                            className="w-full rounded-lg border pl-9 pr-3 py-2 outline-none focus:ring-2 ring-teal-500 bg-white"
                        />
                    </div>

                    <div className="relative w-[200px]">
                        <label htmlFor="major-status" className="sr-only">
                            ตัวกรองสถานะ
                        </label>
                        <Filter
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2"
                            aria-hidden="true"
                        />
                        <select
                            id="major-status"
                            value={status}
                            onChange={(e) => setStatus(parseStatusFilter(e.target.value))}
                            className="appearance-none pl-9 pr-9 py-2 rounded-lg border bg-white outline-none focus:ring-2 ring-teal-500 w-full"
                            aria-label="ตัวกรองสถานะ"
                            title="ตัวกรองสถานะ"
                        >
                            <option value="all">ทั้งหมด</option>
                            <option value="active">เปิดใช้งาน</option>
                            <option value="inactive">ปิดใช้งาน</option>
                        </select>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-teal-600 text-white px-3.5 py-2 hover:bg-teal-700"
                    aria-label="สร้างสาขาใหม่"
                    title="สร้างสาขาใหม่"
                >
                    <Plus size={18} aria-hidden="true" /> สร้างสาขาใหม่
                </button>
            </div>

            {/* Table */}
            <div className="rounded-2xl border bg-white overflow-hidden">
                <div className="grid grid-cols-[1.6fr,0.8fr,1fr,0.8fr,0.6fr] px-4 py-3 text-sm font-medium text-slate-500 border-b">
                    <div>ชื่อหมวดหมู่สาขา</div>
                    <div className="text-center">จำนวนกิจกรรมที่ใช้งานอยู่</div>
                    <div>วันที่สร้าง</div>
                    <div className="text-center">สถานะ</div>
                    <div className="text-right pr-1">การจัดการ</div>
                </div>

                {loading ? (
                    <div className="p-6 text-sm text-slate-500">กำลังโหลด...</div>
                ) : err ? (
                    <div className="p-6 text-sm text-red-600">{err}</div>
                ) : rows.length === 0 ? (
                    <div className="p-6 text-sm text-slate-500">ไม่พบรายการ</div>
                ) : (
                    rows.map((r) => {
                        const activeEvents = r.events?.length ?? 0;
                        const IconComp = getLucideIconByAny(r.icon);

                        return (
                            <div
                                key={r.id}
                                className="grid grid-cols-[1.6fr,0.8fr,1fr,0.8fr,0.6fr] items-center px-4 py-3 border-t text-sm"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600 shrink-0">
                                        {IconComp ? (
                                            <IconComp size={18} aria-hidden="true" />
                                        ) : (
                                            <span className="text-xs font-semibold uppercase">
                                                {acronym(r.icon || r.code)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-medium text-slate-800 truncate">
                                            {r.name_TH}
                                        </div>
                                        <div className="text-xs text-slate-500 truncate">
                                            {r.name_EN}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-center">{activeEvents} กิจกรรม</div>
                                <div className="text-slate-600">{formatDate(r.createdAt)}</div>

                                <div className="flex justify-center">
                                    {r.isActive ? (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
                                            <CheckCircle2 size={14} aria-hidden="true" /> เปิดใช้งาน
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs text-rose-700">
                                            <XCircle size={14} aria-hidden="true" /> ปิดใช้งาน
                                        </span>
                                    )}
                                </div>

                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        title="แก้ไข"
                                        aria-label="แก้ไข"
                                        className="p-2 rounded-lg border hover:bg-slate-50"
                                        onClick={() => openEdit(r)}
                                    >
                                        <Pencil size={16} aria-hidden="true" />
                                    </button>
                                    <button
                                        type="button"
                                        title="ปิดการใช้งาน"
                                        aria-label="ปิดการใช้งาน"
                                        className="p-2 rounded-lg border hover:bg-slate-50 text-rose-600"
                                        onClick={() => void removeSoft(r.id)}
                                    >
                                        <Trash2 size={16} aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modals */}
            <EditModal
                open={editOpen}
                data={editing}
                onClose={() => setEditOpen(false)}
                onSave={saveEdit}
                saving={saving}
            />
            <CreateModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onCreate={createMajor}
                creating={creating}
            />
        </div>
    );
};

export default EventCategories;
