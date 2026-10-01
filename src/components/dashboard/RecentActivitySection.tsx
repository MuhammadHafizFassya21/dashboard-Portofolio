import React, { useEffect, useState } from "react";
import { Activity, Clock, RefreshCw, GitCommit, Code2, Users, FolderGit2 } from "lucide-react";
import { RecentActivityItem } from "../../pages/api/recent-activity";

export default function RecentActivitySection({ className = "" }: { className?: string }) {
  const [activities, setActivities] = useState<RecentActivityItem[]>([]);
  const [filter, setFilter] = useState<"all" | "coding" | "commit" | "traffic">("all");
  const [loading, setLoading] = useState(true);

  async function fetchActivities() {
    setLoading(true);
    try {
      const res = await fetch("/api/recent-activity");
      if (res.ok) {
        const json = await res.json();
        setActivities(json.data || []);
      }
    } catch (e) {
      console.error("Failed to load recent activity:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchActivities();
  }, []);

  const filtered = activities.filter((item) => {
    if (filter === "all") return true;
    if (filter === "coding") return item.type === "coding" || item.type === "project";
    if (filter === "commit") return item.type === "commit";
    if (filter === "traffic") return item.type === "traffic";
    return true;
  });

  return (
    <section
      id="recent-activity"
      className={`scroll-mt-24 md:scroll-mt-32 flex flex-col p-4 sm:p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-white/5 bg-gradient-to-br from-zinc-900/60 to-zinc-900/20 backdrop-blur-2xl shadow-2xl transition-all duration-500 hover:border-blue-500/20 w-full max-w-full overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight uppercase">
                RECENT ACTIVITY
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Sync
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
              Aktivitas terbaru kompilasi dari WakaTime coding, GitHub commits, dan Analytics pengunjung.
            </p>
          </div>
        </div>

        {/* Filter Chips & Refresh Button */}
        <div className="flex items-center gap-2 self-start sm:self-center overflow-x-auto max-w-full pb-1 sm:pb-0">
          <div className="flex items-center bg-zinc-950/80 p-1 rounded-xl border border-white/5 text-xs">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1 rounded-lg font-bold transition-all text-[11px] cursor-pointer ${
                filter === "all"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilter("coding")}
              className={`px-3 py-1 rounded-lg font-bold transition-all text-[11px] cursor-pointer ${
                filter === "coding"
                  ? "bg-blue-500/20 text-blue-400 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Coding
            </button>
            <button
              onClick={() => setFilter("commit")}
              className={`px-3 py-1 rounded-lg font-bold transition-all text-[11px] cursor-pointer ${
                filter === "commit"
                  ? "bg-emerald-500/20 text-emerald-400 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Commits
            </button>
            <button
              onClick={() => setFilter("traffic")}
              className={`px-3 py-1 rounded-lg font-bold transition-all text-[11px] cursor-pointer ${
                filter === "traffic"
                  ? "bg-cyan-500/20 text-cyan-400 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Traffic
            </button>
          </div>

          <button
            onClick={fetchActivities}
            disabled={loading}
            title="Refresh aktivitas"
            className="p-2 rounded-xl bg-zinc-950/80 hover:bg-white/5 border border-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Activities Feed List */}
      {loading && activities.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-500 text-xs">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Memuat aktivitas terkini...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-zinc-500 text-xs sm:text-sm">
          Tidak ada aktivitas pada kategori ini.
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-white/5">
          {filtered.slice(0, 10).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 py-3.5 px-3 -mx-3 rounded-xl hover:bg-white/[0.02] transition-colors duration-150 group"
            >
              {/* Left: Bullet Dot + Main Text */}
              <div className="flex items-center gap-3.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-125"
                  style={{
                    backgroundColor: item.dotColor,
                    boxShadow: `0 0 10px ${item.dotColor}50`,
                  }}
                />
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-zinc-100 group-hover:text-white transition-colors block truncate">
                    {item.text}
                  </span>
                  {item.detail && (
                    <span className="text-[10px] sm:text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors block truncate">
                      {item.detail}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Badge & Time */}
              <div className="flex items-center gap-2 shrink-0">
                {item.badge && (
                  <span
                    className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                      item.type === "commit"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : item.type === "traffic"
                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                        : item.type === "project"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                <span className="text-[10px] sm:text-xs font-semibold text-zinc-500 whitespace-nowrap">
                  {item.timeAgo}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
