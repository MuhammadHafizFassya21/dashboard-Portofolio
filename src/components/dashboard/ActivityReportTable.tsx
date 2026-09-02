import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Download, Calendar, RefreshCw } from "lucide-react";
import { ActivityLogItem } from "../../pages/api/activity-logs";

function downloadFile(content: BlobPart, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  if (typeof window !== "undefined" && (window.navigator as any).msSaveOrOpenBlob) {
    (window.navigator as any).msSaveOrOpenBlob(blob, fileName);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

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
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    downloadFile(
      wbout,
      `Aktivitas_Dev_${startDate}_sd_${endDate}.xlsx`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
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
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const bomCsv = "\uFEFF" + csvOutput;
    downloadFile(
      bomCsv,
      `Aktivitas_Dev_${startDate}_sd_${endDate}.csv`,
      "text/csv;charset=utf-8;"
    );
  }

  // Pagination calculation
  const totalPages = Math.ceil(logs.length / itemsPerPage) || 1;
  const paginatedLogs = logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex flex-col p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-white/5 bg-gradient-to-br from-zinc-900/60 to-zinc-900/20 backdrop-blur-2xl shadow-2xl transition-all duration-300 w-full max-w-full overflow-hidden">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <FileSpreadsheet className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">Rekapan Aktivitas Pengembang</h3>
            <p className="text-[11px] md:text-xs text-zinc-400 mt-0.5">
              Tabel histori aktivitas harian WakaTime, GitHub, dan Analytics.
            </p>
          </div>
        </div>

        {/* Action Buttons & Filter */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
          {/* Date Picker Filters */}
          <div className="flex items-center justify-between sm:justify-start gap-2 bg-zinc-950/60 border border-white/10 px-3 py-2 rounded-xl text-xs w-full sm:w-auto">
            <div className="flex items-center gap-2 min-w-0">
              <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-zinc-200 outline-none cursor-pointer text-xs min-w-0"
              />
            </div>
            <span className="text-zinc-600 shrink-0">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-zinc-200 outline-none cursor-pointer text-xs min-w-0"
            />
            <button
              type="button"
              onClick={fetchLogs}
              disabled={loading}
              className="p-1 text-zinc-400 hover:text-white transition disabled:opacity-50 sm:hidden shrink-0"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="hidden sm:flex p-2.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded-xl transition duration-200 border border-white/5 disabled:opacity-50 shrink-0 items-center justify-center"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {/* Export Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={logs.length === 0 || loading}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 active:scale-95 text-emerald-400 border border-emerald-500/30 font-semibold text-xs rounded-xl transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-950/20 w-full sm:w-auto cursor-pointer"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={logs.length === 0 || loading}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 active:scale-95 text-blue-400 border border-blue-500/30 font-semibold text-xs rounded-xl transition duration-200 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-950/20 w-full sm:w-auto cursor-pointer"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Table */}
      {error ? (
        <div className="p-6 text-center text-red-400 bg-red-950/20 border border-red-500/20 rounded-xl text-xs md:text-sm">
          {error}
        </div>
      ) : loading ? (
        <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-zinc-400">Memuat Rekapan Aktivitas...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="py-12 text-center text-zinc-500 text-xs md:text-sm">Tidak ada data untuk rentang tanggal ini.</div>
      ) : (
        <div className="w-full overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-left text-xs text-zinc-300 min-w-[580px]">
            <thead className="bg-zinc-950/80 text-zinc-400 font-bold uppercase tracking-wider text-[10px] border-b border-zinc-800">
              <tr>
                <th className="px-2.5 py-2 md:px-4 md:py-3.5">Tanggal</th>
                <th className="px-2.5 py-2 md:px-4 md:py-3.5">Waktu Coding</th>
                <th className="px-2.5 py-2 md:px-4 md:py-3.5">Proyek Utama</th>
                <th className="px-2.5 py-2 md:px-4 md:py-3.5">Bahasa Utama</th>
                <th className="px-2.5 py-2 md:px-4 md:py-3.5 text-center">Jumlah Commit</th>
                <th className="px-2.5 py-2 md:px-4 md:py-3.5 text-right">Views / Sesi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/30">
              {paginatedLogs.map((row) => (
                <tr key={row.date} className="hover:bg-white/[0.02] transition-colors duration-150">
                  <td className="px-2.5 py-2 md:px-4 md:py-3.5 font-mono font-bold text-white whitespace-nowrap">{row.date}</td>
                  <td className="px-2.5 py-2 md:px-4 md:py-3.5 font-semibold text-blue-400 whitespace-nowrap">{row.codingTime}</td>
                  <td className="px-2.5 py-2 md:px-4 md:py-3.5 font-medium text-zinc-200 whitespace-nowrap">
                    {row.projectName && row.projectName !== "-" ? (
                      <span className="bg-zinc-800 text-cyan-400 text-[11px] md:text-xs px-2 py-0.5 md:px-2.5 md:py-1 rounded-md border border-zinc-700">
                        {row.projectName}
                      </span>
                    ) : (
                      <span className="text-zinc-600">-</span>
                    )}
                  </td>
                  <td className="px-2.5 py-2 md:px-4 md:py-3.5 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 md:px-2.5 md:py-1 rounded-md text-[10px] md:text-[11px] font-medium bg-zinc-800 border border-white/5 text-zinc-200">
                      {row.mainLanguage}
                    </span>
                  </td>
                  <td className="px-2.5 py-2 md:px-4 md:py-3.5 text-center font-bold text-emerald-400 whitespace-nowrap">
                    {row.commitsCount > 0 ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                        {row.commitsCount}
                      </span>
                    ) : (
                      <span className="text-zinc-600">0</span>
                    )}
                  </td>
                  <td className="px-2.5 py-2 md:px-4 md:py-3.5 text-right font-mono font-semibold text-zinc-300 whitespace-nowrap">{row.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {!loading && logs.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-white/5 text-[11px] md:text-xs text-zinc-400">
          <span>
            {Math.min((currentPage - 1) * itemsPerPage + 1, logs.length)} -{" "}
            {Math.min(currentPage * itemsPerPage, logs.length)} dari {logs.length} rekapan
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 bg-zinc-900 border border-white/5 rounded-lg hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Sebelumnya
            </button>
            <span className="px-2 font-mono text-zinc-300">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 bg-zinc-900 border border-white/5 rounded-lg hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
