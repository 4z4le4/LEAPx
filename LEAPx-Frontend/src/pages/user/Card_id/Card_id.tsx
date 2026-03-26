import React, { useState, useEffect } from 'react';
import { useFetchUser } from '../hooks/useFetchUser';
import { useScreenshotProtection } from '../hooks/useScreenshotProtection';
import { IDCard } from '../components/IDCard';
import { ErrorState } from '../components/ErrorState';
import Navbar from '../../../components/Navbar/Navbar';
import PrimaryFooter from '../../../components/Footer/PrimaryFooter';
import Loader from '../../../components/Loader/Loader';
import { useAuth } from '../../../context/AuthContext';
import { Calendar, MapPin, Clock, CheckCircle2, CheckCircle } from 'lucide-react';
import { backend_url } from '../../../../utils/constants';

const CURRENT_EVENT_ENDPOINT = `${backend_url}/api/user/current-event`;
const POLLING_INTERVAL = 5000;

interface CheckInSlot {
    slotId: number;
    slotNumber: number;
    checkInTime: string;
    startTime: string;
    endTime: string;
    checkedOut: boolean;
    checkOutTime: string | null;
}

interface CurrentEvent {
    registrationId: number;
    eventId: number;
    eventTitle_TH: string;
    eventTitle_EN: string;
    description_TH: string;
    description_EN: string;
    location_TH: string;
    location_EN: string;
    isOnline: boolean;
    meetingLink: string | null;
    activityStart: string;
    activityEnd: string;
    registrationStatus: string;
    checkInTime: string;
    allowMultipleCheckIns: boolean;
    checkInSlots: CheckInSlot[];
    currentCheckInSlot: CheckInSlot | null;
}

interface CurrentEventResponse {
    success: boolean;
    message: string;
    data: CurrentEvent | null;
}

