import React from "react";

interface DashboardCardProps {
    title?: string;
    id?: string;
    className?: string;
    children: React.ReactNode;
    action?: React.ReactNode;
}

export default function DashboardCard({ title, id, className = "", children, action }: DashboardCardProps) {
    return (
        <section
            id={id}
            className={`dashboard-card scroll-mt-24 md:scroll-mt-32 flex flex-col w-full max-w-full overflow-hidden ${className}`}
        >
            {(title || action) && (
                <div className="flex items-center justify-between mb-4 md:mb-6 gap-4">
                    {title && (
                        <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-zinc-500">
                            {title}
                        </h3>
                    )}
                    {action && <div className="flex items-center gap-2">{action}</div>}
                </div>
            )}
            <div className="flex-1 min-h-0 w-full max-w-full overflow-hidden">
                {children}
            </div>
        </section>
    );
}
