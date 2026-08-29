import type { NextApiRequest, NextApiResponse } from "next";
import { fetchWithTimeout } from "../../lib/fetchWithTimeout";
import { runGa4Report, normalizeRows } from "../../lib/ga4";

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
    source: "umami-fallback",
    message: `Fallback data used: ${message}`,
    ...payload,
    data: payload,
  };
}

async function fetchGa4Fallback(rangeStr: string, startAt: number, endAt: number) {
  const dateRangeMap: Record<string, string> = {
    '7D': '7daysAgo',
    '30D': '30daysAgo',
    '90D': '90daysAgo',
    'all': '365daysAgo',
  };
  const gaStartDate = dateRangeMap[rangeStr] || '7daysAgo';

  try {
    const [summaryRes, timeseriesRes] = await Promise.all([
      runGa4Report({
        dateRange: gaStartDate,
        metrics: ['activeUsers', 'sessions', 'screenPageViews', 'averageSessionDuration', 'bounceRate'],
      }),
      runGa4Report({
        dateRange: gaStartDate,
        dimensions: ['date'],
        metrics: ['screenPageViews', 'sessions'],
      }),
    ]);

    const summaryRow = normalizeRows(summaryRes)[0] || {};
    const tsRows = normalizeRows(timeseriesRes).sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));

    const pageviews = summaryRow.screenPageViews || 0;
    const visitors = summaryRow.activeUsers || 0;
    const visits = summaryRow.sessions || 0;
    const bounceRate = summaryRow.bounceRate || 0;
    const avgTimeSeconds = summaryRow.averageSessionDuration || 0;
    const totaltime = avgTimeSeconds * visits;

    const pvTrend: { x: string; y: number }[] = [];
    const ssTrend: { x: string; y: number }[] = [];

    tsRows.forEach((row: any) => {
      let dateStr = row.date || '';
      if (dateStr.length === 8) {
        dateStr = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
      }
      pvTrend.push({ x: dateStr, y: row.screenPageViews || 0 });
      ssTrend.push({ x: dateStr, y: row.sessions || 0 });
    });

    const totals = {
      pageviews,
      visitors,
      visits,
      bounces: Math.round(bounceRate * visits),
      totaltime,
    };

    const payload = {
      range: { startAt, endAt },
      totals,
      bounceRate,
      avgTimeSeconds,
      trend: { pageviews: pvTrend, sessions: ssTrend },
    };

    return {
      success: true,
      source: "ga4-fallback",
      ...payload,
      data: payload,
    };
  } catch (err: any) {
    console.error("GA4 Fallback Error:", err.message || err);
    return createFallbackResponse(startAt, endAt, `GA4 Fallback error: ${err.message}`);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  const { range } = req.query;
  const rangeStr = (range as string) || "7D";
  const days = rangeStr === "30D" ? 30 : rangeStr === "90D" ? 90 : rangeStr === "all" ? 365 : 7;

  const endAt = Date.now();
  const startAt = endAt - days * 24 * 60 * 60 * 1000;

  const apiKey = process.env.UMAMI_API_KEY;
  const websiteId = process.env.UMAMI_WEBSITE_ID;

  // If Umami credentials missing, fallback directly to GA4
  if (!apiKey || !websiteId) {
    const ga4Data = await fetchGa4Fallback(rangeStr, startAt, endAt);
    return res.status(200).json(ga4Data);
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
      // Umami non-200 / 403 Forbidden -> fallback to GA4
      const ga4Data = await fetchGa4Fallback(rangeStr, startAt, endAt);
      return res.status(200).json(ga4Data);
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
    const ga4Data = await fetchGa4Fallback(rangeStr, startAt, endAt);
    return res.status(200).json(ga4Data);
  }
}
