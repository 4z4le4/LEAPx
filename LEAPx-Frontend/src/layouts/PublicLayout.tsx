import React from "react";

const PublicLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="w-screen min-h-screen flex flex-col">

            {/* Main content */}
            <main className="flex-1 w-full">
                {children}
            </main>

        </div>
    );
};

export default PublicLayout;