import React, { useState, useEffect } from "react";
import { Target, Award, Code2 } from "lucide-react";
import { GoalsRoadmapResponse } from "../../pages/api/goals-roadmap";

export default function GoalKpiCard() {
  const [data, setData] = useState<GoalsRoadmapResponse | null>(null);

  async function fetchData() {
    try {
      const res = await fetch("/api/goals-roadmap");
      if (res.ok) {
        const json: GoalsRoadmapResponse = await res.json();
        setData(json);
      }
    } catch (e) {
      // Fallback handles UI gracefully
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const kpi = data?.kpi || {
    languageDistribution: [
      { name: "TypeScript", targetPercent: 40, actualPercent: 42 },
      { name: "Python", targetPercent: 40, actualPercent: 38 },
      { name: "SQL", targetPercent: 20, actualPercent: 20 },
    ],
  };

  return (
    <div className="flex flex-col p-4 sm:p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-white/5 bg-gradient-to-br from-zinc-900/60 to-zinc-900/20 backdrop-blur-2xl shadow-2xl transition-all duration-300 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6 pb-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Target vs Alokasi Bahasa Aktual
            </h3>
            <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
              Perbandingan alokasi persentase penggunaan bahasa pemrograman target vs aktual.
            </p>
          </div>
        </div>

        <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
          <Award className="w-3.5 h-3.5" />
          KPI Target
        </span>
      </div>

      {/* Language Allocation Target vs Actual */}
      <div className="p-5 rounded-2xl bg-zinc-950/60 border border-white/5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {kpi.languageDistribution.map((lang) => {
            const diff = lang.actualPercent - lang.targetPercent;
            const diffText = diff >= 0 ? `+${diff}%` : `${diff}%`;
            return (
              <div
                key={lang.name}
                className="flex flex-col p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 hover:border-white/10 transition duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-200">{lang.name}</span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-white/5">
                    Target: {lang.targetPercent}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-base font-black font-mono text-cyan-400">{lang.actualPercent}%</span>
                  <span className={`text-[11px] font-mono font-bold ${diff >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                    Aktual ({diffText})
                  </span>
                </div>

                <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(lang.actualPercent, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
