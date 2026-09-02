import type { NextApiRequest, NextApiResponse } from "next";
import { fetchWithTimeout } from "../../lib/fetchWithTimeout";

export type Milestone = {
  id: string;
  title: string;
  category: "Academic / ML" | "Portfolio" | "Data Engineering" | "System Architecture";
  startDate: string;
  endDate: string;
  progress: number;
  status: "completed" | "in_progress" | "planned";
};

export type TilLog = {
  id: string;
  date: string;
  title: string;
  content: string;
  tags: string[];
};

export type LanguageTarget = {
  name: string;
  targetPercent: number;
  actualPercent: number;
};

export type GoalsRoadmapResponse = {
  success: boolean;
  timestamp: string;
  kpi: {
    dailyTargetHours: number;
    todayActualHours: number;
    todayProgressPercent: number;
    streakDays: number;
    languageDistribution: LanguageTarget[];
  };
  milestones: Milestone[];
  tilLogs: TilLog[];
};

const DEFAULT_MILESTONES: Milestone[] = [
  {
    id: "m1",
    title: "RUTILAHU DSS Decision System",
    category: "Academic / ML",
    startDate: "2026-08-15",
    endDate: "2026-09-15",
    progress: 85,
    status: "in_progress",
  },
  {
    id: "m2",
    title: "Dev Dashboard v2 Refactor",
    category: "Portfolio",
    startDate: "2026-08-25",
    endDate: "2026-09-05",
    progress: 95,
    status: "in_progress",
  },
  {
    id: "m3",
    title: "E-Commerce Data Warehouse Pipeline",
    category: "Data Engineering",
    startDate: "2026-09-10",
    endDate: "2026-10-01",
    progress: 35,
    status: "planned",
  },
];

const DEFAULT_TIL_LOGS: TilLog[] = [
  {
    id: "t1",
    date: "2026-09-02",
    title: "SWR Edge Caching in Next.js",
    content: "Menggunakan stale-while-revalidate untuk mempercepat response time serverless route dan mengurangi request eksternal.",
    tags: ["Next.js", "Performance", "API"],
  },
  {
    id: "t2",
    date: "2026-09-01",
    title: "BigQuery Partitioning & Clustering",
    content: "Optimasi biaya query dengan membagi tabel berdasarkan tanggal dan meng-cluster kolom user_id.",
    tags: ["BigQuery", "SQL", "Data Engineering"],
  },
  {
    id: "t3",
    date: "2026-08-30",
    title: "Recharts Responsive Scaling di Viewport Mobile",
    content: "Mengatur minWidth={0} dan margin minus agar area SVG chart tidak terpotong di layar smartphone 320px.",
    tags: ["React", "UI/UX", "Tailwind"],
  },
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GoalsRoadmapResponse | { success: false; message: string }>
) {
  if (req.method !== "GET") return res.status(405).end();

  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");

  const dailyTargetHours = 3.0;
  const targetLanguages: Record<string, number> = {
    TypeScript: 40,
    Python: 40,
    SQL: 20,
  };

  let todayActualHours = 2.4;
  let streakDays = 7;
  let actualLangMap: Record<string, number> = {
    TypeScript: 42,
    Python: 38,
    SQL: 20,
  };

  const embedUrl = process.env.WAKATIME_EMBED_URL;
  const apiKey = process.env.WAKATIME_API_KEY;

  try {
    if (embedUrl) {
      const r = await fetchWithTimeout(embedUrl, {}, 6000);
      if (r.ok) {
        const json = await r.json();
        const days = Array.isArray(json.data) ? json.data : [];

        if (days.length > 0) {
          const todayItem = days[days.length - 1];
          const todaySec = todayItem?.grand_total?.total_seconds ?? 0;
          if (todaySec > 0) {
            todayActualHours = Number((todaySec / 3600).toFixed(1));
          }

          // Calculate streak backwards
          let streak = 0;
          for (let i = days.length - 1; i >= 0; i--) {
            const sec = days[i]?.grand_total?.total_seconds ?? 0;
            if (sec > 0) {
              streak++;
            } else {
              break;
            }
          }
          if (streak > 0) streakDays = streak;
        }
      }
    }

    if (apiKey) {
      const apiUrl = "https://wakatime.com/api/v1/users/current/summaries?range=last_7_days";
      const apiRes = await fetchWithTimeout(
        apiUrl,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
          },
        },
        6000
      );

      if (apiRes.ok) {
        const apiJson = await apiRes.json();
        const days = Array.isArray(apiJson.data) ? apiJson.data : [];

        const langTotals: Record<string, number> = {};
        let grandTotalSec = 0;

        for (const day of days) {
          const langs = Array.isArray(day?.languages) ? day.languages : [];
          for (const l of langs) {
            if (l?.name) {
              langTotals[l.name] = (langTotals[l.name] || 0) + (l.total_seconds || 0);
              grandTotalSec += l.total_seconds || 0;
            }
          }
        }

        if (grandTotalSec > 0) {
          actualLangMap = {
            TypeScript: Math.round(((langTotals["TypeScript"] || 0) / grandTotalSec) * 100),
            Python: Math.round(((langTotals["Python"] || 0) / grandTotalSec) * 100),
            SQL: Math.round(((langTotals["SQL"] || 0) / grandTotalSec) * 100),
          };
        }
      }
    }
  } catch (error) {
    // Keep sensible defaults if network fails
  }

  const todayProgressPercent = Math.min(Math.round((todayActualHours / dailyTargetHours) * 100), 100);

  const languageDistribution: LanguageTarget[] = Object.keys(targetLanguages).map((lang) => ({
    name: lang,
    targetPercent: targetLanguages[lang],
    actualPercent: actualLangMap[lang] ?? 0,
  }));

  return res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    kpi: {
      dailyTargetHours,
      todayActualHours,
      todayProgressPercent,
      streakDays,
      languageDistribution,
    },
    milestones: DEFAULT_MILESTONES,
    tilLogs: DEFAULT_TIL_LOGS,
  });
}
