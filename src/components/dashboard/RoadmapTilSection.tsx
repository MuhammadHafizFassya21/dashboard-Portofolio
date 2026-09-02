import React, { useState, useEffect, useMemo } from "react";
import { Calendar, Search, BookOpen, Layers, CheckCircle2, Clock, Tag } from "lucide-react";
import { GoalsRoadmapResponse, Milestone, TilLog } from "../../pages/api/goals-roadmap";

export default function RoadmapTilSection() {
  const [data, setData] = useState<GoalsRoadmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  async function fetchData() {
    try {
      const res = await fetch("/api/goals-roadmap");
      if (res.ok) {
        const json: GoalsRoadmapResponse = await res.json();
        setData(json);
      }
    } catch (e) {
      // Handled gracefully with fallback
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const milestones = data?.milestones || [];
  const tilLogs = data?.tilLogs || [];

  // Filter TIL logs by search query (title, content, tags)
  const filteredTil = useMemo(() => {
    if (!searchQuery.trim()) return tilLogs;
    const q = searchQuery.toLowerCase();
    return tilLogs.filter(
      (log) =>
        log.title.toLowerCase().includes(q) ||
        log.content.toLowerCase().includes(q) ||
        log.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [tilLogs, searchQuery]);

  return (
    <div className="flex flex-col p-4 sm:p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-white/5 bg-gradient-to-br from-zinc-900/60 to-zinc-900/20 backdrop-blur-2xl shadow-2xl transition-all duration-300 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Developer Goal Calendar & Milestone Roadmap
            </h3>
            <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
              Papan milestone proyek jangka panjang & catatan engineering log (Today I Learned).
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Milestones (Left/Top) + TIL Logs (Right/Bottom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Milestone Timeline (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-2 mb-1">
            <Layers className="w-4 h-4 text-cyan-400" />
            Milestone & Roadmap Proyek
          </h4>

          <div className="space-y-3">
            {milestones.map((m) => {
              const isDone = m.status === "completed";
              const isInProgress = m.status === "in_progress";
              return (
                <div
                  key={m.id}
                  className="flex flex-col p-4 rounded-2xl bg-zinc-950/60 border border-white/5 hover:border-white/10 transition duration-200"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-zinc-800 text-cyan-400 border border-zinc-700">
                      {m.category}
                    </span>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        isDone
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : isInProgress
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : "bg-zinc-800 text-zinc-400 border border-white/5"
                      }`}
                    >
                      {isDone ? "Selesai" : isInProgress ? "Berjalan" : "Direncanakan"}
                    </span>
                  </div>

                  <h5 className="text-sm font-bold text-white mb-1">{m.title}</h5>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-3">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      {m.startDate} s/d {m.endDate}
                    </span>
                    <span className="font-mono font-bold text-zinc-300">{m.progress}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isDone
                          ? "bg-emerald-500"
                          : isInProgress
                          ? "bg-cyan-400"
                          : "bg-zinc-700"
                      }`}
                      style={{ width: `${m.progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Engineering Log / TIL Searchable Section (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              Engineering Log (TIL)
            </h4>

            {/* Search Input Bar */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari catatan / tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 outline-none focus:border-cyan-500/50 transition placeholder:text-zinc-600"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto scrollbar-hide pr-1">
            {filteredTil.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs bg-zinc-950/40 rounded-2xl border border-white/5">
                Tidak ada catatan yang cocok dengan pencarian "{searchQuery}".
              </div>
            ) : (
              filteredTil.map((til) => (
                <div
                  key={til.id}
                  className="flex flex-col p-4 rounded-2xl bg-zinc-950/60 border border-white/5 hover:border-white/10 transition duration-200"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-zinc-500">{til.date}</span>
                  </div>

                  <h5 className="text-xs sm:text-sm font-bold text-white mb-1.5">{til.title}</h5>
                  <p className="text-xs text-zinc-400 leading-relaxed mb-3">{til.content}</p>

                  <div className="flex flex-wrap gap-1.5">
                    {til.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-900 border border-white/5 text-cyan-400"
                      >
                        <Tag className="w-2.5 h-2.5 opacity-70" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
