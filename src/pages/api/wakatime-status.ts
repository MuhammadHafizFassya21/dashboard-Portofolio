import type { NextApiRequest, NextApiResponse } from "next";
import { fetchWithTimeout } from "../../lib/fetchWithTimeout";

type WakaHeartbeat = {
    entity: string;
    type: string;
    category: string;
    project: string;
    language: string;
    is_write: boolean;
    editor: string;
    operating_system: string;
    machine: string;
    user_id: string;
    time: number;
    id: string;
};

const FALLBACK_STATUS = {
    isCoding: false,
    project: null,
    language: null,
    lastActive: null,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") return res.status(405).end();

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");

    const apiKey = process.env.WAKATIME_API_KEY;
    if (!apiKey) {
        return res.status(200).json({
            success: false,
            source: "wakatime-status",
            message: "Missing WAKATIME_API_KEY",
            ...FALLBACK_STATUS,
            data: FALLBACK_STATUS,
        });
    }

    try {
        const response = await fetchWithTimeout(
            "https://wakatime.com/api/v1/users/current/heartbeats?date=today",
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
                source: "wakatime-status",
                message: `WakaTime status returned ${response.status}`,
                ...FALLBACK_STATUS,
                data: FALLBACK_STATUS,
            });
        }

        const json = await response.json();
        const heartbeats: WakaHeartbeat[] = json.data || [];

        if (heartbeats.length === 0) {
            return res.status(200).json({
                success: true,
                source: "wakatime-status",
                ...FALLBACK_STATUS,
                data: FALLBACK_STATUS,
            });
        }

        const latest = heartbeats[heartbeats.length - 1];
        const now = Date.now() / 1000;
        const diff = now - latest.time;

        const isCoding = diff < 15 * 60;

        const out = {
            isCoding,
            project: latest.project !== "null" ? latest.project : null,
            language: latest.language !== "null" ? latest.language : null,
            lastActive: new Date(latest.time * 1000).toISOString(),
        };

        return res.status(200).json({
            success: true,
            source: "wakatime-status",
            ...out,
            data: out,
        });
    } catch (e: any) {
        return res.status(200).json({
            success: false,
            source: "wakatime-status",
            message: e.message || "Status fetch failed",
            ...FALLBACK_STATUS,
            data: FALLBACK_STATUS,
        });
    }
}
