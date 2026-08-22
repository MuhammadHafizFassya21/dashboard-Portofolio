import type { NextApiRequest, NextApiResponse } from "next";
import { fetchWithTimeout } from "../../lib/fetchWithTimeout";

const FALLBACK_DAILY = {
  data: [],
  start: new Date().toISOString(),
  end: new Date().toISOString(),
  cumulative_total: { seconds: 0, text: "0 secs", digital: "0:00" },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  const apiKey = process.env.WAKATIME_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      success: false,
      source: "wakatime-daily",
      message: "Missing WAKATIME_API_KEY",
      ...FALLBACK_DAILY,
    });
  }

  try {
    const { range } = req.query;
    const wakaRange = range === "30D" ? "last_30_days" : range === "90D" ? "last_6_months" : range === "all" ? "all_time" : "last_7_days";
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

    if (!response.ok) {
      return res.status(200).json({
        success: false,
        source: "wakatime-daily",
        message: `WakaTime API returned status ${response.status}`,
        ...FALLBACK_DAILY,
      });
    }

    const data = await response.json();
    return res.status(200).json({
      success: true,
      source: "wakatime-daily",
      data: Array.isArray(data.data) ? data.data : [],
      start: data.start || FALLBACK_DAILY.start,
      end: data.end || FALLBACK_DAILY.end,
      cumulative_total: data.cumulative_total || FALLBACK_DAILY.cumulative_total,
    });
  } catch (e: any) {
    return res.status(200).json({
      success: false,
      source: "wakatime-daily",
      message: e.message || "WakaTime daily fetch failed",
      ...FALLBACK_DAILY,
    });
  }
}