export const Card_id: React.FC = () => {
    const { userData, loading, error } = useFetchUser();
    const [isQRVisible, setIsQRVisible] = useState<boolean>(true);
    const { isAuthenticated } = useAuth();
    
    const [currentEvent, setCurrentEvent] = useState<CurrentEvent | null>(null);
    const [isLoadingEvent, setIsLoadingEvent] = useState(true);
    const [eventError, setEventError] = useState<string | null>(null);

    useScreenshotProtection(setIsQRVisible);

    const fetchCurrentEvent = async () => {
        try {
            const response = await fetch(CURRENT_EVENT_ENDPOINT, {
                credentials: 'include'
            });
            const data: CurrentEventResponse = await response.json();
            
            if (data.success && data.data) {
                setCurrentEvent(data.data);
                setEventError(null);
            } else {
                setCurrentEvent(null);
            }
        } catch (err) {
            console.error('Error fetching current event:', err);
            setEventError('ไม่สามารถโหลดข้อมูลกิจกรรมได้');
        } finally {
            setIsLoadingEvent(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchCurrentEvent();

            const intervalId = setInterval(() => {
                if (!currentEvent) {
                    fetchCurrentEvent();
                }
            }, POLLING_INTERVAL);

            return () => clearInterval(intervalId);
        }
    }, [isAuthenticated, currentEvent]);

    if (loading) {
        return <Loader />;
    }

    if (!isAuthenticated) {
        return (
            <>
                <Navbar />
                <ErrorState error="คุณต้องเข้าสู่ระบบเพื่อดูหน้านี้" />
                <PrimaryFooter />
            </>
        );
    }

    if (error || !userData) {
        return (
            <>
                <Navbar />
                <ErrorState error={error || 'Unable to load data'} />
                <PrimaryFooter />
            </>
        );
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('th-TH', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('th-TH', { 
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50 relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-teal-300/30 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
                <div className="absolute top-40 right-10 w-72 h-72 bg-cyan-300/30 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-emerald-300/30 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>

                <div className="absolute inset-0" style={{
                    backgroundImage: `linear-gradient(rgba(20, 184, 166, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(20, 184, 166, 0.03) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px'
                }}></div>
                
                <div className="absolute top-1/4 right-1/4 w-4 h-4 bg-teal-400 rounded-full opacity-30 animate-ping"></div>
                <div className="absolute top-3/4 left-1/3 w-3 h-3 bg-cyan-400 rounded-full opacity-30 animate-ping animation-delay-1000"></div>
                <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-emerald-400 rounded-full opacity-30 animate-ping animation-delay-2000"></div>
            </div>

            {!isLoadingEvent && currentEvent && (
                <div className="max-w-md mx-auto px-4 mt-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                        <p className="text-sm text-yellow-700 text-center">
                            เลื่อนลงเพื่อดูข้อมูลกิจกรรมที่กำลังเข้าร่วมอยู่
                        </p>
                    </div>
                </div>
            )}

            <div className="relative z-10 pb-8 -mt-20">
                
                <IDCard user={userData} isQRVisible={isQRVisible} />
                {!isLoadingEvent && currentEvent && (
                    <div className="max-w-md mx-auto px-4 mb-9 -mt-16">
                        <div className="bg-white rounded-2xl shadow-xl border-2 border-emerald-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                                        <CheckCircle2 className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-white/90 text-sm font-medium">
                                            กำลังเข้าร่วมกิจกรรม
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                            <p className="text-white text-xs">
                                                {currentEvent.registrationStatus === 'LATE' ? 'สถานะ: มาสาย' : 'สถานะ: ปกติ'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 space-y-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 leading-tight">
                                        {currentEvent.eventTitle_TH}
                                    </h3>
                                    <p className="text-sm text-slate-600 mt-1">
                                        {currentEvent.eventTitle_EN}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="text-sm text-slate-700">
                                                {currentEvent.location_TH}
                                            </p>
                                            {currentEvent.isOnline && currentEvent.meetingLink && (
                                                <a 
                                                    href={currentEvent.meetingLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-teal-600 hover:text-teal-700 mt-1 inline-block"
                                                >
                                                    เข้าร่วมออนไลน์ →
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-5 h-5 text-emerald-600 shrink-0" />
                                        <p className="text-sm text-slate-700">
                                            {formatDate(currentEvent.activityStart)}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Clock className="w-5 h-5 text-emerald-600 shrink-0" />
                                        <p className="text-sm text-slate-700">
                                            {formatTime(currentEvent.activityStart)} - {formatTime(currentEvent.activityEnd)}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-200">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-600">เวลาเช็คอิน</span>
                                        <span className="text-sm font-semibold text-emerald-600">
                                            {formatTime(currentEvent.checkInTime)}
                                        </span>
                                    </div>
                                    
                                    {currentEvent.allowMultipleCheckIns && currentEvent.checkInSlots && currentEvent.checkInSlots.length > 0 && (
                                        <div className="mt-3 space-y-2">
                                            <p className="text-xs text-slate-600 font-medium">
                                                ช่วงที่เช็คอินแล้ว ({currentEvent.checkInSlots.length} ช่วง)
                                            </p>
                                            {currentEvent.checkInSlots.map((slot) => (
                                                <div 
                                                    key={slot.slotId}
                                                    className={`flex items-center justify-between p-2.5 rounded-lg border ${
                                                        currentEvent.currentCheckInSlot?.slotId === slot.slotId
                                                            ? 'bg-emerald-50 border-emerald-300'
                                                            : 'bg-slate-50 border-slate-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                                            currentEvent.currentCheckInSlot?.slotId === slot.slotId
                                                                ? 'bg-emerald-200 text-emerald-800'
                                                                : 'bg-slate-200 text-slate-600'
                                                        }`}>
                                                            {slot.slotNumber}
                                                        </span>
                                                        <div>
                                                            <p className="text-xs font-medium text-slate-700">
                                                                {formatTime(slot.checkInTime)}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {currentEvent.currentCheckInSlot?.slotId === slot.slotId ? (
                                                        <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                                                            ปัจจุบัน
                                                        </span>
                                                    ) : (
                                                        <CheckCircle className="w-4 h-4 text-slate-400" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-3">
                                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
                                        currentEvent.registrationStatus === 'LATE'
                                            ? 'bg-amber-100 text-amber-700'
                                            : 'bg-emerald-100 text-emerald-700'
                                    }`}>
                                        <div className="w-2 h-2 rounded-full bg-current animate-pulse"></div>
                                        <span>กำลังเข้าร่วมอยู่</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {isLoadingEvent && (
                    <div className="max-w-md mx-auto px-4 mt-6">
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
                            <div className="flex items-center justify-center gap-3">
                                <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-sm text-slate-600">กำลังตรวจสอบกิจกรรม...</p>
                            </div>
                        </div>
                    </div>
                )}

                {eventError && !currentEvent && (
                    <div className="max-w-md mx-auto px-4 mt-6">
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                            <p className="text-sm text-red-700 text-center">{eventError}</p>
                        </div>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes blob {
                    0%, 100% {
                        transform: translate(0px, 0px) scale(1);
                    }
                    33% {
                        transform: translate(30px, -50px) scale(1.1);
                    }
                    66% {
                        transform: translate(-20px, 20px) scale(0.9);
                    }
                }
                
                .animate-blob {
                    animation: blob 7s infinite;
                }
                
                .animation-delay-1000 {
                    animation-delay: 1s;
                }
                
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
            `}} />
        </div>
        <PrimaryFooter />
        </>
    );
};