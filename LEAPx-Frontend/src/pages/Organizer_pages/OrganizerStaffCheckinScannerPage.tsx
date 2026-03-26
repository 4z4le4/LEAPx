import React, { useCallback, useMemo, useState, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import useSWR from "swr";
import { QrCode, CheckCircle2, XCircle, Clock, SwitchCamera, CameraOff, AlertTriangle } from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";
import Navbar from "../../components/Navbar/Navbar";

const API_BASE = import.meta.env.VITE_LEAP_BACKEND_URL || "";
const CHECKIN_ENDPOINT = `${API_BASE}/api/events/checkin_out/staff`;
const STAFF_LIST_ENDPOINT = (eventId: number | string) =>
    `${API_BASE}/api/daily/event/staff/manage/list?action=get_registered_staff&eventId=${eventId}`;

const SCAN_COOLDOWN_MS = 2000;

type StaffMember = {
    id: number;
    userId: number;
    firstName: string;
    lastName: string;
    email: string;
    faculty: string;
    major?: string | null;
    phone?: string | null;
    photo: string;
    roleId: number;
    roleName: string;
    roleDescription_TH: string;
    roleDescription_EN: string;
    responsibilities_TH: string;
    responsibilities_EN: string;
    status: string;
    assignedAt: string;
    assignedBy?: number | null;
    checkedIn: boolean;
    checkInTime?: string | null;
    checkedOut: boolean;
    checkOutTime?: string | null;
};

type StaffListResponse = {
    success: boolean;
    data: {
        eventId: number;
        eventTitle: string;
        totalStaff: number;
        staff: StaffMember[];
    };
};

type ScanHistoryItem = {
    id: string;
    userId?: number;
    raw: string;
    fullName?: string;
    result: "success" | "error" | "warning";
    message: string;
    time: string;
};

type ModalData = {
    type: "success" | "error" | "warning";
    title: string;
    message: string;
    userName: string;
};

const fetcher = (url: string) =>
    fetch(url, { credentials: "include" }).then((res) => res.json());

const formatTime = (iso?: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return Number.isNaN(+d) ? "-" : d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
};

const extractUserIdFromQR = (raw: string): number | null => {
    if (/^\d+$/.test(raw)) return Number(raw);
    try {
        const obj = JSON.parse(raw);
        return obj?.userId ? Number(obj.userId) || null : null;
    } catch {
        try {
            const url = new URL(raw);
            const userId = url.searchParams.get("userId");
            return userId && /^\d+$/.test(userId) ? Number(userId) : null;
        } catch {
            return null;
        }
    }
};

const OrganizerStaffCheckinScannerPage: React.FC = () => {
    const { eventId: eventIdParam } = useParams<{ eventId: string }>();
    const location = useLocation();
    const eventTitle = (location.state as { eventTitle?: string })?.eventTitle || "กิจกรรม";
    const eventId = useMemo(() => Number(eventIdParam) || null, [eventIdParam]);

    const [scannerActive, setScannerActive] = useState(true);
    const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
    const [isPosting, setIsPosting] = useState(false);
    const [mode, setMode] = useState<"qr" | "manual">("qr");
    const [manualId, setManualId] = useState("");
    const [manualError, setManualError] = useState<string | null>(null);
    const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment");
    const [modalData, setModalData] = useState<ModalData | null>(null);
    
    const lastScanTimeRef = useRef<number>(0);
    const lastScannedValueRef = useRef<string>("");

    const { data: staffListRes, mutate: reloadStaffList } = useSWR<StaffListResponse>(
        eventId ? STAFF_LIST_ENDPOINT(eventId) : null,
        fetcher
    );

    const staffList = useMemo(() => staffListRes?.data?.staff ?? [], [staffListRes?.data?.staff]);

    const findStaffName = useCallback((userId?: number) => {
        const staff = staffList.find((x) => x.userId === userId);
        return staff ? `${staff.firstName} ${staff.lastName}` : undefined;
    }, [staffList]);

    const showModal = useCallback((type: "success" | "error" | "warning", title: string, message: string, userName: string) => {
        setModalData({ type, title, message, userName });
    }, []);

    const closeModal = useCallback(() => {
        setModalData(null);
    }, []);

    const performCheckIn = useCallback(async (rawQrOrUserId: string, rawLabel: string) => {
        if (!eventId || isPosting) return;

        setIsPosting(true);
        const nowIso = new Date().toISOString();

        try {
            const isPlainUserId = /^\d+$/.test(rawQrOrUserId);
        
            const payload = isPlainUserId 
                ? { eventId, userId: Number(rawQrOrUserId), dev: true }
                : { eventId, qrCode: rawQrOrUserId, dev: true };

            const res = await fetch(CHECKIN_ENDPOINT, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload)
            });

            const json = await res.json();
            const action = json?.action || "checkin";
            const success = res.ok && json.success;

            const userId = json?.data?.staff?.user_id || json?.data?.userId;
            const userName = findStaffName(userId) || `User ID: ${userId || 'ไม่ทราบ'}`;

            if (success) {
                if (action === "checkin") {
                    showModal("success", "เช็คอินสำเร็จ", "บันทึกเวลาเข้างานเรียบร้อยแล้ว", userName);
                } else {
                    showModal("success", "เช็คเอาท์สำเร็จ", "บันทึกเวลาออกจากงานเรียบร้อยแล้ว", userName);
                }

                const historyItem: ScanHistoryItem = {
                    id: `${Date.now()}-${Math.random()}`,
                    raw: rawLabel,
                    userId,
                    fullName: findStaffName(userId),
                    result: "success",
                    message: json?.message || (action === "checkout" ? "เช็คเอาท์สำเร็จ" : "เช็คอินสำเร็จ"),
                    time: json.data?.checkOutTime || json.data?.checkInTime || nowIso,
                };
                setScanHistory((prev) => [historyItem, ...prev].slice(0, 6));
                reloadStaffList();
            } else {
                const errorMsg = json?.error || json?.message || "เช็คอิน/เช็คเอาท์ไม่สำเร็จ";
                
                if (errorMsg.includes("Invalid or expired QR code")) {
                    showModal("error", "QR Code ไม่ถูกต้อง", "QR Code หมดอายุหรือไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง", userName);
                } else if (errorMsg.includes("Already checked in")) {
                    showModal("warning", "เช็คอินแล้ว", "เช็คอินไปแล้ว", userName);
                } else if (errorMsg.includes("Already completed")) {
                    showModal("warning", "เสร็จสิ้นแล้ว", "ทำเสร็จแล้วทั้งเช็คอินและเช็คเอาท์", userName);
                } else if (errorMsg.includes("not registered") || errorMsg.includes("not assigned")) {
                    showModal("error", "ไม่พบข้อมูลสตาฟ", "ไม่ได้ลงทะเบียนเป็นสตาฟในกิจกรรมนี้", userName);
                } else {
                    showModal("error", "เกิดข้อผิดพลาด", errorMsg, userName);
                }
            }
        } catch (err) {
            console.error("checkin_out error", err);
            showModal("error", "เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "ไม่ทราบชื่อ");
        } finally {
            setIsPosting(false);
        }
    }, [eventId, isPosting, findStaffName, reloadStaffList, showModal]);

    const handleScan = useCallback(async (decodedText: string) => {
        if (!eventId || isPosting) return;
        
        const now = Date.now();
        if (
            now - lastScanTimeRef.current < SCAN_COOLDOWN_MS && 
            lastScannedValueRef.current === decodedText
        ) {
            return;
        }
        
        lastScanTimeRef.current = now;
        lastScannedValueRef.current = decodedText;

        const userId = extractUserIdFromQR(decodedText);
        if (!userId) {
            showModal("error", "QR ไม่ถูกต้อง", "ไม่พบ User ID ใน QR Code", "ไม่ทราบชื่อ");
            return;
        }
        await performCheckIn(decodedText, decodedText);
    }, [eventId, isPosting, performCheckIn, showModal]);

    const handleManualSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        setManualError(null);
        const raw = manualId.trim();
        if (!raw) {
            setManualError("กรุณากรอกรหัสนักศึกษา หรือ user id");
            return;
        }
        if (!/^\d+$/.test(raw)) {
            setManualError("กรุณากรอกเป็นตัวเลขเท่านั้น");
            return;
        }
        await performCheckIn(raw, raw);
        setManualId("");
    }, [manualId, performCheckIn]);

    if (!eventId) {
        return (
            <div className="min-h-screen bg-[#f7f7f7] flex flex-col">
                <Navbar />
                <main className="flex-1 w-full">
                    <div className="max-w-5xl mx-auto px-4 py-10">
                        <h1 className="text-2xl font-bold mb-4">หน้าสแกนเช็คชื่อสตาฟ</h1>
                        <p className="text-red-600">ไม่พบ eventId ใน URL กรุณากลับไปเลือกกิจกรรมอีกครั้ง</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f7f7f7] flex flex-col">
            <Navbar />
            <main className="flex-1 w-full">
                <div className="max-w-7xl mx-auto px-4 py-6 lg:py-10 space-y-6">
                    <header className="space-y-2">
                        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">{eventTitle}</h1>
                        <p className="text-sm text-slate-600">เช็คชื่อสตาฟเข้างาน</p>
                    </header>

                    <section className="grid gap-6 lg:grid-cols-2">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 lg:p-6 flex flex-col">
                            <h2 className="font-semibold text-slate-900">สแกนเพื่อเช็คชื่อสตาฟ</h2>
                            <div className="inline-flex mt-3 mb-3 rounded-full bg-slate-100 p-1 text-xs">
                                <button type="button" onClick={() => { setMode("qr"); setScannerActive(true); }} className={`px-4 py-1.5 rounded-full font-medium ${mode === "qr" ? "bg-white shadow text-teal-600" : "text-slate-500 hover:text-slate-700"}`}>
                                    สแกน QR
                                </button>
                                <button type="button" onClick={() => { setMode("manual"); setScannerActive(false); }} className={`px-4 py-1.5 rounded-full font-medium ${mode === "manual" ? "bg-white shadow text-teal-600" : "text-slate-500 hover:text-slate-700"}`}>
                                    กรอกรหัส
                                </button>
                            </div>
                            {mode === "qr" ? (
                                <>
                                    <div className="relative bg-black rounded-2xl overflow-hidden flex items-center justify-center aspect-[4/4] sm:aspect-[4/3]">
                                        {scannerActive ? (
                                            <>
                                                <Scanner
                                                    constraints={{ facingMode: cameraFacingMode }}
                                                    onScan={(rawResult: unknown) => {
                                                        let text = "";
                                                        if (typeof rawResult === "string") {
                                                            text = rawResult;
                                                        } else if (Array.isArray(rawResult) && rawResult.length > 0) {
                                                            const first = rawResult[0] as Record<string, unknown> | undefined;
                                                            if (first && typeof first.rawValue === "string") text = first.rawValue;
                                                        } else if (rawResult && typeof rawResult === "object") {
                                                            const obj = rawResult as Record<string, unknown>;
                                                            if (typeof obj.rawValue === "string") text = obj.rawValue;
                                                        }
                                                        if (text) handleScan(text);
                                                    }}
                                                    onError={(error: unknown) => console.error("QR scanner error", error)}
                                                />
                                                <div className="absolute top-2 left-2 right-2 flex items-center justify-between text-white text-xs">
                                                    <div className="inline-flex items-center gap-2 bg-black/40 px-2 py-0.5 rounded-full">
                                                        <button type="button" onClick={() => setCameraFacingMode((m) => (m === "environment" ? "user" : "environment"))} className="inline-flex items-center gap-2 text-white px-3 py-1 rounded-full hover:bg-black/50">
                                                            <SwitchCamera className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <div className="inline-flex items-center gap-2">
                                                        <button type="button" onClick={() => setScannerActive(false)} className="bg-black/40 text-white px-3 py-1 rounded-full text-xs hover:bg-black/50">
                                                            <CameraOff className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <button type="button" onClick={() => setScannerActive(true)} className="flex flex-col items-center justify-center text-white/90">
                                                <div className="bg-black p-4 rounded-2xl shadow-lg">
                                                    <QrCode className="w-16 h-16 text-white" />
                                                </div>
                                                <span className="text-lg font-semibold mt-3 text-white">กดเพื่อเปิดกล้องสแกน QR</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                                        <span>* ระบบจะตรวจสอบช่วงเวลาเช็คอิน/เอาท์จากการตั้งค่าอีเว้นต์ให้เอง</span>
                                    </div>
                                </>
                            ) : (
                                <form onSubmit={handleManualSubmit} className="mt-2 flex flex-col gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-sm font-medium text-slate-800">กรอกรหัสนักศึกษา หรือ user id</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                                placeholder="เช่น 650612086"
                                                value={manualId}
                                                onChange={(e) => setManualId(e.target.value)}
                                            />
                                            <button type="submit" disabled={isPosting} className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-teal-500 text-white hover:bg-teal-600 disabled:opacity-60 disabled:cursor-not-allowed">
                                                ยืนยัน
                                            </button>
                                        </div>
                                        {manualError && <p className="text-xs text-red-600 mt-1">{manualError}</p>}
                                    </div>
                                    <p className="text-xs text-slate-500">* ใช้กรณีสแกน QR ไม่ได้ หรือไม่มีบัตร / QR กับตัว</p>
                                </form>
                            )}
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 lg:p-6 flex flex-col">
                            <h2 className="font-semibold text-slate-900 mb-3">ประวัติการสแกน (ล่าสุด)</h2>
                            {scanHistory.length === 0 ? (
                                <div className="flex-1 grid place-items-center text-slate-400 text-sm">
                                    <div className="flex flex-col items-center gap-2">
                                        <QrCode className="w-10 h-10" />
                                        <p>ยังไม่มีข้อมูล กรุณาสแกนบัตรหรือกรอกรหัสเพื่อเริ่ม</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
                                    {scanHistory.map((item) => (
                                        <div key={item.id} className={`rounded-xl border px-3 py-2.5 text-sm flex items-start gap-3 ${
                                            item.result === "success" 
                                                ? "border-emerald-200 bg-emerald-50" 
                                                : item.result === "warning"
                                                ? "border-amber-200 bg-amber-50"
                                                : "border-rose-200 bg-rose-50"
                                        }`}>
                                            <div className="mt-0.5">
                                                {item.result === "success" ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                ) : item.result === "warning" ? (
                                                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-rose-600" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="font-semibold text-slate-900">{item.fullName || `User ID: ${item.userId}`}</div>
                                                    <span className="text-[10px] inline-flex items-center gap-1 text-slate-500"><Clock className="w-3 h-3" />{formatTime(item.time)}</span>
                                                </div>
                                                <div className="mt-1 text-xs text-slate-600">{item.message}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 border-b font-semibold text-slate-900 flex items-center justify-between">
                            <span>รายชื่อสตาฟทั้งหมด</span>
                            <span className="text-sm font-normal text-slate-600">ทั้งหมด {staffList.length} คน</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="px-4 py-3 text-left whitespace-nowrap">ชื่อ - นามสกุล</th>
                                        <th className="px-4 py-3 text-center whitespace-nowrap">เบอร์โทร</th>
                                        <th className="px-4 py-3 text-center whitespace-nowrap">บทบาทหน้าที่</th>
                                        <th className="px-4 py-3 text-center whitespace-nowrap">เวลาเข้างาน</th>
                                        <th className="px-4 py-3 text-center whitespace-nowrap">สถานะการเข้างาน</th>
                                        <th className="px-4 py-3 text-center whitespace-nowrap">เวลาออกงาน</th>
                                        <th className="px-4 py-3 text-center whitespace-nowrap">สถานะการออกงาน</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y">
                                    {staffList.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                                                ไม่มีข้อมูลสตาฟ
                                            </td>
                                        </tr>
                                    ) : (
                                        staffList.map((s) => (
                                            <tr key={s.id}>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    {s.firstName} {s.lastName}
                                                </td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    {s.phone || "-"}
                                                </td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    {s.roleDescription_TH}
                                                </td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    {formatTime(s.checkInTime)}
                                                </td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    {s.checkedIn ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-3 py-1 text-xs">
                                                            <CheckCircle2 size={14} />
                                                            เข้างาน
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 text-slate-600 px-3 py-1 text-xs">
                                                            <Clock size={14} />
                                                            ยังไม่เช็คอิน
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    {formatTime(s.checkOutTime)}
                                                </td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    {s.checkedOut ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs">
                                                            <CheckCircle2 size={14} />
                                                            ออกงานแล้ว
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex rounded-full bg-slate-200 text-slate-600 px-3 py-1 text-xs">
                                                            ยังไม่เช็คเอาท์
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </main>

            {modalData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-modal-in">
                        <div className="flex flex-col items-center text-center">
                            <div className={`rounded-full p-4 mb-4 ${
                                modalData.type === "success"
                                    ? "bg-emerald-100"
                                    : modalData.type === "warning"
                                    ? "bg-amber-100"
                                    : "bg-rose-100"
                            }`}>
                                {modalData.type === "success" ? (
                                    <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                                ) : modalData.type === "warning" ? (
                                    <AlertTriangle className="w-12 h-12 text-amber-600" />
                                ) : (
                                    <XCircle className="w-12 h-12 text-rose-600" />
                                )}
                            </div>
                            <h3 className={`text-xl font-bold mb-2 ${
                                modalData.type === "success"
                                    ? "text-emerald-900"
                                    : modalData.type === "warning"
                                    ? "text-amber-900"
                                    : "text-rose-900"
                            }`}>
                                {modalData.title}
                            </h3>
                            <p className="text-lg font-semibold text-slate-900 mb-2">{modalData.userName}</p>
                            <p className="text-sm text-slate-600 mb-6">{modalData.message}</p>
                            <button
                                type="button"
                                onClick={closeModal}
                                className={`w-full py-3 px-6 rounded-xl font-semibold text-white transition-colors ${
                                    modalData.type === "success"
                                        ? "bg-emerald-600 hover:bg-emerald-700"
                                        : modalData.type === "warning"
                                        ? "bg-amber-600 hover:bg-amber-700"
                                        : "bg-rose-600 hover:bg-rose-700"
                                }`}
                            >
                                รับทราบ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes modal-in {
                    from {
                        transform: scale(0.9);
                        opacity: 0;
                    }
                    to {
                        transform: scale(1);
                        opacity: 1;
                    }
                }
                .animate-modal-in {
                    animation: modal-in 0.2s ease-out;
                }
            `}</style>
        </div>
    );
};

export default OrganizerStaffCheckinScannerPage;