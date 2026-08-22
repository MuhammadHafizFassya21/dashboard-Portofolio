import type { NextApiRequest, NextApiResponse } from "next";
import { fetchWithTimeout } from "../../lib/fetchWithTimeout";

type UmamiStats = {
  pageviews: number;
  visitors: number;
  visits: number;
  bounces: number;
  totaltime: number;
};
type UmamiTrendPoint = { x: string; y: number };

function createFallbackResponse(startAt: number, endAt: number, message: string) {
  const defaultTotals = {
    pageviews: 0,
    visitors: 0,
    visits: 0,
    bounces: 0,
    totaltime: 0,
  };
  const defaultTrend = { pageviews: [], sessions: [] };
  const payload = {
    range: { startAt, endAt },
    totals: defaultTotals,
    bounceRate: 0,
    avgTimeSeconds: 0,
    trend: defaultTrend,
  };

  return {
    success: false,
    source: "umami",
    message: `Fallback data used: ${message}`,
    ...payload,
    data: payload,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  const { range } = req.query;
  const days = range === "30D" ? 30 : range === "90D" ? 90 : range === "all" ? 365 : 7;

  const endAt = Date.now();
  const startAt = endAt - days * 24 * 60 * 60 * 1000;

  const apiKey = process.env.UMAMI_API_KEY;
  const websiteId = process.env.UMAMI_WEBSITE_ID;

  if (!apiKey || !websiteId) {
    return res.status(200).json(
      createFallbackResponse(startAt, endAt, `Missing ${!apiKey ? "UMAMI_API_KEY" : "UMAMI_WEBSITE_ID"}`)
    );
  }

  try {
    const base = `https://api.umami.is/v1/websites/${websiteId}`;
    const headers = { Authorization: `Bearer ${apiKey}` };

    const statsUrl = `${base}/stats?startAt=${startAt}&endAt=${endAt}&timezone=Asia/Jakarta`;
    const pageviewsUrl = `${base}/pageviews?startAt=${startAt}&endAt=${endAt}&unit=day&timezone=Asia/Jakarta`;

    const [statsRes, trendRes] = await Promise.all([
      fetchWithTimeout(statsUrl, { headers }, 8000),
      fetchWithTimeout(pageviewsUrl, { headers }, 8000),
    ]);

    if (!statsRes.ok || !trendRes.ok) {
      return res.status(200).json(
        createFallbackResponse(startAt, endAt, "Umami API returned non-OK response status")
      );
    }

    const statsText = await statsRes.text();
    const trendText = await trendRes.text();

    const statsJson = JSON.parse(statsText) as UmamiStats;
    const totals = {
      pageviews: statsJson.pageviews ?? 0,
      visitors: statsJson.visitors ?? 0,
      visits: statsJson.visits ?? 0,
      bounces: statsJson.bounces ?? 0,
      totaltime: statsJson.totaltime ?? 0,
    };

    const bounceRate = totals.visits > 0 ? totals.bounces / totals.visits : 0;
    const avgTimeSeconds = totals.visits > 0 ? totals.totaltime / totals.visits : 0;

    const trendData = JSON.parse(trendText);
    let pageviews: UmamiTrendPoint[] = [];
    let sessionsDaily: UmamiTrendPoint[] = [];

    if (Array.isArray(trendData)) {
      pageviews = trendData;
    } else if (trendData && typeof trendData === "object") {
      pageviews = trendData.pageviews || [];
      sessionsDaily = trendData.sessions || [];
    }

    const payload = {
      range: { startAt, endAt },
      totals,
      bounceRate,
      avgTimeSeconds,
      trend: { pageviews, sessions: sessionsDaily },
    };

    return res.status(200).json({
      success: true,
      source: "umami",
      ...payload,
      data: payload,
    });
  } catch (err: any) {
    return res.status(200).json(
      createFallbackResponse(startAt, endAt, err.message || "Unknown error")
    );
  }
}
