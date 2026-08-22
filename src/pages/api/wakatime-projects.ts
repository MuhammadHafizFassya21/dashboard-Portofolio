import type { NextApiRequest, NextApiResponse } from "next";
import { fetchWithTimeout } from "../../lib/fetchWithTimeout";

type ProjectData = {
  name: string;
  total_seconds: number;
  percent: number;
  digital: string;
  text: string;
};

const FALLBACK_PROJECTS = {
  data: [] as ProjectData[],
  total: 0,
  total_pages: 1,
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  const apiKey = process.env.WAKATIME_API_KEY;

  if (!apiKey) {
    return res.status(200).json({
      success: false,
      source: "wakatime-projects",
      message: "Missing WAKATIME_API_KEY",
      ...FALLBACK_PROJECTS,
    });
  }

  try {
    const { range } = req.query;
    const wakaRange = range === "30D" ? "last_30_days" : range === "90D" ? "last_6_months" : range === "all" ? "all_time" : "last_7_days";

    const url = `https://wakatime.com/api/v1/users/current/summaries?range=${wakaRange}`;
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
        source: "wakatime-projects",
        message: `WakaTime API status ${response.status}`,
        ...FALLBACK_PROJECTS,
      });
    }

    const json = await response.json();
    const days = Array.isArray(json.data) ? json.data : [];

    const projectMap = new Map<string, number>();

    for (const day of days) {
      const projects = Array.isArray(day?.projects) ? day.projects : [];
      for (const proj of projects) {
        if (proj?.name) {
          const existing = projectMap.get(proj.name) || 0;
          projectMap.set(proj.name, existing + (proj.total_seconds || 0));
        }
      }
    }

    const totalSeconds = Array.from(projectMap.values()).reduce((a, b) => a + b, 0);

    const projectsData: ProjectData[] = Array.from(projectMap.entries())
      .map(([name, total_seconds]) => {
        const hours = Math.floor(total_seconds / 3600);
        const minutes = Math.floor((total_seconds % 3600) / 60);
        return {
          name,
          total_seconds,
          percent: totalSeconds > 0 ? (total_seconds / totalSeconds) * 100 : 0,
          digital: `${hours}h ${minutes}m`,
          text: `${hours} hrs ${minutes} mins`,
        };
      })
      .sort((a, b) => b.total_seconds - a.total_seconds);

    return res.status(200).json({
      success: true,
      source: "wakatime-projects",
      data: projectsData,
      total: projectsData.length,
      total_pages: 1,
    });
  } catch (e: any) {
    return res.status(200).json({
      success: false,
      source: "wakatime-projects",
      message: e.message || "Fetch projects failed",
      ...FALLBACK_PROJECTS,
    });
  }
}
