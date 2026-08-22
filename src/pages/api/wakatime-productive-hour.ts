import type { NextApiRequest, NextApiResponse } from "next";
import { fetchWithTimeout } from "../../lib/fetchWithTimeout";

type WakaDuration = {
    time: number;
    duration: number;
    project: string;
};

type HourlyDistribution = Record<number, number>;

const FALLBACK_PRODUCTIVE_HOUR = {
    peakHour: 0,
    persona: "Productive Developer",
    icon: "🚀",
    distribution: Array(24).fill(0),
    totalSecondsAcrossWeek: 0,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

    const apiKey = process.env.WAKATIME_API_KEY;
    if (!apiKey) {
        return res.status(200).json({
            success: false,
            source: "wakatime-productive-hour",
            message: "Missing WAKATIME_API_KEY",
            ...FALLBACK_PRODUCTIVE_HOUR,
            data: FALLBACK_PRODUCTIVE_HOUR,
        });
    }

    try {
        const days = 7;
        const distribution: HourlyDistribution = {};
        for (let i = 0; i < 24; i++) distribution[i] = 0;

        const fetchPromises = [];
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const url = `https://wakatime.com/api/v1/users/current/durations?date=${dateStr}`;

            fetchPromises.push(
                fetchWithTimeout(
                    url,
                    {
                        headers: {
                            Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
                        },
                    },
                    8000
                )
                    .then(async (r) => (r.ok ? r.json() : { data: [] }))
                    .catch(() => ({ data: [] }))
            );
        }

        const results = await Promise.all(fetchPromises);

        results.forEach((res) => {
            const durations: WakaDuration[] = res.data || [];
            durations.forEach((d) => {
                const hour = new Date(d.time * 1000).getHours();
                distribution[hour] = (distribution[hour] || 0) + d.duration;
            });
        });

        let peakHour = 0;
        let maxDuration = 0;
        for (let i = 0; i < 24; i++) {
            if (distribution[i] > maxDuration) {
                maxDuration = distribution[i];
                peakHour = i;
            }
        }

        let persona = "Productive Developer";
        let icon = "🚀";
        if (peakHour >= 5 && peakHour < 9) {
            persona = "Early Bird";
            icon = "🌅";
        } else if (peakHour >= 9 && peakHour < 12) {
            persona = "Morning Focused";
            icon = "☕";
        } else if (peakHour >= 12 && peakHour < 17) {
            persona = "Deep Worker";
            icon = "👨‍💻";
        } else if (peakHour >= 17 && peakHour < 21) {
            persona = "Evening Coder";
            icon = "🏢";
        } else if (peakHour >= 21 || peakHour < 5) {
            persona = "Night Owl";
            icon = "🦉";
        }

        const payload = {
            peakHour,
            persona,
            icon,
            distribution: Object.values(distribution),
            totalSecondsAcrossWeek: Object.values(distribution).reduce((a, b) => a + b, 0),
        };

        return res.status(200).json({
            success: true,
            source: "wakatime-productive-hour",
            ...payload,
            data: payload,
        });
    } catch (e: any) {
        return res.status(200).json({
            success: false,
            source: "wakatime-productive-hour",
            message: e.message || "Fetch productive hour failed",
            ...FALLBACK_PRODUCTIVE_HOUR,
            data: FALLBACK_PRODUCTIVE_HOUR,
        });
    }
}
