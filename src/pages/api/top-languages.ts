import type { NextApiRequest, NextApiResponse } from "next";
import { fetchWithTimeout } from "../../lib/fetchWithTimeout";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  const apiKey = process.env.WAKATIME_API_KEY;
  const { range } = req.query;
  const wakaRange = range === "30D" ? "last_30_days" : range === "90D" ? "last_6_months" : range === "all" ? "all_time" : "last_7_days";

  // 1. Primary source: WakaTime coding languages for active activity
  if (apiKey) {
    try {
      const url = `https://wakatime.com/api/v1/users/current/summaries?range=${wakaRange}`;
      const response = await fetchWithTimeout(
        url,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
          },
        },
        8000
      );

      if (response.ok) {
        const json = await response.json();
        const days = Array.isArray(json.data) ? json.data : [];
        const languageMap: Record<string, number> = {};

        for (const day of days) {
          const languages = Array.isArray(day?.languages) ? day.languages : [];
          for (const lang of languages) {
            if (lang?.name) {
              languageMap[lang.name] = (languageMap[lang.name] || 0) + Math.round(lang.total_seconds || 0);
            }
          }
        }

        const totalSec = Object.values(languageMap).reduce((a, b) => a + b, 0);
        if (totalSec > 0) {
          return res.status(200).json(languageMap);
        }
      }
    } catch (e) {
      // Fallback to GitHub below
    }
  }

  // 2. Secondary source / fallback: GitHub repository codebase bytes
  const repo = "MuhammadHafizFassya21/dashboard-Portofolio";
  const url = `https://api.github.com/repos/${repo}/languages`;
  const token = process.env.GITHUB_TOKEN;

  try {
    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          "User-Agent": "dev-dashboard-app",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      8000
    );

    if (!response.ok) {
      return res.status(200).json({});
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(200).json({});
  }
}