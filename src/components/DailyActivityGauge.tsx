import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface DailyActivityGaugeProps {
    todaySeconds: number;
    dailyAverageSeconds: number;
    bestDayDate: string;
    bestDaySeconds: number;
}

function formatDuration(seconds: number) {
    if (seconds <= 0) return "0 mins";
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    if (h > 0) return `${h} hr ${m} mins`;
    return `${m} mins`;
}

function formatDate(dateStr: string) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    const day = d.getDate();
    const suffix = ["th", "st", "nd", "rd"][(day % 10 > 3 || Math.floor(day % 100 / 10) === 1) ? 0 : day % 10];
    return d.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', '') + suffix;
}

export default function DailyActivityGauge({
    todaySeconds,
    dailyAverageSeconds,
    bestDayDate,
    bestDaySeconds
}: DailyActivityGaugeProps) {
    const percent = dailyAverageSeconds > 0
        ? Math.round(((todaySeconds - dailyAverageSeconds) / dailyAverageSeconds) * 100)
        : 0;

    const isDecrease = percent < 0;
    const absPercent = Math.abs(percent);

    // Gauge data: [value, remaining_until_max]
    // Max is 100% or more if today > average
    const gaugeValue = Math.min(Math.max((todaySeconds / dailyAverageSeconds) * 100, 5), 100);
    const data = [
        { value: gaugeValue },
        { value: 100 - gaugeValue }
    ];

    return (
        <div className="flex flex-col items-center bg-white/[0.03] border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-3xl transition-all duration-500 hover:bg-white/[0.05] hover:border-white/10 group">
            <div className="text-center mb-2">
                <span className="text-lg font-black text-white">{formatDuration(todaySeconds)}</span>
                <span className="text-sm font-bold text-zinc-500 ml-2">Today</span>
            </div>

            <div className="relative w-full h-[140px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="200%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={65}
                            outerRadius={85}
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                        >
                            <Cell fill={isDecrease ? "#ef4444" : "#3b82f6"} />
                            <Cell fill="rgba(255, 255, 255, 0.05)" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                <div className="absolute top-[85px] flex flex-col items-center">
                    <div className={`flex items-center gap-1 font-black ${isDecrease ? "text-red-500" : "text-blue-500"}`}>
                        <span className="text-lg">{isDecrease ? "↓" : "↑"}</span>
                        <span className="text-xl">{absPercent}%</span>
                        <span className="text-sm uppercase tracking-wider">{isDecrease ? "Decrease" : "Increase"}</span>
                    </div>
                </div>
            </div>

            <div className="mt-4 flex flex-col items-center gap-1.5 w-full border-t border-white/5 pt-6">
                <div className="flex items-center justify-center gap-2">
                    <span className="text-sm font-black text-white">{formatDuration(dailyAverageSeconds)}</span>
                    <span className="text-xs font-bold text-zinc-500">Rata-rata Harian (Kalender)</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                    <span className="text-sm font-black text-white">{formatDate(bestDayDate)}</span>
                    <span className="text-xs font-bold text-zinc-500">Hari Teraktif</span>
                </div>
            </div>
        </div>
    );
}
