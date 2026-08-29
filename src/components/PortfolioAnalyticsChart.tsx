import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

type Point = { x: string; y: number };

type Props = {
  pageviews: Point[];
  sessions: Point[];
  codingData?: Point[];
  events?: { date: string; label: string }[];
};

function formatShortDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

export default function PortfolioAnalyticsChart({
  pageviews,
  sessions,
  codingData,
  events,
}: Props) {
  const [showViews, setShowViews] = useState(true);
  const [showSessions, setShowSessions] = useState(true);
  const [showCoding, setShowCoding] = useState(true);

  const pageviewsColor = "#3b82f6"; // blue-500
  const sessionsColor = "#10b981"; // emerald-500
  const codingColor = "#f59e0b"; // amber-500

  const chartData = useMemo(() => {
    const pvArr = Array.isArray(pageviews) ? pageviews : [];
    const ssArr = Array.isArray(sessions) ? sessions : [];
    const cdArr = Array.isArray(codingData) ? codingData : [];

    const normalizeDate = (d: string) => {
      if (!d) return "";
      let s = d.split(" ")[0].split("T")[0];
      if (s.length === 8 && !s.includes("-")) {
        s = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
      }
      return s;
    };

    const pvMap = new Map(pvArr.map(p => [normalizeDate(p.x), Number(p.y) || 0]));
    const ssMap = new Map(ssArr.map(p => [normalizeDate(p.x), Number(p.y) || 0]));
    const cdMap = new Map(cdArr.map(p => [normalizeDate(p.x), Number(p.y) || 0]));

    const dates = new Set([
      ...pvArr.map(p => normalizeDate(p.x)),
      ...ssArr.map(p => normalizeDate(p.x)),
      ...cdArr.map(p => normalizeDate(p.x))
    ]);

    // Remove empty string keys
    dates.delete("");

    return Array.from(dates).sort().map(iso => {
      return {
        iso,
        date: iso ? formatShortDate(iso) : "",
        pageviews: pvMap.get(iso) ?? 0,
        sessions: ssMap.get(iso) ?? 0,
        codingTime: cdMap.get(iso) ? Math.round((cdMap.get(iso) || 0) / 60) : 0, // in minutes
      };
    });
  }, [pageviews, sessions, codingData]);

  return (
    <div className="flex flex-col h-full space-y-4 md:space-y-6 w-full max-w-full overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xs md:text-sm font-semibold text-white">Tren Aktivitas</h3>
        <div className="flex flex-wrap gap-1.5 md:gap-2" aria-label="Series toggle">
          <button
            onClick={() => setShowViews(!showViews)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] md:text-xs font-bold transition-all border ${showViews ? "bg-blue-500/10 border-blue-500/50 text-blue-400" : "bg-white/5 border-transparent text-zinc-500"
              }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full bg-blue-500 ${showViews ? "" : "opacity-40"}`} />
            Tayangan
          </button>
          <button
            onClick={() => setShowSessions(!showSessions)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] md:text-xs font-bold transition-all border ${showSessions ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" : "bg-white/5 border-transparent text-zinc-500"
              }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${showSessions ? "" : "opacity-40"}`} />
            Sesi
          </button>
          <button
            onClick={() => setShowCoding(!showCoding)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] md:text-xs font-bold transition-all border ${showCoding ? "bg-amber-500/10 border-amber-500/50 text-amber-400" : "bg-white/5 border-transparent text-zinc-500"
              }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full bg-amber-500 ${showCoding ? "" : "opacity-40"}`} />
            Coding (menit)
          </button>
        </div>
      </div>

      <div className="w-full min-w-0 h-[250px] md:h-[360px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={pageviewsColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={pageviewsColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={sessionsColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={sessionsColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCd" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={codingColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={codingColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#ffffff08" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#71717a", fontSize: 10, fontWeight: 600 }}
              dy={6}
              interval="preserveStartEnd"
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#71717a", fontSize: 10, fontWeight: 600 }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "16px",
                border: "1px solid #ffffff10",
                boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.5)",
                background: "#18181b",
                color: "#fafafa"
              }}
              itemStyle={{ fontSize: "11px", fontWeight: "bold" }}
            />
            {events?.map((ev, i) => (
              <ReferenceLine
                key={i}
                x={formatShortDate(ev.date)}
                stroke="#52525b"
                strokeDasharray="4 4"
                label={{ position: "top", value: ev.label, fill: "#71717a", fontSize: 10, fontWeight: "bold" }}
              />
            ))}
            {showViews && (
              <Area
                type="monotone"
                dataKey="pageviews"
                stroke={pageviewsColor}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorPv)"
                isAnimationActive={true}
              />
            )}
            {showSessions && (
              <Area
                type="monotone"
                dataKey="sessions"
                stroke={sessionsColor}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorSs)"
                isAnimationActive={true}
              />
            )}
            {showCoding && (
              <Area
                type="monotone"
                dataKey="codingTime"
                stroke={codingColor}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorCd)"
                isAnimationActive={true}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
