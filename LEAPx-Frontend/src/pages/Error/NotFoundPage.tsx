export default function NotFoundPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-100 flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-10 left-16 w-20 h-20 bg-cyan-200 rounded-full opacity-30 animate-[float_6s_ease-in-out_infinite]"></div>
                <div className="absolute top-32 right-20 w-16 h-16 bg-teal-200 rounded-full opacity-25 animate-[float_8s_ease-in-out_infinite_-2s]"></div>
                <div className="absolute bottom-20 left-20 w-24 h-24 bg-emerald-200 rounded-full opacity-20 animate-[float_7s_ease-in-out_infinite_-4s]"></div>
                <div className="absolute top-1/2 right-10 w-12 h-12 bg-cyan-300 rotate-45 opacity-30 animate-[spin_12s_linear_infinite]"></div>
                <div className="absolute bottom-40 right-1/3 w-14 h-14 bg-teal-300 rounded-full opacity-25 animate-[bounce_3s_ease-in-out_infinite]"></div>
                <div className="absolute top-20 right-1/4 w-8 h-8 opacity-20">
                    <div className="relative">
                        <div className="absolute w-8 h-6 bg-cyan-400 rounded-t-full transform rotate-45 origin-bottom-left"></div>
                        <div className="absolute w-8 h-6 bg-cyan-400 rounded-t-full transform -rotate-45 origin-bottom-right"></div>
                    </div>
                </div>
                <div className="absolute bottom-1/4 left-1/4">
                    <div className="w-6 h-6 bg-emerald-300 opacity-30 animate-[pulse_2s_ease-in-out_infinite] transform rotate-12" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}>
                    </div>
                </div>
            </div>

            <div className="text-center max-w-3xl mx-auto relative z-10">
                <div className="relative mb-12">
                    <h1 className="text-8xl md:text-[10rem] font-black bg-gradient-to-r from-cyan-400 via-teal-500 to-emerald-500 bg-clip-text text-transparent select-none animate-[wiggle_2s_ease-in-out_infinite]">
                        404
                    </h1>
                    <div className="absolute inset-0 text-8xl md:text-[10rem] font-black text-purple-200 opacity-20 -z-10 blur-sm transform translate-x-2 translate-y-2">
                        404
                    </div>
                    <div className="absolute -top-4 left-12 w-6 h-6 bg-cyan-300 rounded-full animate-[bounce_2s_infinite_0.5s] opacity-70"></div>
                    <div className="absolute -top-2 right-16 w-4 h-4 bg-teal-400 rotate-45 animate-[spin_3s_linear_infinite] opacity-60"></div>
                    <div className="absolute -bottom-4 left-1/4 w-5 h-5 bg-emerald-300 rounded-full animate-[pulse_2.5s_infinite] opacity-80"></div>
                </div>
                <div className="mb-10 flex justify-center">
                    <div className="relative">
                        <div className="w-32 h-24 bg-gradient-to-b from-white to-cyan-100 rounded-full relative shadow-lg">
                            <div className="absolute top-8 left-8 w-4 h-4 bg-cyan-600 rounded-full animate-[blink_4s_infinite]"></div>
                            <div className="absolute top-8 right-8 w-4 h-4 bg-cyan-600 rounded-full animate-[blink_4s_infinite_0.1s]"></div>
                            <div className="absolute top-12 left-4 w-6 h-3 bg-pink-300 rounded-full opacity-50"></div>
                            <div className="absolute top-12 right-4 w-6 h-3 bg-pink-300 rounded-full opacity-50"></div>
                            <div className="absolute top-16 left-1/2 transform -translate-x-1/2 w-8 h-4 border-b-2 border-purple-500 rounded-b-full"></div>
                        </div>
                        <div className="absolute -top-2 -left-2 w-3 h-3 bg-cyan-400 rounded-full animate-[twinkle_2s_ease-in-out_infinite] opacity-80"></div>
                        <div className="absolute top-4 -right-4 w-2 h-2 bg-teal-400 rounded-full animate-[twinkle_2s_ease-in-out_infinite_0.5s] opacity-70"></div>
                        <div className="absolute -bottom-2 right-2 w-3 h-3 bg-emerald-400 rounded-full animate-[twinkle_2s_ease-in-out_infinite_1s] opacity-75"></div>
                    </div>
                </div>
                <div className="mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-cyan-800 mb-4 animate-[slideInUp_0.8s_ease-out]">
                        ไม่พบหน้าที่คุณกำลังมองหา
                    </h2>
                    <p className="text-xl text-cyan-600 leading-relaxed animate-[slideInUp_0.8s_ease-out_0.2s] opacity-0 fill-mode-forwards">
                        อุ๊ปส์! หน้าที่คุณกำลังมองหาดูเหมือนจะไปเล่นซ่อนหาอยู่นะ
                    </p>
                </div>
                <div className="flex justify-center space-x-3 mb-12">
                    <div className="w-4 h-4 bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-full animate-[bounce_1.4s_infinite] shadow-md"></div>
                    <div className="w-4 h-4 bg-gradient-to-r from-teal-400 to-teal-500 rounded-full animate-[bounce_1.4s_infinite_0.2s] shadow-md"></div>
                    <div className="w-4 h-4 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full animate-[bounce_1.4s_infinite_0.4s] shadow-md"></div>
                </div>
                <button
                    onClick={() => window.location.href = '/'}
                    className="group relative px-10 py-5 bg-gradient-to-r from-cyan-400 via-teal-500 to-emerald-500 text-white font-bold text-lg rounded-full shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all duration-300 ease-out animate-[slideInUp_0.8s_ease-out_0.4s] opacity-0 fill-mode-forwards"
                >
                    <span className="relative z-10 flex items-center space-x-3">
                        <svg className="w-6 h-6 transform group-hover:-translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span>กลับหน้าแรก</span>
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-teal-600 to-emerald-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                    <div className="absolute -top-1 -left-1 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-ping transition-opacity duration-300"></div>
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-yellow-300 rounded-full opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-opacity duration-300"></div>
                </button>
            </div>
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(180deg); }
                }
                
                @keyframes wiggle {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-1deg); }
                    75% { transform: rotate(1deg); }
                }
                
                @keyframes blink {
                    0%, 90%, 100% { transform: scaleY(1); }
                    95% { transform: scaleY(0.1); }
                }
                
                @keyframes twinkle {
                    0%, 100% { opacity: 0; transform: scale(0); }
                    50% { opacity: 1; transform: scale(1); }
                }
                
                @keyframes slideInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .fill-mode-forwards {
                    animation-fill-mode: forwards;
                }
            `}</style>
        </div>
    );
}