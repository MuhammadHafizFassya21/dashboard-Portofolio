import React, { useEffect, useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import PortfolioAnalyticsChart from "../components/PortfolioAnalyticsChart";
import GithubContributionsHeatmap from "../components/GithubContributionsHeatmap";
import WeeklySummary from "../components/WeeklySummary";
import TechStackActivity from "../components/TechStackActivity";
import EditorsCard from "../components/EditorsCard";
import WeekdaysChart from "../components/WeekdaysChart";
import DailyActivityGauge from "../components/DailyActivityGauge";
import LayoutShell from "../components/layout/LayoutShell";
import TopHeader from "../components/layout/TopHeader";
import DashboardGrid from "../components/dashboard/DashboardGrid";
import DashboardCard from "../components/dashboard/DashboardCard";
import MetricCard from "../components/dashboard/MetricCard";
import TimeRangeSelector from "../components/dashboard/TimeRangeSelector";
import DailyStatsGrid from "../components/dashboard/DailyStatsGrid";
import ProjectsList from "../components/dashboard/ProjectsList";
import LiveStatus from "../components/dashboard/LiveStatus";
import RealTimeActivityCard from "../components/dashboard/RealTimeActivityCard";
import ProductiveHourCard from "../components/dashboard/ProductiveHourCard";
import ActivityReportTable from "../components/dashboard/ActivityReportTable";
import ProjectHealthCard from "../components/dashboard/ProjectHealthCard";
import GoalKpiCard from "../components/dashboard/GoalKpiCard";
import RoadmapTilSection from "../components/dashboard/RoadmapTilSection";
// import styles from "./dashboard.module.css";

type Point = { x: string; y: number };

type UmamiResponse = {
  range: { startAt: number; endAt: number };
  totals: {
    pageviews: number;
    visitors: number;
    visits: number;
    bounces: number;
    totaltime: number;
  };
  bounceRate: number;
  avgTimeSeconds: number;
  trend: {
    pageviews: Point[];
    sessions: Point[];
  };
};

type ActiveDaysApiResponse = {
  range: { start: string; end: string };
  coding: { source: "wakatime" | "github" | "none"; activeDays: number };
  traffic: { source: "umami"; activeDays: number } | null;
};

type WakaTimeSummary = {
  range: { startDate: string | null; endDate: string | null };
  total: { seconds: number };
  averageDaily: { seconds: number };
  bestDay: { date: string; seconds: number; digital: string } | null;
  topLanguages: { name: string; percent: number }[];
};

type GithubCalendar = {
  totalContributions: number;
  weeks: {
    contributionDays: {
      date: string;
      contributionCount: number;
      color: string;
    }[];
  }[];
};

type WakaTimeDaily = {
  data: {
    range: { date: string; start: string; end: string; text: string; timezone: string };
    grand_total: { hours: number; minutes: number; total_seconds: number; digital: string; text: string };
    categories: { name: string; total_seconds: number; percent: number; digital: string; text: string }[];
    dependencies: { name: string; total_seconds: number; percent: number; digital: string; text: string }[];
    editors: { name: string; total_seconds: number; percent: number; digital: string; text: string }[];
    languages: { name: string; total_seconds: number; percent: number; digital: string; text: string }[];
    machines: { name: string; total_seconds: number; percent: number; digital: string; text: string }[];
    operating_systems: { name: string; total_seconds: number; percent: number; digital: string; text: string }[];
    projects: { name: string; total_seconds: number; percent: number; digital: string; text: string }[];
  }[];
  start: string;
  end: string;
  cumulative_total: { seconds: number; text: string; digital: string };
};

type WakaTimeAllTime = {
  total_seconds: number;
  text: string;
  digital: string;
  decimal: string;
  average_daily_seconds: number;
  start_date: string;
};

type WakaTimeProjects = {
  data: {
    name: string;
    total_seconds: number;
    percent: number;
    digital: string;
    text: string;
    color?: string;
  }[];
  total: number;
  total_pages: number;
};

type TopLanguages = { [key: string]: number };

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatHours(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0h";
  const hours = seconds / 3600;
  return `${hours.toFixed(hours < 10 ? 1 : 0)}h`;
}

function getTopLanguage(langs: TopLanguages): { name: string; percent: number } | null {
  const total = Object.values(langs).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const sorted = Object.entries(langs).sort(([, a], [, b]) => b - a);
  const [name, bytes] = sorted[0];
  return { name, percent: (bytes / total) * 100 };
}

export default function DashboardPage() {
  // Theme
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const [timeRange, setTimeRange] = useState<"7D" | "30D" | "90D" | "all">("7D");

  // Data states
  const [umami, setUmami] = useState<UmamiResponse | null>(null);
  const [activeDays, setActiveDays] = useState<number | null>(null);
  const [gh, setGh] = useState<GithubCalendar | null>(null);
  const [wakaSummary, setWakaSummary] = useState<WakaTimeSummary | null>(null);
  const [wakaAllTime, setWakaAllTime] = useState<WakaTimeAllTime | null>(null);
  const [topLanguages, setTopLanguages] = useState<TopLanguages | null>(null);
  const [editorsData, setEditorsData] = useState<any>(null);
  const [dailyData, setDailyData] = useState<WakaTimeDaily | null>(null);
  const [projectsData, setProjectsData] = useState<WakaTimeProjects | null>(null);
  const [gaSummary, setGaSummary] = useState<any>(null);
  const [gaTimeseries, setGaTimeseries] = useState<any[]>([]);


  // Fetch all API data
  useEffect(() => {
    async function safeFetch<T>(url: string, setter: (val: T) => void) {
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`${url} failed`);
        const data = await r.json();
        setter(data);
      } catch (e) {
        console.error(e);
      }
    }

    const query = `?range=${timeRange}`;

    // Use a small delay to debounce rapid clicks if needed, 
    // but for now the useEffect dependency on [timeRange] is standard.
    // The key fix is in the API mapping and caching.

    safeFetch<UmamiResponse>(`/api/umami${query}`, (u) => setUmami(u));
    safeFetch<ActiveDaysApiResponse>(`/api/active-days${query}`, (a) => setActiveDays(a.coding.activeDays));
    safeFetch<GithubCalendar>(`/api/github-contributions${query}`, (g) => setGh(g));
    safeFetch<WakaTimeSummary>(`/api/wakatime-summary${query}`, (w) => setWakaSummary(w));
    safeFetch<TopLanguages>(`/api/top-languages${query}`, (l) => setTopLanguages(l));
    safeFetch<WakaTimeDaily>(`/api/wakatime-daily${query}`, (d) => setDailyData(d));
    safeFetch<WakaTimeProjects>(`/api/wakatime-projects${query}`, (p) => setProjectsData(p));
    safeFetch<any>(`/api/wakatime-editors${query}`, (e) => setEditorsData(e));
    safeFetch<any>(`/api/ga4/summary${query}`, (g) => setGaSummary(g));
    safeFetch<any>(`/api/ga4/timeseries${query}`, (gt) => setGaTimeseries(gt?.data || gt || []));
    safeFetch<WakaTimeAllTime>(`/api/wakatime-all-time`, (a) => setWakaAllTime(a));
  }, [timeRange]);

  // Polling for auto-update every 5 minutes
  useEffect(() => {
    async function pollFetch<T>(url: string, setter: (val: T) => void) {
      try {
        const r = await fetch(url);
        if (r.ok) setter(await r.json());
      } catch { }
    }

    const interval = setInterval(() => {
      const query = `?range=${timeRange}`;
      pollFetch<UmamiResponse>(`/api/umami${query}`, (u) => setUmami(u));
      pollFetch<WakaTimeSummary>(`/api/wakatime-summary${query}`, (w) => setWakaSummary(w));
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [timeRange]);

  // DERIVED STATS
  const visitors = umami?.totals?.visitors ?? gaSummary?.activeUsers ?? gaSummary?.data?.activeUsers ?? 0;
  const sessionsCount = umami?.totals?.visits ?? gaSummary?.sessions ?? gaSummary?.data?.sessions ?? 0;
  const bounceRatePct = Math.round((umami?.bounceRate ?? 0) * 100);
  const avgTimeSec = Math.round(umami?.avgTimeSeconds ?? 0);
  const codingTime7d = formatHours(wakaSummary?.total?.seconds ?? 0);
  const topLang = topLanguages ? getTopLanguage(topLanguages) : null;
  const topLangLabel = topLang ? `${topLang.name} (${Math.round(topLang.percent)}%)` : "—";
  const pieData = topLanguages ? Object.entries(topLanguages).map(([name, bytes]) => ({ name, value: bytes })) : [];
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Removed InsightList in favor of RealTimeActivityCard

  // LOADING
  if (!umami && activeDays === null && !wakaSummary && !gaSummary) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white selection:bg-blue-500/30 font-sans">
        <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-white/5 h-16 flex items-center px-6">
          <div className="flex items-center gap-4 w-full max-w-[1600px] mx-auto">
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white/90">Hafiz Dashboard</h1>
              <div className="w-32 h-2 mt-1 rounded-full skeleton" />
            </div>
            <div className="ml-auto flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-12 h-6 rounded-lg skeleton opacity-50 hidden sm:block" />
              ))}
            </div>
          </div>
        </header>

        <div className="pt-24 px-6 pb-12 max-w-[1600px] mx-auto">
          {/* HEADER AREA SKELETON */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="space-y-2">
              <div className="w-48 h-8 rounded-xl skeleton" />
              <div className="w-32 h-3 rounded-full skeleton opacity-50" />
            </div>
            <div className="w-64 h-10 rounded-2xl skeleton" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT KPIs SKELETON */}
            <div className="lg:col-span-3 grid grid-cols-1 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 h-[140px] flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="w-20 h-2 rounded-full skeleton opacity-50" />
                    <div className="w-24 h-8 rounded-xl skeleton" />
                  </div>
                  <div className="w-full h-8 rounded-xl skeleton opacity-20" />
                </div>
              ))}
            </div>

            {/* CHART SKELETON */}
            <div className="lg:col-span-9 bg-zinc-900/40 border border-white/5 rounded-[var(--radius-dashboard)] p-8 h-[430px] flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <div className="w-24 h-4 rounded-full skeleton" />
                <div className="flex gap-2">
                  <div className="w-4 h-4 rounded-full skeleton" />
                  <div className="w-4 h-4 rounded-full skeleton" />
                </div>
              </div>
              <div className="flex-1 w-full rounded-2xl skeleton opacity-20" />
            </div>

            {/* LOWER GRIDS SKELETON */}
            <div className="lg:col-span-6 bg-zinc-900/40 border border-white/5 rounded-[var(--radius-dashboard)] p-8 h-[300px]">
              <div className="w-32 h-4 mb-6 rounded-full skeleton" />
              <div className="grid grid-cols-7 gap-2 h-40">
                {Array.from({ length: 28 }).map((_, i) => (
                  <div key={i} className="rounded-sm skeleton opacity-30" />
                ))}
              </div>
            </div>

            <div className="lg:col-span-6 bg-zinc-900/40 border border-white/5 rounded-[var(--radius-dashboard)] p-8 h-[300px]">
              <div className="w-32 h-4 mb-6 rounded-full skeleton" />
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg skeleton" />
                    <div className="flex-1 space-y-2">
                      <div className="w-1/2 h-3 rounded-full skeleton" />
                      <div className="w-1/4 h-2 rounded-full skeleton opacity-50" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-full shadow-2xl flex items-center gap-4">
              <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <span className="text-sm font-medium text-zinc-300 tracking-wide">Menyiapkan Dashboard...</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // MAIN
  return (
    <LayoutShell>
      {/* <TopHeader> removed to use custom grid header */}

      <DashboardGrid>
        {/* ROW 1: HEADER SECTION (MATCHING TESLA STYLE) */}
        <div className="lg:col-span-12 flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2 w-full max-w-full">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <span>Hafiz Dashboard</span>
            </h2>
            <div className="mt-1 flex items-center gap-2">
              <LiveStatus />
            </div>
          </div>
          <TimeRangeSelector currentRange={timeRange} onRangeChange={setTimeRange} />
        </div>

        {/* ROW 2: PRIMARY GRID (LEFT KPIs + RIGHT CHART) */}
        <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-5 w-full max-w-full">
          {/* LEFT: STACKED KPIs */}
          <div className="lg:col-span-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 md:gap-4 lg:gap-5">
            <MetricCard label="Total Coding Time (All Time)" value={wakaAllTime?.digital ?? "—"} trend={`Avg: ${formatHours(wakaAllTime?.average_daily_seconds ?? 0)}/day`} />
            <MetricCard label="Pengunjung" value={visitors} trend="+12%" />
            <MetricCard label="Sesi" value={sessionsCount} trend="+5%" />
            <MetricCard label="Hari Coding" value={activeDays ?? 0} trend="+2" />
          </div>

          {/* RIGHT: LARGE CHART */}
          <DashboardCard id="traffic" title="Aktivitas" className="lg:col-span-3">
            <div className="min-h-[340px] md:h-[430px] w-full">
              <PortfolioAnalyticsChart
                pageviews={(umami?.trend?.pageviews && umami.trend.pageviews.length > 0) ? umami.trend.pageviews : (Array.isArray(gaTimeseries) ? gaTimeseries.map(t => ({ x: t.date || t.x, y: t.pageviews || t.screenPageViews || 0 })) : [])}
                sessions={(umami?.trend?.sessions && umami.trend.sessions.length > 0) ? umami.trend.sessions : (Array.isArray(gaTimeseries) ? gaTimeseries.map(t => ({ x: t.date || t.x, y: t.sessions || 0 })) : [])}
                codingData={dailyData?.data?.map(d => ({ x: d.range?.date, y: d.grand_total?.total_seconds ?? 0 })) ?? []}
              />
            </div>
          </DashboardCard>
        </div>

        {/* ROW 3: SECONDARY CONTENT (Daily Stats hidden temporarily) */}
        <DashboardCard id="github" title="" className="lg:col-span-12">
          {gh ? (
            <GithubContributionsHeatmap
              totalContributions={gh.totalContributions}
              weeks={gh.weeks}
            />
          ) : (
            <div className="flex items-center justify-center p-20 h-full text-zinc-500 font-medium bg-zinc-900/20 rounded-3xl border border-white/5">
              Loading GitHub…
            </div>
          )}
        </DashboardCard>

        <DashboardCard id="daily" title="" className="lg:col-span-12">
          <DailyStatsGrid data={dailyData} />
        </DashboardCard>

        {/* ROW 4: PROJECTS, LANGUAGES & EDITORS (LEFT) | TECH STACK (RIGHT) */}
        <div className="lg:col-span-7 flex flex-col gap-4 lg:gap-5">
          <DashboardCard id="projects" title="Proyek Teratas" className="p-6">
            <ProjectsList data={projectsData} />
          </DashboardCard>

          {/* Languages & Editors Side-by-Side below projects */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
            <DashboardCard id="languages" title="Bahasa Teratas" className="p-6">
              {topLanguages ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => (percent ?? 0) > 0.1 ? `${name}` : ""}
                        outerRadius={70}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <p className="mt-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{topLangLabel}</p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-zinc-500 font-medium">Loading Languages…</div>
              )}
            </DashboardCard>

            <DashboardCard id="editors" className="p-6">
              <EditorsCard data={editorsData?.data ?? []} />
            </DashboardCard>
          </div>
        </div>

        {/* Right Column: Tech Stack Activity */}
        <div className="lg:col-span-5">
          <DashboardCard id="tech" className="h-full p-6">
            <TechStackActivity languages={wakaSummary?.topLanguages ?? []} />
          </DashboardCard>
        </div>

        {/* ROW 5: INSIGHTS & WEEKLY */}
        <DashboardCard id="kpi-summary" title="KPI Ringkasan" className="lg:col-span-4 p-6 overflow-hidden">
          <div className="flex flex-col gap-6 lg:gap-8">
            <DailyActivityGauge
              todaySeconds={dailyData?.data?.find(d => {
                const dayDate = new Date(d.range.date);
                const localToday = new Date();
                return dayDate.getDate() === localToday.getDate() &&
                  dayDate.getMonth() === localToday.getMonth() &&
                  dayDate.getFullYear() === localToday.getFullYear();
              })?.grand_total?.total_seconds || 0}
              dailyAverageSeconds={timeRange === "all" ? (wakaAllTime?.average_daily_seconds || 1) : (wakaSummary?.averageDaily?.seconds || 1)}
              bestDayDate={wakaSummary?.bestDay?.date || ""}
              bestDaySeconds={wakaSummary?.bestDay?.seconds || 0}
            />
            <div className="pt-8 border-t border-white/5 pb-8">
              <ProductiveHourCard />
            </div>
            <div className="pt-8 border-t border-white/5 pb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">Aktivitas Real-time</p>
              <RealTimeActivityCard />
            </div>
          </div>
        </DashboardCard>

        <DashboardCard id="weekly" title="Ringkasan Mingguan" className="lg:col-span-8">
          <div className="flex flex-col gap-12">
            <WeeklySummary
              totalSeconds={timeRange === "all" && wakaAllTime ? wakaAllTime.total_seconds : (wakaSummary?.total?.seconds ?? 0)}
              activeDays={activeDays ?? 0}
              isAllTime={timeRange === "all"}
              averageDailySeconds={wakaAllTime?.average_daily_seconds}
            />
            <div className="pt-8 border-t border-white/5">
              <WeekdaysChart data={dailyData} />
            </div>
          </div>
        </DashboardCard>

        {/* ROW 6: SYSTEM & PIPELINE HEALTH MONITOR */}
        <DashboardCard id="project-health" className="lg:col-span-12">
          <ProjectHealthCard />
        </DashboardCard>

        {/* ROW 7: GOAL TRACKING KPI & ROADMAP MILSTONE HUB */}
        <DashboardCard id="goals-roadmap" className="lg:col-span-12">
          <div className="flex flex-col gap-6">
            <GoalKpiCard />
            <RoadmapTilSection />
          </div>
        </DashboardCard>

        {/* ROW 8: REKAPAN AKTIVITAS TABEL & EXPORT */}
        <DashboardCard id="rekapan-aktivitas" className="lg:col-span-12">
          <ActivityReportTable />
        </DashboardCard>
      </DashboardGrid>


      {/* Footer / Context */}
      <footer className="p-8 pb-32 text-center text-zinc-600 border-t border-white/5">
        <p className="text-xs font-medium">© 2026 Muhammad Hafiz Fassya. All rights reserved.</p>
      </footer>
    </LayoutShell>
  );
}
