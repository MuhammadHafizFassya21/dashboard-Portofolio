import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Download, Calendar, RefreshCw } from "lucide-react";
import { ActivityLogItem } from "../../pages/api/activity-logs";

export default function ActivityReportTable() {
  const today = new Date().toISOString().slice(0, 10);
  const defaultStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(today);
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  async function fetchLogs() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/activity-logs?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Gagal mengambil data log");
      const json = await res.json();
      setLogs(json.data || []);
      setCurrentPage(1);
    } catch (e: any) {
      setError(e.message || "Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [startDate, endDate]);

  // Export functions
  function handleExportExcel() {
    if (logs.length === 0) return;
    const exportData = logs.map((item) => ({
      Tanggal: item.date,
      "Waktu Coding": item.codingTime,
      "Proyek Utama": item.projectName || "-",
      "Bahasa Utama": item.mainLanguage || "-",
      "Jumlah Commit": item.commitsCount,
      "Pengunjung / Views": item.views,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Activity Logs");
    XLSX.writeFile(workbook, `Aktivitas_Dev_${startDate}_sd_${endDate}.xlsx`);
  }

  function handleExportCSV() {
    if (logs.length === 0) return;
    const exportData = logs.map((item) => ({
      Tanggal: item.date,
      "Waktu Coding": item.codingTime,
      "Proyek Utama": item.projectName || "-",
      "Bahasa Utama": item.mainLanguage || "-",
      "Jumlah Commit": item.commitsCount,
      "Pengunjung / Views": item.views,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Activity Logs");
    XLSX.writeFile(workbook, `Aktivitas_Dev_${startDate}_sd_${endDate}.csv`, { bookType: "csv" });
  }

  // Pagination calculation
  const totalPages = Math.ceil(logs.length / itemsPerPage) || 1;
  const paginatedLogs = logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex flex-col p-6 md:p-8 rounded-[2rem] border border-white/5 bg-gradient-to-br from-zinc-900/60 to-zinc-900/20 backdrop-blur-2xl shadow-2xl transition-all duration-300">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Rekapan Aktivitas Pengembang</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Tabel histori aktivitas harian WakaTime, GitHub, dan Analytics.
            </p>
          </div>
        </div>

        {/* Action Buttons & Filter */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker Filters */}
          <div className="flex items-center gap-2 bg-zinc-950/60 border border-white/10 px-3 py-2 rounded-xl text-xs">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-zinc-200 outline-none cursor-pointer text-xs"
            />
            <span className="text-zinc-600">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-zinc-200 outline-none cursor-pointer text-xs"
            />
          </div>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded-xl transition duration-200 border border-white/5 disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {/* Export Buttons */}
          <button
            onClick={handleExportExcel}
            disabled={logs.length === 0 || loading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-medium text-xs rounded-xl transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-950/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={logs.length === 0 || loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-medium text-xs rounded-xl transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-950/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Content Table */}
      {error ? (
        <div className="p-8 text-center text-red-400 bg-red-950/20 border border-red-500/20 rounded-2xl text-sm">
          {error}
        </div>
      ) : loading ? (
        <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-zinc-400">Memuat Rekapan Aktivitas...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 text-sm">Tidak ada data untuk rentang tanggal ini.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/5">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950/80 text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-white/5">
              <tr>
                <th className="py-3.5 px-4">Tanggal</th>
                <th className="py-3.5 px-4">Waktu Coding</th>
                <th className="py-3.5 px-4">Proyek Utama</th>
                <th className="py-3.5 px-4">Bahasa Utama</th>
                <th className="py-3.5 px-4 text-center">Jumlah Commit</th>
                <th className="py-3.5 px-4 text-right">Views / Sesi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-zinc-900/30">
              {paginatedLogs.map((row) => (
                <tr key={row.date} className="hover:bg-white/[0.02] transition-colors duration-150">
                  <td className="py-3.5 px-4 font-mono font-bold text-white">{row.date}</td>
                  <td className="py-3.5 px-4 font-semibold text-blue-400">{row.codingTime}</td>
                  <td className="py-3.5 px-4 font-medium text-zinc-200">
                    {row.projectName && row.projectName !== "-" ? (
                      <span className="bg-zinc-800 text-cyan-400 text-xs px-2.5 py-1 rounded-md border border-zinc-700">
                        {row.projectName}
                      </span>
                    ) : (
                      <span className="text-zinc-600">-</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium bg-zinc-800 border border-white/5 text-zinc-200">
                      {row.mainLanguage}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-400">
                    {row.commitsCount > 0 ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                        {row.commitsCount}
                      </span>
                    ) : (
                      <span className="text-zinc-600">0</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-zinc-300">{row.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {!loading && logs.length > 0 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5 text-xs text-zinc-400">
          <span>
            Menampilkan {Math.min((currentPage - 1) * itemsPerPage + 1, logs.length)} -{" "}
            {Math.min(currentPage * itemsPerPage, logs.length)} dari {logs.length} rekapan
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-zinc-900 border border-white/5 rounded-lg hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Sebelumnya
            </button>
            <span className="px-2 font-mono text-zinc-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-zinc-900 border border-white/5 rounded-lg hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
