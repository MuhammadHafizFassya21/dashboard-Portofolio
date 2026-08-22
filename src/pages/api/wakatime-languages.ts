import type { NextApiRequest, NextApiResponse } from "next";
import { fetchWithTimeout } from "../../lib/fetchWithTimeout";

const FALLBACK_LANGUAGES = {
  data: [],
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  const apiKey = process.env.WAKATIME_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      success: false,
      source: "wakatime-languages",
      message: "Missing WAKATIME_API_KEY",
      ...FALLBACK_LANGUAGES,
    });
  }

  const url = "https://wakatime.com/api/v1/users/current/summaries?range=last_7_days";

  try {
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
        source: "wakatime-languages",
        message: `WakaTime returned status ${response.status}`,
        ...FALLBACK_LANGUAGES,
      });
    }

    const json = await response.json();
    return res.status(200).json({
      success: true,
      source: "wakatime-languages",
      ...json,
    });
  } catch (e: any) {
    return res.status(200).json({
      success: false,
      source: "wakatime-languages",
      message: e.message || "Fetch languages failed",
      ...FALLBACK_LANGUAGES,
    });
  }
}
