import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar/Navbar";

const DashboardLayout = () => {
    return (
        <div className="w-screen min-h-screen ">
            {/* Navbar */}
            <Navbar />

            {/* Main content */}
            <main className="flex-1 p-6">
                <Outlet />
            </main>
        </div>
    );
};

export default DashboardLayout;