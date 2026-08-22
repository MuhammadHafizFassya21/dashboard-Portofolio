import type { NextApiRequest, NextApiResponse } from "next";
import { fetchWithTimeout } from "../../lib/fetchWithTimeout";

const FALLBACK_ALL_TIME = {
    total_seconds: 0,
    text: "0 secs",
    digital: "0:00",
    decimal: "0.00",
    average_daily_seconds: 0,
    start_date: new Date().toISOString().slice(0, 10),
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

    const apiKey = process.env.WAKATIME_API_KEY;
    if (!apiKey) {
        return res.status(200).json({
            success: false,
            source: "wakatime-all-time",
            message: "Missing WAKATIME_API_KEY",
            ...FALLBACK_ALL_TIME,
            data: FALLBACK_ALL_TIME,
        });
    }

    try {
        const url = "https://wakatime.com/api/v1/users/current/all_time_since_today";
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
                source: "wakatime-all-time",
                message: `WakaTime API returned status ${response.status}`,
                ...FALLBACK_ALL_TIME,
                data: FALLBACK_ALL_TIME,
            });
        }

        const json = await response.json();
        const data = json.data || {};

        const total_seconds = data.total_seconds ?? 0;
        const startDateStr = data.range?.start_date || new Date().toISOString().slice(0, 10);
        const startDate = new Date(startDateStr);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - startDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
        const averageDailySeconds = total_seconds / diffDays;

        const result = {
            total_seconds,
            text: data.text || "0 secs",
            digital: data.digital || "0:00",
            decimal: data.decimal || "0.00",
            average_daily_seconds: averageDailySeconds,
            start_date: startDateStr,
        };

        return res.status(200).json({
            success: true,
            source: "wakatime-all-time",
            ...result,
            data: result,
        });
    } catch (e: any) {
        return res.status(200).json({
            success: false,
            source: "wakatime-all-time",
            message: e.message || "Fetch all time failed",
            ...FALLBACK_ALL_TIME,
            data: FALLBACK_ALL_TIME,
        });
    }
}
