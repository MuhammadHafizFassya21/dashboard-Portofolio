import React from "react";

type DayData = {
  range?: { date?: string };
  grand_total?: { digital?: string; total_seconds?: number; text?: string };
  projects?: { name?: string; total_seconds?: number }[];
  languages?: { name?: string; total_seconds?: number }[];
};

interface DailyStatsGridProps {
  data: { data: DayData[] } | null;
}

function getFallback7Days(): DayData[] {
  const list: DayData[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    list.push({
      range: { date: dateStr },
      grand_total: { digital: "0h 0m", total_seconds: 0 },
      projects: [],
      languages: [],
    });
  }
  return list;
}

export default function DailyStatsGrid({ data }: DailyStatsGridProps) {
  const rawList = Array.isArray(data?.data) && data.data.length > 0 ? data.data : getFallback7Days();
  const sortedList = [...rawList].sort((a, b) => {
    const dateA = a.range?.date || "";
    const dateB = b.range?.date || "";
    return dateB.localeCompare(dateA);
  }).slice(0, 7);

  return (
    <div className="flex flex-col p-6 md:p-10 min-h-[350px] rounded-[1.5rem] md:rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-zinc-900/40 to-zinc-900/10 backdrop-blur-2xl shadow-2xl transition-all duration-500 hover:border-amber-500/20 group overflow-hidden w-full max-w-full">
      {/* Header Info */}
      <div className="flex justify-between items-start mb-8 px-1">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-black text-zinc-500 tracking-[0.4em] uppercase transition-colors duration-500 group-hover:text-amber-400/80">
            RINCIAN HARIAN
          </span>
          <div className="w-12 h-1 bg-amber-500/20 rounded-full transition-all duration-500 group-hover:w-24 group-hover:bg-amber-500/40" />
        </div>
        <div className="flex flex-col items-end">
          <span className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-none transition-colors duration-500 group-hover:text-amber-400">
            {sortedList.length}
          </span>
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1.5">
            Hari Terpantau
          </span>
        </div>
      </div>

      {/* Daily Stats Vertical List */}
      <div className="relative mt-auto w-full">
        <div className="flex flex-col gap-2.5 md:gap-3">
          {sortedList.map((day, i) => {
            const dateStr = day.range?.date || new Date().toISOString().slice(0, 10);
            const dateObj = new Date(dateStr);
            const isToday = new Date().toDateString() === dateObj.toDateString();
            const codingTime = day.grand_total?.digital || (day.grand_total?.total_seconds ? `${Math.floor(day.grand_total.total_seconds / 3600)}h ${Math.floor((day.grand_total.total_seconds % 3600) / 60)}m` : "0h 0m");
            const projectCount = Array.isArray(day.projects) ? day.projects.length : 0;
            const languageCount = Array.isArray(day.languages) ? day.languages.length : 0;

            return (
              <div
                key={dateStr + i}
                className={`flex flex-wrap sm:flex-nowrap items-center justify-between p-3.5 md:p-4 rounded-xl md:rounded-2xl border transition-all duration-300 gap-3 
                  ${isToday
                    ? "bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/10"
                    : "bg-zinc-900/40 border-white/5 hover:border-amber-500/20 hover:bg-zinc-900/60"
                  }
                `}
              >
                <div className="flex items-center gap-4 md:gap-6 min-w-0">
                  <div className="flex flex-col min-w-[70px] md:min-w-[80px]">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">
                      {dateObj.toLocaleDateString("id-ID", { weekday: 'short' })}
                    </span>
                    <span className={`text-base md:text-lg font-black mt-1 ${isToday ? "text-amber-400" : "text-zinc-400"}`}>
                      {dateObj.getDate()} {dateObj.toLocaleDateString("id-ID", { month: 'short' })}
                    </span>
                  </div>

                  <div className="h-8 w-px bg-white/5 shrink-0" />

                  <div className="flex flex-col">
                    <span className="text-base md:text-lg font-black text-white leading-none">
                      {codingTime}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wide mt-1">
                      Waktu Coding
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 md:gap-8 ml-auto sm:ml-0">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-zinc-300 leading-none">
                      {projectCount}
                    </span>
                    <span className="text-[8px] md:text-[9px] font-medium text-zinc-600 uppercase mt-1">Proyek</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-zinc-300 leading-none">
                      {languageCount}
                    </span>
                    <span className="text-[8px] md:text-[9px] font-medium text-zinc-600 uppercase mt-1">Bahasa</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
