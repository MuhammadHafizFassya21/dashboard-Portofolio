import React from "react";
import styles from "./GithubContributionsHeatmap.module.css";

type Day = { date: string; contributionCount: number; color: string };
type Week = { contributionDays: Day[] };

export default function GithubContributionsHeatmap({
  totalContributions,
  weeks,
}: {
  totalContributions: number;
  weeks: Week[];
}) {
  return (
    <div className="flex flex-col p-4 sm:p-6 md:p-10 min-h-[300px] md:min-h-[350px] rounded-[1.5rem] md:rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-zinc-900/40 to-zinc-900/10 backdrop-blur-2xl shadow-2xl transition-all duration-500 hover:border-blue-500/20 group overflow-hidden w-full max-w-full">
      {/* Header Info */}
      <div className="flex justify-between items-start mb-6 md:mb-10 px-1">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] md:text-xs font-black text-zinc-500 tracking-[0.3em] md:tracking-[0.4em] uppercase transition-colors duration-500 group-hover:text-blue-400/80">
            GITHUB CONTRIBUTIONS
          </span>
          <div className="w-12 h-1 bg-blue-500/20 rounded-full transition-all duration-500 group-hover:w-24 group-hover:bg-blue-500/40" />
        </div>
        <div className="flex flex-col items-end">
          <span className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-none transition-colors duration-500 group-hover:text-blue-400">
            {totalContributions}
          </span>
          <span className="text-[9px] md:text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1.5">
            Total Year
          </span>
        </div>
      </div>

      {/* Heatmap Grid Container */}
      <div className="relative mt-auto w-full max-w-full">
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
                      backgroundColor: d.contributionCount === 0 ? 'rgba(255,255,255,0.04)' : d.color,
                      border: '1px solid rgba(255,255,255,0.03)'
                    }}
                    title={`${d.date}: ${d.contributionCount} contributions`}
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
