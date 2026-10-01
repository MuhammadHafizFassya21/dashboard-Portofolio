import React from "react";

interface MetricCardProps {
    label: string;
    value: string | number;
    trend?: string;
    className?: string;
    sparklineData?: number[];
    color?: "blue" | "emerald" | "amber" | "purple";
}

function generateSparklinePath(data?: number[]): { linePath: string; areaPath: string } {
    if (!data || data.length < 2) {
        return { linePath: "M0,18 L100,18", areaPath: "M0,18 L100,18 L100,22 L0,22 Z" };
    }

    const min = Math.min(...data);
    const max = Math.max(...data);

    if (min === max) {
        return { linePath: "M0,18 L100,18", areaPath: "M0,18 L100,18 L100,22 L0,22 Z" };
    }

    const pts = data.map((v, i) => {
        const x = Number(((i / (data.length - 1)) * 100).toFixed(1));
        const y = Number((19 - ((v - min) / (max - min)) * 14).toFixed(1));
        return { x, y };
    });

    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i === 0 ? 0 : i - 1];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2 < pts.length ? i + 2 : pts.length - 1];

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x},${p2.y}`;
    }

    const area = `${d} L 100,22 L 0,22 Z`;
    return { linePath: d, areaPath: area };
}

export default function MetricCard({
    label,
    value,
    trend,
    className = "",
    sparklineData,
    color = "blue",
}: MetricCardProps) {
    const { linePath, areaPath } = React.useMemo(() => generateSparklinePath(sparklineData), [sparklineData]);

    const strokeColor = trend?.startsWith("-")
        ? "#f43f5e"
        : color === "emerald"
            ? "#10b981"
            : color === "amber"
                ? "#f59e0b"
                : "#3b82f6";

    return (
        <div className={`metric-card flex flex-col justify-between min-h-[120px] lg:min-h-[140px] p-4 lg:p-5 ${className}`}>
            <div>
                <p className="text-[10px] lg:text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
                <div className="flex items-baseline gap-2">
                    <p className="text-2xl lg:text-3xl font-black text-white tracking-tighter whitespace-nowrap">{value}</p>
                    {trend && (
                        <span className={`text-[9px] lg:text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            trend.startsWith("+")
                                ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                                : trend.startsWith("-")
                                    ? "text-rose-400 bg-rose-500/10 border border-rose-500/20"
                                    : "text-blue-400 bg-blue-500/10 border border-blue-500/20"
                        }`}>
                            {trend}
                        </span>
                    )}
                </div>
            </div>

            {/* Dynamic Real-Data Sparkline */}
            <div className="mt-4 h-8 w-full overflow-hidden opacity-40 hover:opacity-75 transition-opacity">
                <svg viewBox="0 0 100 22" className="w-full h-full" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id={`grad-${label.replace(/\s+/g, "-")}`} x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
                            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
                        </linearGradient>
                    </defs>
                    <path
                        d={areaPath}
                        fill={`url(#grad-${label.replace(/\s+/g, "-")})`}
                    />
                    <path
                        d={linePath}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
        </div>
    );
}
