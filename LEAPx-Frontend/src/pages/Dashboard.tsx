//todo: fix this page
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-sky-50">
            {/* Nav Bar */}
            <header className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b border-slate-200">
                <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-sky-100 px-3 py-1 font-extrabold text-sky-700 tracking-wider">
                            LEAP
                        </div>
                        <span className="text-sm text-slate-600">
                            Learning &amp; Experience Advancement Platform
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            className="text-sm px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100"
                            onClick={handleLogout}
                        >
                            Logout
                        </button>
                        <div className="h-9 w-9 rounded-full bg-sky-300/60 grid place-items-center text-slate-700 font-semibold">
                            U
                            {/* รูปโปรไฟล์ */}
                        </div>
                    </div>
                </div>
            </header>
        </div>
    );
}

