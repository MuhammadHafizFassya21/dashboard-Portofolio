import type { NextApiRequest, NextApiResponse } from "next";
import { fetchWithTimeout } from "../../lib/fetchWithTimeout";

type WakaEmbedDay = {
  date?: string;
  range?: { start?: string; end?: string };
  grand_total?: { total_seconds?: number; digital?: string };
};

type WakaTimeSummary = {
  range: { startDate: string | null; endDate: string | null };
  total: { seconds: number };
  averageDaily: { seconds: number };
  bestDay: { date: string; seconds: number; digital: string } | null;
  topLanguages: { name: string; percent: number }[];
};

const FALLBACK_SUMMARY: WakaTimeSummary = {
  range: { startDate: null, endDate: null },
  total: { seconds: 0 },
  averageDaily: { seconds: 0 },
  bestDay: null,
  topLanguages: [],
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  const embedUrl = process.env.WAKATIME_EMBED_URL;
  const apiKey = process.env.WAKATIME_API_KEY;

  if (!embedUrl && !apiKey) {
    return res.status(200).json({
      success: false,
      source: "wakatime-summary",
      message: "Missing WAKATIME_EMBED_URL or WAKATIME_API_KEY",
      ...FALLBACK_SUMMARY,
      data: FALLBACK_SUMMARY,
    });
  }

  try {
    const { range } = req.query;
    const wakaRange = range === "30D" ? "last_30_days" : range === "90D" ? "last_6_months" : range === "all" ? "all_time" : "last_7_days";
    const daysCount = range === "30D" ? 30 : range === "90D" ? 180 : range === "all" ? 365 : 7;

    let totalSeconds = 0;
    let startDate: string | null = null;
    let endDate: string | null = null;
    let best: { date: string; seconds: number; digital: string } | null = null;
    let topLanguages: { name: string; percent: number }[] = [];

    // Fetch from embed URL for basic stats if available
    if (embedUrl && range !== "30D" && range !== "90D" && range !== "all") {
      try {
        const r = await fetchWithTimeout(embedUrl, {}, 8000);
        if (r.ok) {
          const json = await r.json();
          const days: WakaEmbedDay[] = Array.isArray(json.data) ? json.data : [];

          totalSeconds = days.reduce((sum, d) => sum + (d?.grand_total?.total_seconds ?? 0), 0);
          startDate = days[0]?.range?.start ?? null;
          endDate = days[days.length - 1]?.range?.end ?? null;

          for (const d of days) {
            const sec = d?.grand_total?.total_seconds ?? 0;
            if (sec <= 0) continue;

            const candidate = {
              date: d?.date ?? "",
              seconds: sec,
              digital: d?.grand_total?.digital ?? "",
            };

            if (!best || candidate.seconds > best.seconds) best = candidate;
          }
        }
      } catch (e) {
        // Continue to API fetch if embedUrl fails
      }
    }

    // Fetch languages & stats from API key
    if (apiKey) {
      try {
        const apiUrl = `https://wakatime.com/api/v1/users/current/summaries?range=${wakaRange}`;
        const apiResponse = await fetchWithTimeout(
          apiUrl,
          {
            headers: {
              Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
            },
          },
          8000
        );

        if (apiResponse.ok) {
          const apiJson = await apiResponse.json();
          const days = Array.isArray(apiJson.data) ? apiJson.data : [];

          const languageMap = new Map<string, number>();

          for (const day of days) {
            const languages = Array.isArray(day?.languages) ? day.languages : [];
            for (const lang of languages) {
              if (lang?.name) {
                const existing = languageMap.get(lang.name) || 0;
                languageMap.set(lang.name, existing + (lang.total_seconds || 0));
              }
            }
          }

          const totalLangSeconds = Array.from(languageMap.values()).reduce((a, b) => a + b, 0);

          topLanguages = Array.from(languageMap.entries())
            .map(([name, seconds]) => ({
              name,
              percent: totalLangSeconds > 0 ? (seconds / totalLangSeconds) * 100 : 0,
            }))
            .sort((a, b) => b.percent - a.percent)
            .slice(0, 6);

          if (totalSeconds === 0) {
            totalSeconds = days.reduce(
              (sum: number, d: { grand_total?: { total_seconds?: number } }) =>
                sum + (d?.grand_total?.total_seconds ?? 0),
              0
            );

            startDate = days[0]?.range?.date ?? null;
            endDate = days[days.length - 1]?.range?.date ?? null;
          }

          for (const d of days) {
            const sec = d?.grand_total?.total_seconds ?? 0;
            if (sec <= 0) continue;

            const candidate = {
              date: d?.range?.date ?? "",
              seconds: sec,
              digital: d?.grand_total?.digital ?? "",
            };

            if (!best || candidate.seconds > best.seconds) best = candidate;
          }
        }
      } catch (e) {
        // Fallback used if fetch throws
      }
    }

    const averageDailySeconds = Math.round(totalSeconds / daysCount);

    const out: WakaTimeSummary = {
      range: { startDate, endDate },
      total: { seconds: totalSeconds },
      averageDaily: { seconds: averageDailySeconds },
      bestDay: best,
      topLanguages,
    };

    return res.status(200).json({
      success: true,
      source: "wakatime-summary",
      ...out,
      data: out,
    });
  } catch (e: any) {
    return res.status(200).json({
      success: false,
      source: "wakatime-summary",
      message: e.message || "Summary fetch failed",
      ...FALLBACK_SUMMARY,
      data: FALLBACK_SUMMARY,
    });
  }
}
