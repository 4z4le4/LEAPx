import React from 'react';
import * as LucideIcons from 'lucide-react';

interface ErrorStateProps {
    error: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center space-y-6">
                {/* spellcheck-disable */}
                <div className="flex justify-center">
                    <div className="bg-red-100 rounded-full p-4">
                        <LucideIcons.AlertCircle className="w-12 h-12 text-red-500" />
                    </div>
                </div>
                
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">เกิดข้อผิดพลาด</h2>
                    <p className="text-gray-600 text-sm leading-relaxed">{error}</p>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                    {/* <button 
                        onClick={() => window.location.reload()}
                        className="w-full px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl hover:from-teal-600 hover:to-cyan-600 transition-all duration-300 font-medium shadow-lg hover:shadow-xl"
                    >
                        ลองใหม่อีกครั้ง
                    </button> */}
                    
                    {/* <a 
                        href="/home"
                        className="w-full px-6 py-3 bg-gray-100 text-teal-600 rounded-xl hover:bg-gray-200 transition-all duration-300 font-medium"
                    >
                        ไปที่หน้าหลัก
                    </a> */}
                </div>
                {/* spellcheck-enable */}
            </div>
        </div>
    );
};