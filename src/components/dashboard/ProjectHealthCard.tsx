import React, { useState, useEffect } from "react";
import { Activity, Server, CheckCircle2, XCircle, Clock, GitCommit, RefreshCw, Database, Globe, Cpu } from "lucide-react";
import { ProjectHealthResponse, ServiceHealth, DeploymentStatus } from "../../pages/api/project-health";

function formatRelativeTime(isoString: string): string {
  if (!isoString) return "Baru saja";
  const date = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return "Baru saja";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit yang lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam yang lalu`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} hari yang lalu`;
}

function getLatencyColorClass(latencyMs: number): string {
  if (latencyMs < 300) return "text-emerald-400";
  if (latencyMs <= 1000) return "text-amber-400";
  return "text-rose-400";
}

function getServiceIcon(name: string) {
  if (name.toLowerCase().includes("web") || name.toLowerCase().includes("portfolio")) {
    return <Globe className="w-4 h-4 text-blue-400 shrink-0" />;
  }
  if (name.toLowerCase().includes("db") || name.toLowerCase().includes("database") || name.toLowerCase().includes("supabase")) {
    return <Database className="w-4 h-4 text-emerald-400 shrink-0" />;
  }
  return <Cpu className="w-4 h-4 text-amber-400 shrink-0" />;
}

export default function ProjectHealthCard() {
  const [data, setData] = useState<ProjectHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  async function fetchHealthData() {
    setLoading(true);
    try {
      const res = await fetch("/api/project-health");
      if (!res.ok) throw new Error("Gagal mengambil data kesehatan sistem");
      const json: ProjectHealthResponse = await res.json();
      setData(json);
      setError(null);
      setLastRefreshed(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memuat status sistem");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHealthData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchHealthData();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const services = data?.services || [];
  const deployment = data?.latestDeployment;

  return (
    <div className="flex flex-col p-4 sm:p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-white/5 bg-gradient-to-br from-zinc-900/60 to-zinc-900/20 backdrop-blur-2xl shadow-2xl transition-all duration-300 w-full max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              System & Pipeline Health
            </h3>
            <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
              Pemantauan latensi real-time layanan aktif & status deployment.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {lastRefreshed && (
            <span className="text-[10px] sm:text-xs font-mono text-zinc-500 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-zinc-500" />
              {lastRefreshed}
            </span>
          )}
          <button
            type="button"
            onClick={fetchHealthData}
            disabled={loading}
            className="p-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded-xl transition border border-white/5 disabled:opacity-50 cursor-pointer"
            title="Refresh Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Content Grid */}
      {error ? (
        <div className="p-4 text-center text-rose-400 bg-rose-950/20 border border-rose-500/20 rounded-xl text-xs">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Services Monitor Cards (8 cols on desktop) */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {services.map((svc) => {
              const isOnline = svc.status === "online";
              return (
                <div
                  key={svc.name}
                  className="flex flex-col justify-between p-4 rounded-xl md:rounded-2xl bg-zinc-950/60 border border-white/5 hover:border-white/10 transition duration-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {getServiceIcon(svc.name)}
                      <span className="text-xs font-bold text-zinc-200 truncate">{svc.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isOnline ? (
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                      ) : (
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between pt-2 border-t border-white/5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Latensi</span>
                    <span className={`text-xs font-mono font-bold ${getLatencyColorClass(svc.latencyMs)}`}>
                      {isOnline ? `${svc.latencyMs} ms` : "Offline"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Latest Deployment History Card (4 cols on desktop) */}
          <div className="lg:col-span-4 flex flex-col justify-between p-4 rounded-xl md:rounded-2xl bg-zinc-950/60 border border-white/5 hover:border-white/10 transition duration-200">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                  <GitCommit className="w-3.5 h-3.5 text-blue-400" />
                  Build Terakhir
                </span>

                {deployment?.status === "success" && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Success
                  </span>
                )}
                {deployment?.status === "failure" && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    Failed
                  </span>
                )}
                {deployment?.status === "in_progress" && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Building
                  </span>
                )}
                {deployment?.status === "queued" && (
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Queued
                  </span>
                )}
              </div>

              <p className="text-xs font-semibold text-zinc-200 line-clamp-2 mt-1">
                "{deployment?.commitMessage || "System Build"}"
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/5 text-[10px] text-zinc-500 font-medium">
              <span>GitHub Actions / Vercel</span>
              <span>{formatRelativeTime(deployment?.updatedAt || "")}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
