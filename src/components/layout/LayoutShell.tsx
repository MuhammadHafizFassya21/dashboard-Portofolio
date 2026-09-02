import React, { useState } from "react";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";

interface LayoutShellProps {
    children: React.ReactNode;
}

const navItems = [
    {
        category: "Main", items: [
            { label: "Tren Aktivitas", href: "#traffic", icon: "ChartBarIcon" },
            { label: "Proyek", href: "#projects", icon: "LibraryIcon" },
            { label: "Kontribusi Harian", href: "#github", icon: "UsersIcon" },
            { label: "Catatan Coding", href: "#kpi-summary", icon: "ClipboardListIcon" },
            { label: "Status & Pipeline", href: "#project-health", icon: "ActivityIcon" },
            { label: "Roadmap & Target", href: "#goals-roadmap", icon: "TargetIcon" },
            { label: "Rekapan Aktivitas", href: "#rekapan-aktivitas", icon: "FileSpreadsheet" },
        ]
    },
];

export default function LayoutShell({ children }: LayoutShellProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex flex-col md:flex-row min-h-screen bg-zinc-950 max-w-full overflow-x-hidden">
            {/* Mobile Top Navigation Bar (< md) */}
            <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-white/5 px-4 py-3 flex md:hidden items-center justify-between w-full">
                <div className="font-display font-bold text-base tracking-tight text-white">
                    Hafiz <span className="text-zinc-500">Dashboard</span>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-white/5 rounded-xl transition-colors"
                    aria-label="Toggle Navigation Menu"
                >
                    <Menu className="w-5 h-5" />
                </button>
            </header>

            <Sidebar
                items={navItems}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />

            <div className="flex-1 w-full md:pl-[280px] min-h-screen max-w-full overflow-x-hidden">
                {React.Children.map(children, (child) => {
                    if (React.isValidElement(child) && (child.type as any).name === 'TopHeader') {
                        return React.cloneElement(child as React.ReactElement<any>, {
                            onMenuClick: () => setIsSidebarOpen(true)
                        });
                    }
                    return child;
                })}
            </div>
        </div>
    );
}
