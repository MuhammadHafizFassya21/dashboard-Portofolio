import React from "react";

type WeeklySummaryProps = {
    totalSeconds: number;
    activeDays: number;
    previousWeekSeconds?: number;
    previousWeekActiveDays?: number;
    isAllTime?: boolean;
    averageDailySeconds?: number;
};

function formatHours(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds <= 0) return "0h";
    const hours = seconds / 3600;
    if (hours < 1) {
        const mins = Math.round(seconds / 60);
        return `${mins}m`;
    }
    return `${hours.toFixed(hours < 10 ? 1 : 0)}h`;
}

function calculateChange(current: number, previous: number): { percent: number; direction: "up" | "down" | "neutral" } {
    if (!previous || previous === 0) return { percent: 0, direction: "neutral" };
    const change = ((current - previous) / previous) * 100;
    if (change > 0) return { percent: Math.round(change), direction: "up" };
    if (change < 0) return { percent: Math.abs(Math.round(change)), direction: "down" };
    return { percent: 0, direction: "neutral" };
}

function generateInsight(
    totalSeconds: number,
    activeDays: number,
    timeChange: { percent: number; direction: "up" | "down" | "neutral" },
    daysChange: { percent: number; direction: "up" | "down" | "neutral" }
): string {
    const hours = totalSeconds / 3600;

    if (timeChange.direction === "up" && timeChange.percent >= 20) {
        return `Produktivitas meningkat ${timeChange.percent}% minggu ini! Pertahankan momentum ini.`;
    }
    if (timeChange.direction === "down" && timeChange.percent >= 20) {
        return `Waktu coding berkurang ${timeChange.percent}% dari minggu lalu. Tetap semangat!`;
    }
    if (activeDays >= 6) {
        return "Konsistensi luar biasa! Anda coding hampir setiap hari minggu ini.";
    }
    if (hours >= 20) {
        return "Minggu yang produktif dengan lebih dari 20 jam coding!";
    }
    if (activeDays >= 4) {
        return "Konsistensi yang baik dengan " + activeDays + " hari aktif coding.";
    }
    if (hours >= 10) {
        return "Progress yang solid minggu ini. Terus tingkatkan!";
    }
    return "Terus pantau progress coding Anda untuk insight lebih lanjut.";
}

export default function WeeklySummary({
    totalSeconds,
    activeDays,
    previousWeekSeconds,
    previousWeekActiveDays,
    isAllTime,
    averageDailySeconds,
}: WeeklySummaryProps) {
    const timeChange = calculateChange(totalSeconds, previousWeekSeconds ?? 0);
    const daysChange = calculateChange(activeDays, previousWeekActiveDays ?? 0);
    const insight = generateInsight(totalSeconds, activeDays, timeChange, daysChange);

    const getTrendIcon = (direction: "up" | "down" | "neutral") => {
        if (direction === "up") return "↑";
        if (direction === "down") return "↓";
        return "→";
    };

    const getTrendClass = (direction: "up" | "down" | "neutral") => {
        if (direction === "up") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/10";
        if (direction === "down") return "bg-rose-500/10 text-rose-400 border-rose-500/10";
        return "bg-white/5 text-zinc-500 border-white/5";
    };

    return (
        <div className="flex flex-col gap-8 -mt-2">
            <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.05] shadow-inner">
                        <span className="text-xl">📊</span>
                    </div>
                    <h2 className="text-xl font-black text-white tracking-tight">
                        {isAllTime ? "Ringkasan Keseluruhan" : "Ringkasan Mingguan"}
                    </h2>
                </div>
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest hidden sm:block">
                    {isAllTime ? "Seluruh Waktu" : "7 hari terakhir"}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Total Coding Time */}
                <div className="group flex flex-col gap-4 p-8 rounded-[2.5rem] bg-zinc-900/20 border border-white/5 backdrop-blur-3xl transition-all duration-300 hover:border-blue-500/20 hover:bg-zinc-900/40 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <svg className="w-16 h-16 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                        </svg>
                    </div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-blue-400/80 transition-colors">Total Waktu</div>
                    <div className="text-5xl font-black text-white tracking-tighter leading-none group-hover:text-blue-400 transition-colors">{formatHours(totalSeconds)}</div>
                    {!isAllTime && (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold w-fit transition-all duration-300 ${getTrendClass(timeChange.direction)}`}>
                            <span>{getTrendIcon(timeChange.direction)}</span>
                            <span>{timeChange.direction === "neutral" ? "Tanpa data pembanding" : `${timeChange.percent}% vs lalu`}</span>
                        </div>
                    )}
                </div>

                {/* Active Coding Days */}
                <div className="group flex flex-col gap-4 p-8 rounded-[2.5rem] bg-zinc-900/20 border border-white/5 backdrop-blur-3xl transition-all duration-300 hover:border-blue-500/20 hover:bg-zinc-900/40 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <svg className="w-16 h-16 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                    </div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-blue-400/80 transition-colors">Hari Aktif</div>
                    <div className="text-5xl font-black text-white tracking-tighter leading-none group-hover:text-blue-400 transition-colors">{activeDays} <span className="text-lg font-bold text-zinc-500 lowercase ml-1">hari</span></div>
                    {!isAllTime && (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold w-fit transition-all duration-300 ${getTrendClass(daysChange.direction)}`}>
                            <span>{getTrendIcon(daysChange.direction)}</span>
                            <span>{daysChange.direction === "neutral" ? "Tanpa data pembanding" : `${daysChange.percent}% vs lalu`}</span>
                        </div>
                    )}
                </div>

                {/* Average Daily */}
                <div className="group flex flex-col gap-4 p-8 rounded-[2.5rem] bg-zinc-900/20 border border-white/5 backdrop-blur-3xl transition-all duration-300 hover:border-blue-500/20 hover:bg-zinc-900/40 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <svg className="w-16 h-16 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-blue-400/80 transition-colors">
                        Rata-rata/Hari (Kalender)
                    </div>
                    <div className="text-5xl font-black text-white tracking-tighter leading-none group-hover:text-blue-400 transition-colors">
                        {formatHours(isAllTime && averageDailySeconds ? averageDailySeconds : Math.round(totalSeconds / 7))}
                    </div>
                    <div className="flex flex-col gap-1.5 pt-1">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 bg-white/5 text-zinc-400 text-[10px] font-bold w-fit">
                            <span>📅</span>
                            <span>{isAllTime ? "Rata-rata seluruh hari" : "Basis 7 hari kalender"}</span>
                        </div>
                        {!isAllTime && activeDays > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-400 text-[10px] font-bold w-fit">
                                <span>⚡</span>
                                <span>{formatHours(Math.round(totalSeconds / activeDays))} / hari aktif ({activeDays} hari)</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}
