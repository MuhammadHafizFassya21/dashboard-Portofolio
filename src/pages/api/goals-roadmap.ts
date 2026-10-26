import type { NextApiRequest, NextApiResponse } from "next";
import { fetchWithTimeout } from "../../lib/fetchWithTimeout";

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
};

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
  });
}
