import type { NextApiRequest, NextApiResponse } from "next";
import { fetchWithTimeout } from "../../lib/fetchWithTimeout";

const FALLBACK_ACTIVE = { x: 0 };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");

    const apiKey = process.env.UMAMI_API_KEY;
    const websiteId = process.env.UMAMI_WEBSITE_ID;

    if (!apiKey || !websiteId) {
        return res.status(200).json({
            success: false,
            source: "umami-active",
            message: "Missing UMAMI_API_KEY or UMAMI_WEBSITE_ID",
            ...FALLBACK_ACTIVE,
            data: FALLBACK_ACTIVE,
        });
    }

    try {
        const url = `https://api.umami.is/v1/websites/${websiteId}/active`;
        const response = await fetchWithTimeout(
            url,
            {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                },
            },
            8000
        );

        if (!response.ok) {
            return res.status(200).json({
                success: false,
                source: "umami-active",
                message: `Umami API status: ${response.status}`,
                ...FALLBACK_ACTIVE,
                data: FALLBACK_ACTIVE,
            });
        }

        const data = await response.json();
        return res.status(200).json({
            success: true,
            source: "umami-active",
            ...(typeof data === 'object' ? data : { x: data }),
            data,
        });
    } catch (e: any) {
        return res.status(200).json({
            success: false,
            source: "umami-active",
            message: e.message || "Fetch active users failed",
            ...FALLBACK_ACTIVE,
            data: FALLBACK_ACTIVE,
        });
    }
}
