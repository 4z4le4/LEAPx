import React, { useState } from "react";
import { Shield, Fingerprint, QrCode } from "lucide-react";
import { DefaultAvatar } from "./DefaultAvatar";
import { SecureQRCode } from "./SecureQRCode";
import type { User } from "../../../../types/user/user";

interface IDCardProps {
    user: User;
    isQRVisible: boolean;
}

export const IDCard: React.FC<IDCardProps> = ({ user, isQRVisible }) => {
    const [imageError, setImageError] = useState(false);
    const [isFlipped, setIsFlipped] = useState(false);
    const hasPhoto = user.photo && user.photo.trim() !== "";

    return (
        <div className="w-full min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-sm mt-10">
            {/* Flip Instruction */}
            <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border-2 border-teal-300">
                <Fingerprint className="w-5 h-5 text-teal-600 animate-pulse" />
                <span className="text-sm font-bold text-teal-700">
                แตะบัตรเพื่อพลิก
                </span>
            </div>
            </div>

            {/* Card Container */}
            <div
            className="relative w-full aspect-[2/3] cursor-pointer"
            style={{ perspective: "1500px" }}
            onClick={() => setIsFlipped(!isFlipped)}
            >
            <div
                className="relative w-full h-full transition-transform duration-700 ease-out"
                style={{
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
            >
                {/* FRONT SIDE */}
                <div
                className="absolute inset-0 w-full h-full"
                style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                }}
                >
                <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border-4 border-teal-500 h-full flex flex-col">
                    {/* Decorative Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-cyan-50 to-emerald-50 opacity-50">
                    <div className="absolute top-8 right-8 w-32 h-32 rounded-full border-8 border-teal-200 opacity-30"></div>
                    <div className="absolute bottom-8 left-8 w-24 h-24 rounded-full border-8 border-cyan-200 opacity-30"></div>
                    </div>

                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-teal-600 via-cyan-600 to-emerald-600 p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                            <div className="w-5 h-5 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full"></div>
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white tracking-wider drop-shadow-lg">
                            LEAPx ID
                            </h2>
                            <p className="text-white text-xs font-semibold opacity-90 truncate max-w-[150px]">
                            {user.faculty}
                            </p>
                        </div>
                        </div>
                        <div
                        className={`px-3 py-1 rounded-full font-bold text-xs shadow-lg ${
                            user.isActive
                            ? "bg-green-500 text-white"
                            : "bg-gray-400 text-white"
                        }`}
                        >
                        {user.isActive ? "ACTIVE" : "INACTIVE"}
                        </div>
                    </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 relative p-4 flex flex-col items-center justify-center overflow-y-auto">
                    {/* Photo */}
                    <div className="mb-4 flex-shrink-0">
                        <div className="relative">
                        <div className="relative w-32 h-32 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl p-1.5 shadow-xl transform hover:scale-105 transition-transform duration-300">
                            <div className="w-full h-full bg-white rounded-xl overflow-hidden border-2 border-white shadow-inner">
                            {hasPhoto && !imageError ? (
                                <img
                                src={user.photo}
                                alt={`${user.firstName} ${user.lastName}`}
                                className="w-full h-full object-cover"
                                onError={() => setImageError(true)}
                                />
                            ) : (
                                <DefaultAvatar name={user.firstName} />
                            )}
                            </div>
                        </div>
                        {/* Verified Badge */}
                        <div className="absolute -bottom-2 -right-2 bg-teal-600 rounded-full p-1.5 shadow-lg border-2 border-white">
                            <Shield className="w-4 h-4 text-white" />
                        </div>
                        </div>
                    </div>

                    {/* Info Cards */}
                    <div className="w-full space-y-2 flex-shrink-0">
                        {/* Name */}
                        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-3 shadow-md border border-teal-200">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center">
                            <svg
                                className="w-3.5 h-3.5 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                            </svg>
                            </div>
                            <span className="text-xs font-bold text-teal-700 uppercase">
                            ชื่อ-นามสกุล
                            </span>
                        </div>
                        <p className="text-base font-bold text-gray-900 tracking-wide truncate">
                            {user.firstName} {user.lastName}
                        </p>
                        </div>

                        {/* ID */}
                        <div className="bg-gradient-to-r from-cyan-50 to-emerald-50 rounded-xl p-3 shadow-md border border-cyan-200">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-lg flex items-center justify-center">
                            <svg
                                className="w-3.5 h-3.5 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                                />
                            </svg>
                            </div>
                            <span className="text-xs font-bold text-cyan-700 uppercase">
                            รหัสประจำตัว
                            </span>
                        </div>
                        <p className="text-xl font-black text-cyan-600 tracking-widest">
                            {user.id.toString().padStart(8, "0")}
                        </p>
                        </div>

                        {/* Email */}
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-3 shadow-md border border-emerald-200">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                            <svg
                                className="w-3.5 h-3.5 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                />
                            </svg>
                            </div>
                            <span className="text-xs font-bold text-emerald-700 uppercase">
                            อีเมล
                            </span>
                        </div>
                        <p className="text-xs font-semibold text-gray-700 break-all truncate">
                            {user.email}
                        </p>
                        </div>

                        {/* Major */}
                        {user.major && (
                        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-3 shadow-md border border-teal-200">
                            <div className="flex items-center gap-2 mb-1">
                            <div className="w-6 h-6 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center">
                                <svg
                                className="w-3.5 h-3.5 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                />
                                </svg>
                            </div>
                            <span className="text-xs font-bold text-teal-700 uppercase">
                                สาขาวิชา
                            </span>
                            </div>
                            <p className="text-xs font-semibold text-gray-700 truncate">
                            {user.major}
                            </p>
                        </div>
                        )}
                    </div>
                    </div>
                </div>
                </div>

                {/* BACK SIDE */}
                <div
                className="absolute inset-0 w-full h-full"
                style={{
                    backfaceVisibility: "hidden",
                    WebkitBackfaceVisibility: "hidden",
                    transform: "rotateY(180deg)",
                }}
                >
                <div className="relative bg-gradient-to-br from-teal-600 via-cyan-600 to-emerald-600 rounded-3xl shadow-2xl overflow-hidden border-4 border-teal-500 h-full flex flex-col">
                    {/* Decorative Background */}
                    <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-8 right-8 w-32 h-32 rounded-full border-8 border-white"></div>
                    <div className="absolute bottom-8 left-8 w-24 h-24 rounded-full border-8 border-white"></div>
                    </div>

                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-teal-700 via-cyan-700 to-emerald-700 p-4">
                    <div className="flex items-center justify-center gap-2">
                        <QrCode className="w-8 h-8 text-white" />
                        <h2 className="text-lg font-black text-white tracking-wider drop-shadow-lg">
                        SECURE QR
                        </h2>
                    </div>
                    </div>

                    {/* QR Content */}
                    <div className="flex-1 relative flex flex-col items-center justify-center p-4">
                    <div className="bg-white backdrop-blur-sm rounded-2xl p-4 shadow-2xl w-full max-w-xs">
                        <div className="mb-3 text-center">
                        <h3 className="text-sm font-black text-teal-700 mb-1">
                            สแกนเพื่อยืนยันตัวตน
                        </h3>
                        <p className="text-xs text-gray-600">
                            อัปเดตอัตโนมัติทุก 60 วินาที
                        </p>
                        </div>

                        <SecureQRCode userId={user.id} isVisible={isQRVisible} />

                        <div className="mt-3 pt-3 border-t-2 border-teal-200 text-center">
                        <p className="text-xs font-bold text-gray-700">
                            รหัส:{" "}
                            <span className="text-teal-600 text-base font-black">
                            {user.id.toString().padStart(8, "0")}
                            </span>
                        </p>
                        </div>
                    </div>
                    </div>
                </div>
                </div>
            </div>
            </div>
        </div>
        </div>
    );
};
