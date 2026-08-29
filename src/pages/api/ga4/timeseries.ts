import type { NextApiRequest, NextApiResponse } from 'next';
import { runGa4Report, normalizeRows } from '../../../lib/ga4';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).end();

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

    try {
        const { range = '7D' } = req.query;

        const dateRangeMap: Record<string, string> = {
            '7D': '7daysAgo',
            '30D': '30daysAgo',
            '90D': '90daysAgo',
            'all': '365daysAgo',
        };

        const gaStartDate = dateRangeMap[range as string] || '7daysAgo';

        const response = await runGa4Report({
            dateRange: gaStartDate,
            dimensions: ['date'],
            metrics: ['screenPageViews', 'sessions', 'activeUsers'],
        });

        const rawData = normalizeRows(response).sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));

        const data = rawData.map((item: any) => {
            let dateStr = item.date || '';
            if (dateStr.length === 8) {
                dateStr = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
            }
            return {
                ...item,
                date: dateStr,
                x: dateStr,
                pageviews: item.screenPageViews || 0,
                sessions: item.sessions || 0,
            };
        });

        return res.status(200).json({
            success: true,
            source: "ga4",
            data,
        });
    } catch (error: any) {
        console.error('GA4 API Error (Timeseries Fallback Used):', error.message || error);
        return res.status(200).json({
            success: false,
            source: "ga4",
            data: [],
        });
    }
}
