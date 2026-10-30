import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  RefreshCw,
  LogOut,
  Clock,
  Eye,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { VisitorLogsData, VisitorLogEntry } from "../../pages/api/log-visitor";

interface VisitorTrackerCardProps {
  className?: string;
}

export default function VisitorTrackerCard({ className = "" }: VisitorTrackerCardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<VisitorLogsData>({
    lastUpdated: "",
    totalVisits: 0,
    logs: [],
  });
  const [fetchingData, setFetchingData] = useState(false);

  // Pagination / Slide state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // 1. Check session status on mount
  async function checkAuth() {
    try {
      const res = await fetch("/api/admin/verify");
      const json = await res.json();
      if (json.authenticated) {
        setIsAuthenticated(true);
        loadVisitorLogs();
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  }

  // 2. Fetch visitor logs
  async function loadVisitorLogs() {
    setFetchingData(true);
    try {
      const res = await fetch("/api/log-visitor");
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (e) {
      console.error("Gagal memuat log visitor:", e);
    } finally {
      setFetchingData(false);
    }
  }

  useEffect(() => {
    checkAuth();
  }, []);

  // 3. Handle PIN Login
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setIsAuthenticated(true);
        setPin("");
        loadVisitorLogs();
      } else {
        setErrorMsg(json.message || "PIN Admin salah!");
      }
    } catch {
      setErrorMsg("Terjadi kesalahan saat verifikasi.");
    } finally {
      setLoading(false);
    }
  }

  // 4. Handle Logout
  function handleLogout() {
    // Clear cookie
    document.cookie = "admin_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    setIsAuthenticated(false);
    setData({ lastUpdated: "", totalVisits: 0, logs: [] });
  }

  // Calculate statistics
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayVisits = data.logs.filter((l) => l.timestamp?.startsWith(todayStr)).length;
  const mobileVisits = data.logs.filter((l) => l.device === "Mobile").length;
  const desktopVisits = data.logs.filter((l) => l.device === "Desktop").length;
  const tabletVisits = data.logs.filter((l) => l.device === "Tablet").length;

  // Pagination calculations
  const totalPages = Math.ceil(data.logs.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentLogs = data.logs.slice(startIndex, startIndex + itemsPerPage);

  return (
    <section
      id="visitor-tracker"
      className={`scroll-mt-24 md:scroll-mt-32 flex flex-col p-4 sm:p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-white/5 bg-gradient-to-br from-zinc-900/60 to-zinc-900/20 backdrop-blur-2xl shadow-2xl transition-all duration-500 hover:border-emerald-500/20 w-full max-w-full overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight uppercase">
                Visitor Tracker & Admin Log
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Tracker
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
              Pemantauan log pengunjung portofolio terperinci & terproteksi PIN Admin.
            </p>
          </div>
        </div>

        {isAuthenticated && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => {
                setCurrentPage(1);
                loadVisitorLogs();
              }}
              disabled={fetchingData}
              title="Refresh log"
              className="p-2 rounded-xl bg-zinc-950/80 hover:bg-white/5 border border-white/5 text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetchingData ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>

      {/* STATE 1: LOCKED STATE (PIN FORM) */}
      {isAuthenticated === false && (
        <div className="py-12 px-4 rounded-2xl border border-white/5 bg-zinc-950/40 flex flex-col items-center justify-center text-center max-w-md mx-auto w-full">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/5">
            <Lock className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-white mb-1">Akses Khusus Admin</h4>
          <p className="text-xs text-zinc-400 mb-6">
            Masukkan PIN keamanan admin untuk membuka data statistik dan log aktivitas pengunjung.
          </p>

          <form onSubmit={handleLogin} className="w-full flex flex-col gap-3">
            <div className="relative">
              <input
                type="password"
                maxLength={32}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan PIN Admin..."
                className="w-full px-4 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-center text-sm tracking-widest font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                autoFocus
              />
            </div>

            {errorMsg && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || pin.length < 4}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Buka Akses Admin</span>
            </button>
          </form>
        </div>
      )}

      {/* STATE 2: UNLOCKED STATE (VISITOR DATA TABLE) */}
      {isAuthenticated === true && (
        <div className="flex flex-col gap-6">
          {/* Metrics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Kunjungan</span>
                <Globe className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {data.totalVisits || data.logs.length}
                </span>
                <span className="text-xs text-zinc-400 font-medium">total sesi</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider">Kunjungan Hari Ini</span>
                <Clock className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {todayVisits}
                </span>
                <span className="text-xs text-zinc-400 font-medium">hari ini</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider">Device Breakdown</span>
                <div className="flex items-center gap-1 text-zinc-400">
                  <Smartphone className="w-3.5 h-3.5" />
                  <Monitor className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="font-mono text-zinc-300">
                  <strong className="text-white">{mobileVisits}</strong> Mobile
                </span>
                <span className="text-zinc-600">•</span>
                <span className="font-mono text-zinc-300">
                  <strong className="text-white">{desktopVisits}</strong> Desktop
                </span>
                {tabletVisits > 0 && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="font-mono text-zinc-300">
                      <strong className="text-white">{tabletVisits}</strong> Tablet
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Visitor Log Table */}
          {data.logs.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-xs">
              Belum ada log pengunjung yang tercatat.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="w-full overflow-x-auto rounded-xl border border-white/5 bg-zinc-950/50">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02] text-zinc-400 uppercase tracking-wider text-[10px] font-bold">
                      <th className="py-3 px-4">Waktu</th>
                      <th className="py-3 px-4">Alamat IP</th>
                      <th className="py-3 px-4">Perangkat & OS</th>
                      <th className="py-3 px-4">Browser</th>
                      <th className="py-3 px-4">Sumber Referrer</th>
                      <th className="py-3 px-4">Halaman</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {currentLogs.map((log: VisitorLogEntry) => {
                      const timeFormatted = new Date(log.timestamp).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 font-mono text-zinc-300 whitespace-nowrap">
                            {timeFormatted}
                          </td>
                          <td className="py-3 px-4 font-mono text-zinc-400 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-[11px]">
                              {log.ip}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {log.device === "Mobile" ? (
                                <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                              ) : log.device === "Tablet" ? (
                                <Tablet className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                              )}
                              <span className="font-medium text-zinc-200">
                                {log.device} ({log.os})
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-zinc-300 font-medium whitespace-nowrap">
                            {log.browser}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                              {log.referrer}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-zinc-400 whitespace-nowrap">
                            {log.path}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Slider / Pagination Navigation Bar */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-2 text-xs text-zinc-400">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span>Menampilkan baris</span>
                    <strong className="text-zinc-200 font-mono">
                      {startIndex + 1} - {Math.min(startIndex + itemsPerPage, data.logs.length)}
                    </strong>
                    <span>dari</span>
                    <strong className="text-zinc-200 font-mono">{data.logs.length}</strong>
                    <span>total log</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-zinc-500 mr-1">
                      Slide {currentPage} / {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-xl bg-zinc-950/80 hover:bg-white/10 border border-white/5 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center cursor-pointer"
                      title="Slide sebelumnya"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Slide Indicator Dots (max 5 dots preview) */}
                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                        let pageNum = idx + 1;
                        if (totalPages > 5 && currentPage > 3) {
                          pageNum = Math.min(currentPage - 2 + idx, totalPages - (4 - idx));
                        }
                        const isActive = pageNum === currentPage;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-6 h-6 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                              isActive
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-xl bg-zinc-950/80 hover:bg-white/10 border border-white/5 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center cursor-pointer"
                      title="Slide berikutnya"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
