import type { NextApiRequest, NextApiResponse } from 'next';
import { runGa4Report, normalizeRows } from '../../../lib/ga4';

const FALLBACK_SUMMARY = {
    activeUsers: 0,
    sessions: 0,
    screenPageViews: 0,
    averageSessionDuration: 0,
};

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
            metrics: ['activeUsers', 'sessions', 'screenPageViews', 'averageSessionDuration'],
        });

        const data = normalizeRows(response)[0] || FALLBACK_SUMMARY;

        return res.status(200).json({
            success: true,
            source: "ga4",
            ...data,
            data,
        });
    } catch (error: any) {
        console.error('GA4 API Error (Summary Fallback Used):', error.message || error);
        return res.status(200).json({
            success: false,
            source: "ga4",
            message: `Fallback data used: ${error.message || 'GA4 error'}`,
            ...FALLBACK_SUMMARY,
            data: FALLBACK_SUMMARY,
        });
    }
}
