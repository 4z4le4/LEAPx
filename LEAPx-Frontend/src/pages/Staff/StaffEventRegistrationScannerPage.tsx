import React, { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import useSWR from "swr";
import { QrCode, CheckCircle2, XCircle, Clock, CameraOff, AlertTriangle, Flashlight, SwitchCamera } from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";
import Navbar from "../../components/Navbar/Navbar";

const API_BASE = import.meta.env.VITE_LEAP_BACKEND_URL || "";
const CHECKIN_ENDPOINT = `${API_BASE}/api/events/checkin_out/user`;
const PARTICIPANTS_ENDPOINT = (eventId: number | string) =>
    `${API_BASE}/api/staff/events/${eventId}`;

const SCAN_COOLDOWN_MS = 3000;
const MODAL_AUTO_CLOSE_MS = 3000;

type CheckInAction = "checkin" | "checkout";

type ApiParticipant = {
    id: number;
    userId: number;
    firstName: string;
    lastName: string;
    phone?: string | null;
    checkedIn: boolean;
    checkInTime?: string | null;
    checkedOut: boolean;
    checkOutTime?: string | null;
    status: string;
};

type ParticipantsResponse = {
    success: boolean;
    data: ApiParticipant[];
};

type ScanHistoryItem = {
    id: string;
    userId?: number;
    raw: string;
    fullName?: string;
    action: CheckInAction;
    result: "success" | "error" | "warning";
    message: string;
    time: string;
    isLate?: boolean;
    isDuplicate?: boolean;
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

const StaffEventRegistrationScannerPage: React.FC = () => {
    const { eventId: eventIdParam } = useParams<{ eventId: string }>();
    const location = useLocation();
    const eventTitle = (location.state as { eventTitle?: string })?.eventTitle || "กิจกรรม";
    const eventId = useMemo(() => {
        const parsed = Number(eventIdParam);
        return isNaN(parsed) ? null : parsed;
    }, [eventIdParam]);

    const [scannerActive, setScannerActive] = useState(true);
    const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
    const [isPosting, setIsPosting] = useState(false);
    const [mode, setMode] = useState<"qr" | "manual">("qr");
    const [manualId, setManualId] = useState("");
    const [manualError, setManualError] = useState<string | null>(null);
    const [cameraFacingMode, setCameraFacingMode] = useState<"environment" | "user">("environment");
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
    const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
    const [torchSupported, setTorchSupported] = useState<boolean>(false);
    const [modalData, setModalData] = useState<ModalData | null>(null);
    const [autoCloseModal, setAutoCloseModal] = useState(true);
    const [countdown, setCountdown] = useState<number>(0);
    const [scannerKey, setScannerKey] = useState<number>(0);

    const lastScanTimeRef = useRef<number>(0);
    const lastScannedValueRef = useRef<string>("");
    const modalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pendingRequestsRef = useRef<Set<string>>(new Set());
    const torchStreamRef = useRef<MediaStream | null>(null);
    const torchCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { data: participantsRes, mutate: reloadParticipants } = useSWR<ParticipantsResponse>(
        eventId ? PARTICIPANTS_ENDPOINT(eventId) : null,
        fetcher
    );

    const participants = useMemo(() => participantsRes?.data ?? [], [participantsRes?.data]);

    const findParticipantName = useCallback((userId?: number) => {
        const participant = participants.find((x) => x.userId === userId);
        return participant ? `${participant.firstName} ${participant.lastName}` : undefined;
    }, [participants]);

    const closeModal = useCallback(() => {
        if (modalTimerRef.current) {
            clearTimeout(modalTimerRef.current);
            modalTimerRef.current = null;
        }
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
        setModalData(null);
        setCountdown(0);
        if (mode === "qr") {
            setScannerActive(true);
        }
    }, [mode]);

    const showModal = useCallback((type: "success" | "error" | "warning", title: string, message: string, userName: string) => {
        if (modalTimerRef.current) {
            clearTimeout(modalTimerRef.current);
            modalTimerRef.current = null;
        }
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }

        setModalData({ type, title, message, userName });

        if (autoCloseModal && (type === "success" || type === "warning")) {
            const totalSeconds = Math.ceil(MODAL_AUTO_CLOSE_MS / 1000);
            setCountdown(totalSeconds);

            countdownIntervalRef.current = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        if (countdownIntervalRef.current) {
                            clearInterval(countdownIntervalRef.current);
                            countdownIntervalRef.current = null;
                        }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            modalTimerRef.current = setTimeout(() => {
                closeModal();
            }, MODAL_AUTO_CLOSE_MS);
        } else {
            setCountdown(0);
        }
    }, [autoCloseModal, closeModal]);

    useEffect(() => {
        return () => {
            if (modalTimerRef.current) clearTimeout(modalTimerRef.current);
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            if (torchStreamRef.current) {
                torchStreamRef.current.getTracks().forEach(t => t.stop());
                torchStreamRef.current = null;
            }
            if (torchCheckTimerRef.current) clearTimeout(torchCheckTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (!scannerActive || mode !== "qr") return;

        const getDevices = async () => {
            try {
                const mediaDevices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = mediaDevices.filter(d => d.kind === "videoinput");
                setDevices(videoDevices);
            } catch (error) {
                console.error("Error getting devices:", error);
            }
        };

        getDevices();
    }, [scannerActive, mode]);

    useEffect(() => {
        if (!scannerActive || mode !== "qr") return;
        if (torchCheckTimerRef.current) {
            clearTimeout(torchCheckTimerRef.current);
            torchCheckTimerRef.current = null;
        }

        torchCheckTimerRef.current = setTimeout(async () => {
            let tempStream: MediaStream | null = null;
            try {
                const constraints: MediaStreamConstraints = {
                    video: selectedDeviceId
                        ? { deviceId: { exact: selectedDeviceId } }
                        : { facingMode: cameraFacingMode }
                };
                tempStream = await navigator.mediaDevices.getUserMedia(constraints);
                const track = tempStream.getVideoTracks()[0];
                const caps = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
                if (caps && typeof caps.torch !== "undefined") {
                    setTorchSupported(true);
                } else {
                    setTorchSupported(false);
                    setTorchEnabled(false);
                }
            } catch {
                setTorchSupported(false);
                setTorchEnabled(false);
            } finally {
                tempStream?.getTracks().forEach(t => t.stop());
            }
        }, 800);

        return () => {
            if (torchCheckTimerRef.current) {
                clearTimeout(torchCheckTimerRef.current);
                torchCheckTimerRef.current = null;
            }
        };
    }, [scannerActive, mode, selectedDeviceId, cameraFacingMode]);

    const toggleTorch = useCallback(async () => {
        try {
            if (torchEnabled && torchStreamRef.current) {
                torchStreamRef.current.getTracks().forEach(t => t.stop());
                torchStreamRef.current = null;
                setTorchEnabled(false);
                return;
            }

            const constraints: MediaStreamConstraints = {
                video: {
                    ...(selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : { facingMode: cameraFacingMode }),
                    advanced: [{ torch: true } as MediaTrackConstraintSet],
                }
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            torchStreamRef.current = stream;
            setTorchEnabled(true);
        } catch (error) {
            console.error("Error toggling torch:", error);
        }
    }, [torchEnabled, selectedDeviceId, cameraFacingMode]);

    const handleSwitchCamera = useCallback(() => {
        if (torchStreamRef.current) {
            torchStreamRef.current.getTracks().forEach(t => t.stop());
            torchStreamRef.current = null;
            setTorchEnabled(false);
        }
        setTorchSupported(false);
        setSelectedDeviceId("");
        setCameraFacingMode(prev => (prev === "environment" ? "user" : "environment"));
        setScannerKey(prev => prev + 1);
    }, []);

    const handleDeviceChange = useCallback((deviceId: string) => {
        if (torchStreamRef.current) {
            torchStreamRef.current.getTracks().forEach(t => t.stop());
            torchStreamRef.current = null;
            setTorchEnabled(false);
        }
        setTorchSupported(false);
        setSelectedDeviceId(deviceId);
        setScannerKey(prev => prev + 1);
    }, []);

    const performCheckIn = useCallback(async (rawQrOrUserId: string, rawLabel: string) => {
        if (!eventId || isPosting) return;

        const isPlainUserId = /^\d+$/.test(rawQrOrUserId);
        const requestKey = `${eventId}-${rawQrOrUserId}`;

        if (pendingRequestsRef.current.has(requestKey)) {
            console.log("Duplicate request blocked:", requestKey);
            return;
        }

        if (mode === "qr") {
            setScannerActive(false);
        }

        pendingRequestsRef.current.add(requestKey);
        setIsPosting(true);
        const nowIso = new Date().toISOString();

        try {
            const payload = isPlainUserId
                ? { eventId: Number(eventId), userId: Number(rawQrOrUserId) }
                : { eventId: Number(eventId), qrCode: rawQrOrUserId };

            const res = await fetch(CHECKIN_ENDPOINT, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            const action = json?.action || "checkin";
            const success = res.ok && json.success;

            const userId = json?.data?.userId || json?.userId || json?.data?.registration?.user_id || (isPlainUserId ? Number(rawQrOrUserId) : undefined);
            const participantName = findParticipantName(userId);
            const userName = participantName || (userId ? `ID: ${userId}` : "ผู้ใช้");

            if (success) {
                const isLate = json?.data?.isLate || false;
                const recentSimilar = scanHistory.find(
                    item => item.userId === userId && item.action === action && (Date.now() - new Date(item.time).getTime()) < 10000
                );

                if (action === "checkin") {
                    showModal(
                        isLate ? "warning" : "success",
                        isLate ? "เช็คอินสำเร็จ (มาสาย)" : "เช็คอินสำเร็จ",
                        isLate ? "เช็คอินเรียบร้อยแล้ว แต่มาสายจากเวลาที่กำหนด" : "บันทึกเวลาเข้างานเรียบร้อยแล้ว",
                        userName
                    );
                } else {
                    showModal("success", "เช็คเอาท์สำเร็จ", "บันทึกเวลาออกจากงานเรียบร้อยแล้ว", userName);
                }

                const historyItem: ScanHistoryItem = {
                    id: `${Date.now()}-${Math.random()}`,
                    raw: rawLabel,
                    userId,
                    fullName: participantName,
                    action,
                    result: isLate ? "warning" : "success",
                    message: json?.message || (action === "checkout" ? "เช็คเอาท์สำเร็จ" : "เช็คอินสำเร็จ"),
                    time: json.data?.checkOutTime || json.data?.checkInTime || nowIso,
                    isLate,
                    isDuplicate: !!recentSimilar,
                };

                setScanHistory(prev => [historyItem, ...prev].slice(0, 20));
                reloadParticipants();
            } else {
                const errorMsg = json?.error || json?.message || "เช็คอิน/เช็คเอาท์ไม่สำเร็จ";
                const errorHistoryItem: ScanHistoryItem = {
                    id: `${Date.now()}-${Math.random()}`,
                    raw: rawLabel,
                    userId,
                    fullName: participantName,
                    action: "checkin",
                    result: "error",
                    message: errorMsg,
                    time: nowIso,
                };
                setScanHistory(prev => [errorHistoryItem, ...prev].slice(0, 20));

                if (errorMsg.includes("Invalid or expired QR code")) {
                    showModal("error", "QR Code ไม่ถูกต้อง", "QR Code หมดอายุหรือไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง", userName);
                } else if (errorMsg.includes("Event not found")) {
                    showModal("error", "ไม่พบกิจกรรม", "ไม่พบกิจกรรมนี้ในระบบ", userName);
                } else if (errorMsg.includes("Event is not available for check-in/check-out")) {
                    showModal("error", "กิจกรรมไม่พร้อมใช้งาน", "กิจกรรมนี้ยังไม่เปิดให้เช็คชื่อ กรุณาติดต่อผู้ดูแลระบบ", userName);
                } else if (errorMsg.includes("not registered")) {
                    showModal("error", "ไม่พบการลงทะเบียน", "ไม่ได้ลงทะเบียนในกิจกรรมนี้", userName);
                } else if (errorMsg.includes("Cannot check-in/check-out with registration status")) {
                    showModal("error", "สถานะไม่อนุญาต", "ไม่สามารถเช็คชื่อได้ เนื่องจากสถานะการลงทะเบียนไม่ถูกต้อง", userName);
                } else if (errorMsg.includes("No active check-in/out slot at this time")) {
                    showModal("warning", "ไม่อยู่ในช่วงเวลาเช็คชื่อ", "ขณะนี้ยังไม่ถึงเวลาเช็คชื่อ หรือเวลาเช็คชื่อผ่านไปแล้ว", userName);
                } else if (errorMsg.includes("Already checked in for this slot")) {
                    showModal("warning", "เช็คอินแล้ว", "เช็คอินไปแล้วในช่วงเวลานี้ กรุณารอจนกว่าช่วงเวลาจะสิ้นสุดเพื่อเช็คเอาท์", userName);
                } else if (errorMsg.includes("already checked in")) {
                    showModal("warning", "เช็คอินแล้ว", "เช็คอินไปแล้ว", userName);
                } else if (errorMsg.includes("Already completed check-in and check-out")) {
                    showModal("warning", "เสร็จสิ้นแล้ว", "ทำเสร็จแล้วทั้งเช็คอินและเช็คเอาท์", userName);
                } else if (errorMsg.includes("Already checked out from this slot")) {
                    showModal("warning", "เช็คเอาท์แล้ว", "เช็คเอาท์จากช่วงเวลานี้ไปแล้ว", userName);
                } else if (errorMsg.includes("Check-in time has not started yet")) {
                    showModal("warning", "ยังไม่ถึงเวลา", "ยังไม่ถึงเวลาเช็คอินสำหรับช่วงเวลานี้", userName);
                } else if (errorMsg.includes("No active check-out slot")) {
                    showModal("warning", "ไม่อยู่ในช่วงเวลาเช็คเอาท์", "ขณะนี้ยังไม่ถึงเวลาเช็คเอาท์", userName);
                } else if (errorMsg.includes("must check in")) {
                    showModal("error", "ยังไม่ได้เช็คอิน", "กรุณาเช็คอินก่อนเช็คเอาท์", userName);
                } else if (errorMsg.includes("already checked out")) {
                    showModal("warning", "เช็คเอาท์แล้ว", "เช็คเอาท์ไปแล้ว", userName);
                } else if (errorMsg.includes("wait until event ends")) {
                    showModal("warning", "ยังไม่ถึงเวลา", "กรุณารอจนกว่ากิจกรรมจะสิ้นสุดเพื่อเช็คเอาท์", userName);
                } else if (errorMsg.includes("Registration not found")) {
                    showModal("error", "ไม่พบการลงทะเบียน", "ไม่พบข้อมูลการลงทะเบียนในระบบ", userName);
                } else {
                    showModal("error", "เกิดข้อผิดพลาด", errorMsg, userName);
                }
            }
        } catch (err) {
            console.error("checkin_out error", err);
            showModal("error", "เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "ผู้ใช้");
            const errorHistoryItem: ScanHistoryItem = {
                id: `${Date.now()}-${Math.random()}`,
                raw: rawLabel,
                userId: undefined,
                fullName: undefined,
                action: "checkin",
                result: "error",
                message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้",
                time: nowIso,
            };
            setScanHistory(prev => [errorHistoryItem, ...prev].slice(0, 20));
        } finally {
            setTimeout(() => {
                pendingRequestsRef.current.delete(requestKey);
                setIsPosting(false);
            }, 1000);
        }
    }, [eventId, isPosting, mode, findParticipantName, reloadParticipants, showModal, scanHistory]);

    const handleScan = useCallback(async (decodedText: string) => {
        if (!eventId || isPosting) return;
        const now = Date.now();
        if (now - lastScanTimeRef.current < SCAN_COOLDOWN_MS && lastScannedValueRef.current === decodedText) {
            return;
        }
        lastScanTimeRef.current = now;
        lastScannedValueRef.current = decodedText;
        await performCheckIn(decodedText, decodedText);
    }, [eventId, isPosting, performCheckIn]);

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

    const scannerConstraints: MediaTrackConstraints = useMemo(() => {
        if (selectedDeviceId) return { deviceId: { exact: selectedDeviceId } };
        return { facingMode: cameraFacingMode };
    }, [selectedDeviceId, cameraFacingMode]);

    if (!eventId) {
        return (
            <div className="min-h-screen bg-[#f7f7f7] flex flex-col">
                <Navbar />
                <main className="flex-1 w-full">
                    <div className="max-w-5xl mx-auto px-4 py-10">
                        <h1 className="text-2xl font-bold mb-4">หน้าสแกนเช็คชื่อ</h1>
                        <p className="text-red-600">ไม่พบ eventId ใน URL กรุณากลับไปเลือกกิจกรรมจากหน้าสตาฟอีกครั้ง</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f7f7f7] flex flex-col">
            <Navbar />
            <main className="flex-1 w-full">
                <div className="max-w-6xl mx-auto px-4 py-6 lg:py-10 space-y-6">
                    <header className="space-y-2">
                        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">{eventTitle}</h1>
                    </header>
                    <section className="grid gap-6 lg:grid-cols-2">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 lg:p-6 flex flex-col">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="font-semibold text-slate-900">เช็คชื่อเข้างาน</h2>
                                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={autoCloseModal}
                                        onChange={(e) => setAutoCloseModal(e.target.checked)}
                                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    <span>ปิดอัตโนมัติ</span>
                                </label>
                            </div>
                            <div className="inline-flex mt-3 mb-3 rounded-full bg-slate-100 p-1 text-xs">
                                <button
                                    type="button"
                                    onClick={() => { setMode("qr"); setScannerActive(true); }}
                                    className={`px-4 py-1.5 rounded-full font-medium ${mode === "qr" ? "bg-white shadow text-teal-600" : "text-slate-500 hover:text-slate-700"}`}
                                >
                                    สแกน QR
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setMode("manual"); setScannerActive(false); }}
                                    className={`px-4 py-1.5 rounded-full font-medium ${mode === "manual" ? "bg-white shadow text-teal-600" : "text-slate-500 hover:text-slate-700"}`}
                                >
                                    กรอกรหัส
                                </button>
                            </div>
                            {mode === "qr" ? (
                                <>
                                    <div className="relative bg-black rounded-2xl overflow-hidden flex items-center justify-center aspect-[4/4] sm:aspect-[4/3]">
                                        {scannerActive ? (
                                            <>
                                                <Scanner
                                                    key={scannerKey}
                                                    constraints={scannerConstraints}
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
                                                <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                                                    <button
                                                        type="button"
                                                        onClick={handleSwitchCamera}
                                                        className="bg-black/40 text-white p-2 rounded-full hover:bg-black/60 transition-colors"
                                                    >
                                                        <SwitchCamera className="w-4 h-4" />
                                                    </button>
                                                    <div className="flex items-center gap-2">
                                                        {torchSupported && (
                                                            <button
                                                                type="button"
                                                                onClick={toggleTorch}
                                                                className={`${torchEnabled ? "bg-yellow-500/80" : "bg-black/40"} text-white p-2 rounded-full hover:bg-black/70 transition-colors`}
                                                            >
                                                                <Flashlight className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => setScannerActive(false)}
                                                            className="bg-black/40 text-white p-2 rounded-full hover:bg-black/50 transition-colors"
                                                        >
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

                                    {devices.length > 1 && (
                                        <div className="mt-3">
                                            <select
                                                value={selectedDeviceId}
                                                onChange={(e) => handleDeviceChange(e.target.value)}
                                                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                            >
                                                {devices.map((device, index) => (
                                                    <option key={device.deviceId} value={device.deviceId}>
                                                        {device.label || `กล้อง ${index + 1}`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                                        <span>* ระบบจะตรวจสอบช่วงเวลาเช็คอิน/เอาท์จากการตั้งค่าอีเว้นต์ให้เอง</span>
                                    </div>
                                </>
                            ) : (
                                <form onSubmit={handleManualSubmit} className="mt-2 flex flex-col gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-sm font-medium text-slate-800">กรอกรหัสนักศึกษา หรือ user id เพื่อเช็คอิน/เช็คเอาท์</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                                placeholder="เช่น 650612077"
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
                            <h2 className="font-semibold text-slate-900 mb-3">ประวัติการสแกน (ล่าสุด {scanHistory.length} รายการ)</h2>
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
                                        <div
                                            key={item.id}
                                            className={`rounded-xl border px-3 py-2.5 text-sm flex items-start gap-3 ${
                                                item.result === "success"
                                                    ? "border-emerald-200 bg-emerald-50"
                                                    : item.result === "warning"
                                                    ? "border-amber-200 bg-amber-50"
                                                    : "border-rose-200 bg-rose-50"
                                            } ${item.isDuplicate ? "opacity-60" : ""}`}
                                        >
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
                                                    <div className="font-semibold text-slate-900 flex items-center gap-2">
                                                        <span>{item.fullName || `ID: ${item.userId || "-"}`}</span>
                                                        {item.isDuplicate && (
                                                            <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">ซ้ำ</span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] inline-flex items-center gap-1 text-slate-500">
                                                        <Clock className="w-3 h-3" />
                                                        {formatTime(item.time)}
                                                    </span>
                                                </div>
                                                <div className="mt-1 text-xs text-slate-600 flex items-center gap-2">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${
                                                            item.action === "checkin"
                                                                ? item.isLate
                                                                    ? "bg-amber-100 text-amber-700"
                                                                    : "bg-teal-100 text-teal-700"
                                                                : "bg-blue-100 text-blue-700"
                                                        }`}
                                                    >
                                                        {item.action === "checkin" ? (item.isLate ? "เช็คอิน (สาย)" : "เช็คอิน") : "เช็คเอาท์"}
                                                    </span>
                                                    {item.result === "error" && (
                                                        <span className="text-[10px] text-rose-600">{item.message}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>

            {modalData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-modal-in">
                        <div className="flex flex-col items-center text-center">
                            <div
                                className={`rounded-full p-4 mb-4 ${
                                    modalData.type === "success" ? "bg-emerald-100" : modalData.type === "warning" ? "bg-amber-100" : "bg-rose-100"
                                }`}
                            >
                                {modalData.type === "success" ? (
                                    <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                                ) : modalData.type === "warning" ? (
                                    <AlertTriangle className="w-12 h-12 text-amber-600" />
                                ) : (
                                    <XCircle className="w-12 h-12 text-rose-600" />
                                )}
                            </div>
                            <h3
                                className={`text-xl font-bold mb-2 ${
                                    modalData.type === "success" ? "text-emerald-900" : modalData.type === "warning" ? "text-amber-900" : "text-rose-900"
                                }`}
                            >
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
                                {countdown > 0 ? `รับทราบ (${countdown})` : "รับทราบ"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes modal-in {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-modal-in { animation: modal-in 0.2s ease-out; }
            `}</style>
        </div>
    );
};

export default StaffEventRegistrationScannerPage;