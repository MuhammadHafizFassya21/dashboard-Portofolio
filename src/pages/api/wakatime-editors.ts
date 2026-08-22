import type { NextApiRequest, NextApiResponse } from "next";
import { fetchWithTimeout } from "../../lib/fetchWithTimeout";

type EditorData = {
    name: string;
    total_seconds: number;
    percent: number;
    digital: string;
    text: string;
};

const FALLBACK_EDITORS = {
    data: [] as EditorData[],
    total_seconds: 0,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

    const apiKey = process.env.WAKATIME_API_KEY;

    if (!apiKey) {
        return res.status(200).json({
            success: false,
            source: "wakatime-editors",
            message: "Missing WAKATIME_API_KEY",
            ...FALLBACK_EDITORS,
        });
    }

    try {
        const { range } = req.query;
        const wakaRange = range === "30D" ? "last_30_days" : range === "90D" ? "last_6_months" : range === "all" ? "all_time" : "last_7_days";

        const auth = Buffer.from(`${apiKey}:`).toString("base64");
        const url = `https://wakatime.com/api/v1/users/current/stats/${wakaRange}`;

        const response = await fetchWithTimeout(
            url,
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                },
            },
            8000
        );

        if (!response.ok) {
            return res.status(200).json({
                success: false,
                source: "wakatime-editors",
                message: `WakaTime API status ${response.status}`,
                ...FALLBACK_EDITORS,
            });
        }

        const json = await response.json();
        const rawEditors = Array.isArray(json.data?.editors) ? json.data.editors : [];
        const totalSeconds = json.data?.total_seconds || 0;

        const editorsData: EditorData[] = rawEditors.map((ed: any) => ({
            name: ed.name || "Unknown",
            total_seconds: ed.total_seconds || 0,
            percent: ed.percent || 0,
            digital: ed.digital || "0s",
            text: ed.text || "0s",
        }));

        return res.status(200).json({
            success: true,
            source: "wakatime-editors",
            data: editorsData,
            total_seconds: totalSeconds,
        });
    } catch (e: any) {
        return res.status(200).json({
            success: false,
            source: "wakatime-editors",
            message: e.message || "Fetch editors failed",
            ...FALLBACK_EDITORS,
        });
    }
}
