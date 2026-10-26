import React, { useState, useEffect, useMemo } from "react";
import {
  Database,
  RefreshCw,
  Download,
  Search,
  Calendar,
  Clock,
  Code2,
  FolderGit2,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
} from "lucide-react";
import { ActivityRecord, ActivityLogsData } from "../../pages/api/activity-sync";

const LANGUAGE_COLORS: Record<string, string> = {
  Python: "#3572A5",
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SQL: "#e38c00",
  Go: "#00ADD8",
  Rust: "#dea584",
  Other: "#71717a",
};

function formatLastUpdated(isoString: string): string {
  if (!isoString) return "Belum pernah";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Belum pernah";
    return d.toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function formatHoursFromSeconds(seconds: number): string {
  if (!seconds || seconds <= 0) return "0 jam";
  const hours = seconds / 3600;
  if (hours < 1) {
    const mins = Math.round(seconds / 60);
    return `${mins} menit`;
  }
  return `${hours.toFixed(1)} jam`;
}

interface AllTimeActivityLogProps {
  className?: string;
}

export default function AllTimeActivityLog({ className = "" }: AllTimeActivityLogProps) {
  const [data, setData] = useState<ActivityLogsData>({
    lastUpdated: "",
    totalRecordedDays: 0,
    logs: [],
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  async function fetchActivityLogs() {
    setLoading(true);
    try {
      const res = await fetch("/api/activity-sync");
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setData(json.data);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil data activity logs:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncNow() {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/activity-sync", {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setData(json.data);
        setSyncMessage(json.message || "Sinkronisasi berhasil!");
      } else {
        setSyncMessage("Gagal menyinkronkan data.");
      }
    } catch (err) {
      console.error("Gagal menjalankan sync:", err);
      setSyncMessage("Koneksi gagal saat menyinkronkan data.");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  }

  useEffect(() => {
    fetchActivityLogs();
  }, []);

  // Filter logs by search query (date or project name or language)
  const filteredLogs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return data.logs;
    return data.logs.filter(
      (log) =>
        log.date.toLowerCase().includes(q) ||
        (log.mainProject && log.mainProject.toLowerCase().includes(q)) ||
        (log.mainLanguage && log.mainLanguage.toLowerCase().includes(q))
    );
  }, [data.logs, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  // Metrics Calculations
  const totalSeconds = useMemo(() => {
    return data.logs.reduce((acc, curr) => acc + (curr.codingSeconds || 0), 0);
  }, [data.logs]);

  const averageHoursPerDay = useMemo(() => {
    if (!data.logs.length) return "0.0";
    const totalHours = totalSeconds / 3600;
    return (totalHours / data.logs.length).toFixed(1);
  }, [totalSeconds, data.logs.length]);

  // Export to CSV
  function handleExportCsv() {
    if (!data.logs.length) return;

    const headers = ["Tanggal", "Total Jam Coding", "Detik", "Proyek Utama", "Bahasa Dominan", "Jumlah Commit"];
    const rows = data.logs.map((item) => [
      item.date,
      `"${item.codingTime || formatSecondsToDigital(item.codingSeconds)}"`,
      item.codingSeconds || 0,
      `"${item.mainProject || "-"}"`,
      `"${item.mainLanguage || "-"}"`,
      item.commitsCount || 0,
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `activity_logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function formatSecondsToDigital(seconds: number): string {
    if (!seconds || seconds <= 0) return "0h 0m";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  }

  return (
    <section
      id="all-time-records"
      className={`scroll-mt-24 md:scroll-mt-32 flex flex-col p-4 sm:p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-white/5 bg-gradient-to-br from-zinc-900/60 to-zinc-900/20 backdrop-blur-2xl shadow-2xl transition-all duration-500 hover:border-blue-500/20 w-full max-w-full overflow-hidden ${className}`}
    >
      {/* 1. Header & Sync Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight uppercase">
                Rekapan Aktivitas Sepanjang Waktu
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                GitHub JSON Persistence
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
              Penyimpanan rekapan coding harian permanen tanpa terikat batas 14 hari WakaTime.
            </p>
          </div>
        </div>

        {/* Sync Button & Timestamp */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
          <div className="text-right hidden md:block">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block">
              Terakhir Disinkron
            </span>
            <span className="text-xs font-mono font-medium text-zinc-300">
              {formatLastUpdated(data.lastUpdated)}
            </span>
          </div>

          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
            title="Sinkronisasi aktivitas koding hari ini ke file permanen"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Menyinkronkan..." : "Sync Hari Ini"}</span>
          </button>

          {data.logs.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 border border-white/5 transition-all cursor-pointer"
              title="Unduh seluruh data rekapan ke format CSV"
            >
              <Download className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {syncMessage && (
        <div className="mb-5 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* 2. Metrics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Hari Terekam</span>
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {data.totalRecordedDays}
            </span>
            <span className="text-xs text-zinc-400 font-medium">hari aktif</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Jam Coding</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {formatHoursFromSeconds(totalSeconds)}
            </span>
            <span className="text-xs text-zinc-400 font-medium">terakumulasi</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Rata-Rata Harian</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">
              {averageHoursPerDay}h
            </span>
            <span className="text-xs text-zinc-400 font-medium">/ hari aktif</span>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari tanggal, nama proyek, atau bahasa..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-950/80 border border-white/5 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 transition-colors"
          />
        </div>

        <div className="text-xs text-zinc-500 self-end sm:self-center font-medium">
          Menampilkan <span className="text-zinc-300 font-bold">{filteredLogs.length}</span> dari{" "}
          <span className="text-zinc-300 font-bold">{data.logs.length}</span> log
        </div>
      </div>

      {/* 4. Log History Table or Empty State */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-zinc-500 text-xs">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Memuat data arsip aktivitas...</span>
        </div>
      ) : data.logs.length === 0 ? (
        /* Empty State Guard */
        <div className="py-16 px-4 rounded-2xl border border-dashed border-white/10 bg-zinc-950/40 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-white mb-1">Belum Ada Rekapan Tersimpan</h4>
          <p className="text-xs text-zinc-400 max-w-md mb-5">
            File data <code className="text-indigo-300 font-mono">data/activity-logs.json</code> saat ini masih kosong.
            Klik tombol di bawah untuk menyinkronkan aktivitas koding Anda ke penyimpanan permanen.
          </p>
          <button
            onClick={handleSyncNow}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Menyinkronkan..." : "Jalankan Sinkronisasi Pertama"}</span>
          </button>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="py-12 text-center text-zinc-500 text-xs">
          Tidak ditemukan catatan yang cocok dengan pencarian &quot;{searchQuery}&quot;.
        </div>
      ) : (
        /* Table of Records */
        <div className="w-full overflow-x-auto rounded-xl border border-white/5 bg-zinc-950/50">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-zinc-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Total Jam Coding</th>
                <th className="py-3 px-4">Proyek Utama</th>
                <th className="py-3 px-4">Bahasa Dominan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedLogs.map((log) => (
                <tr
                  key={log.date}
                  className="hover:bg-white/[0.02] transition-colors duration-150 group"
                >
                  <td className="py-3.5 px-4 font-mono font-medium text-zinc-300 whitespace-nowrap">
                    {log.date}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5">
                      {log.codingTime || formatSecondsToDigital(log.codingSeconds)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300 font-medium whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <FolderGit2 className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400 transition-colors" />
                      <span>{log.mainProject || "-"}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            LANGUAGE_COLORS[log.mainLanguage] || LANGUAGE_COLORS.Other,
                        }}
                      />
                      <span className="font-medium text-zinc-300">{log.mainLanguage || "-"}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-white/5 text-xs text-zinc-400">
              <span>
                Halaman {currentPage} dari {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/5 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Sebelumnya
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/5 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
