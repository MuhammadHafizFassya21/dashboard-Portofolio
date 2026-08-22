import type { NextApiRequest, NextApiResponse } from "next";
import { fetchWithTimeout } from "../../lib/fetchWithTimeout";

const FALLBACK_STATS = {
  data: {
    total_seconds: 0,
    digital: "0h 0m",
    text: "0 secs",
    languages: [],
    editors: [],
    projects: [],
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  const apiKey = process.env.WAKATIME_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      success: false,
      source: "wakatime",
      message: "Missing WAKATIME_API_KEY",
      ...FALLBACK_STATS,
    });
  }

  try {
    const auth = Buffer.from(`${apiKey}:`).toString("base64");
    const url = "https://wakatime.com/api/v1/users/current/stats/last_7_days";

    const r = await fetchWithTimeout(
      url,
      { headers: { Authorization: `Basic ${auth}` } },
      8000
    );

    if (!r.ok) {
      return res.status(200).json({
        success: false,
        source: "wakatime",
        message: `WakaTime API returned status ${r.status}`,
        ...FALLBACK_STATS,
      });
    }

    const data = await r.json();
    return res.status(200).json({
      success: true,
      source: "wakatime",
      ...data,
    });
  } catch (e: any) {
    return res.status(200).json({
      success: false,
      source: "wakatime",
      message: e.message || "WakaTime fetch failed",
      ...FALLBACK_STATS,
    });
  }
}
