import React from "react";

interface DashboardGridProps {
    children: React.ReactNode;
}

export default function DashboardGrid({ children }: DashboardGridProps) {
    return (
        <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 md:gap-4 lg:gap-5 p-3 sm:p-6 lg:p-10 w-full max-w-[1600px] mx-auto overflow-x-hidden">
            {children}
        </main>
    );
}
