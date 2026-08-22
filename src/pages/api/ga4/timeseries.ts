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
            metrics: ['activeUsers', 'sessions'],
        });

        const data = normalizeRows(response).sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''));

        return res.status(200).json(data);
    } catch (error: any) {
        console.error('GA4 API Error (Timeseries Fallback Used):', error.message || error);
        return res.status(200).json([]);
    }
}
