import React from "react";
import styles from "./GithubContributionsHeatmap.module.css";
import {
  Activity,
  GitCommit,
  FolderGit2,
  GitPullRequest,
  CircleDot,
  Code2,
  Flame,
  ExternalLink,
} from "lucide-react";

export type Day = { date: string; contributionCount: number; color: string };
export type Week = { contributionDays: Day[] };

export type GithubAnalyticsProps = {
  totalContributions: number;
  totalCommits?: number;
  totalRepositories?: number;
  totalPullRequests?: number;
  totalIssues?: number;
  mostActiveRepo?: {
    name: string;
    contributions: number;
    language?: string;
    color?: string;
  } | null;
  mostActiveLanguage?: {
    name: string;
    count: number;
    color?: string;
  } | null;
  weeks: Week[];
};

export default function GithubContributionsHeatmap({
  totalContributions,
  totalCommits = 0,
  totalRepositories = 0,
  totalPullRequests = 0,
  totalIssues = 0,
  mostActiveRepo,
  mostActiveLanguage,
  weeks,
}: GithubAnalyticsProps) {
  return (
    <div className="flex flex-col p-4 sm:p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-zinc-900/60 to-zinc-900/20 backdrop-blur-2xl shadow-2xl transition-all duration-500 hover:border-blue-500/20 group w-full max-w-full">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-5 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Activity className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
              GitHub Analytics & Kontribusi
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-zinc-400 mt-1 ml-10">
            Metrik aktivitas repositori, commit, pull request, dan riwayat kontribusi langsung dari GitHub API.
          </p>
        </div>

        <a
          href="https://github.com/MuhammadHafizFassya21"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-all duration-200 w-fit shrink-0 self-start sm:self-center"
        >
          <span>@MuhammadHafizFassya21</span>
          <ExternalLink className="w-3 h-3 text-zinc-400" />
        </a>
      </div>

      {/* Metrics Counter Grid (5 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        {/* Contributions */}
        <div className="flex flex-col p-3.5 sm:p-4 rounded-2xl bg-zinc-950/60 border border-white/5 hover:border-blue-500/20 transition-all duration-200">
          <div className="flex items-center justify-between text-zinc-500 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Contributions</span>
            <Activity className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">{totalContributions}</span>
          <span className="text-[10px] text-zinc-500 mt-0.5">Total kontribusi</span>
        </div>

        {/* Commits */}
        <div className="flex flex-col p-3.5 sm:p-4 rounded-2xl bg-zinc-950/60 border border-white/5 hover:border-emerald-500/20 transition-all duration-200">
          <div className="flex items-center justify-between text-zinc-500 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Commits</span>
            <GitCommit className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">{totalCommits}</span>
          <span className="text-[10px] text-zinc-500 mt-0.5">Total commit riil</span>
        </div>

        {/* Repositories */}
        <div className="flex flex-col p-3.5 sm:p-4 rounded-2xl bg-zinc-950/60 border border-white/5 hover:border-amber-500/20 transition-all duration-200">
          <div className="flex items-center justify-between text-zinc-500 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Repositories</span>
            <FolderGit2 className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">{totalRepositories}</span>
          <span className="text-[10px] text-zinc-500 mt-0.5">Repositori publik</span>
        </div>

        {/* Pull Requests */}
        <div className="flex flex-col p-3.5 sm:p-4 rounded-2xl bg-zinc-950/60 border border-white/5 hover:border-purple-500/20 transition-all duration-200">
          <div className="flex items-center justify-between text-zinc-500 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pull Requests</span>
            <GitPullRequest className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">{totalPullRequests}</span>
          <span className="text-[10px] text-zinc-500 mt-0.5">PR kontribusi</span>
        </div>

        {/* Issues */}
        <div className="col-span-2 sm:col-span-1 flex flex-col p-3.5 sm:p-4 rounded-2xl bg-zinc-950/60 border border-white/5 hover:border-rose-500/20 transition-all duration-200">
          <div className="flex items-center justify-between text-zinc-500 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">Issues</span>
            <CircleDot className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">{totalIssues}</span>
          <span className="text-[10px] text-zinc-500 mt-0.5">Issues dibuka</span>
        </div>
      </div>

      {/* Highlights Bar: Most Active Repository & Most Active Language */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {/* Most Active Repository */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950/60 border border-white/5 hover:border-blue-500/20 transition-all duration-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                Most Active Repository
              </span>
              <span className="text-sm font-bold text-white truncate block">
                {mostActiveRepo?.name || "Portofolio-MuhammadHafizFassya"}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0 pl-3">
            <span className="text-xs font-black text-blue-400 font-mono">
              {mostActiveRepo?.contributions || 0} commits
            </span>
            {mostActiveRepo?.language && (
              <span className="text-[10px] font-bold text-zinc-400 mt-0.5">
                {mostActiveRepo.language}
              </span>
            )}
          </div>
        </div>

        {/* Most Active Language */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950/60 border border-white/5 hover:border-emerald-500/20 transition-all duration-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Code2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">
                Most Active Language
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: mostActiveLanguage?.color || "#3178c6" }}
                />
                <span className="text-sm font-bold text-white truncate">
                  {mostActiveLanguage?.name || "TypeScript"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end shrink-0 pl-3">
            <span className="text-xs font-black text-emerald-400 font-mono">
              {mostActiveLanguage?.count || 0} repos
            </span>
            <span className="text-[10px] font-bold text-zinc-400 mt-0.5">
              Primary Lang
            </span>
          </div>
        </div>
      </div>

      {/* Heatmap Section */}
      <div className="pt-4 border-t border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 px-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Peta Kontribusi Harian (53 Minggu Terakhir)
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <span>Less</span>
            <div className="flex gap-1 items-center">
              <span className="w-2.5 h-2.5 rounded-sm bg-white/5 border border-white/5" />
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-950 border border-emerald-800/30" />
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-700" />
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
            </div>
            <span>More</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl w-full max-w-full">
          <div
            className={`flex gap-[1.5px] min-[380px]:gap-[2px] sm:gap-[3px] md:gap-[5px] w-full justify-between items-center overflow-x-hidden md:overflow-x-auto pb-2 md:pb-4 ${styles.grid}`}
          >
            {weeks.map((w, wi) => (
              <div key={wi} className={styles.week}>
                {w.contributionDays.map((d) => (
                  <div
                    key={d.date}
                    className="w-[3.5px] h-[3.5px] min-[380px]:w-[4.5px] min-[380px]:h-[4.5px] sm:w-2 sm:h-2 md:w-[13px] md:h-[13px] rounded-[1px] md:rounded-[3px] transition-all duration-300 hover:scale-150 hover:z-10 cursor-pointer"
                    style={{
                      backgroundColor: d.contributionCount === 0 ? "rgba(255,255,255,0.04)" : d.color,
                      border: "1px solid rgba(255,255,255,0.03)",
                    }}
                    title={`${d.date}: ${d.contributionCount} kontribusi`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
