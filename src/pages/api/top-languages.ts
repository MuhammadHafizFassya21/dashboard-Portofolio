import type { NextApiRequest, NextApiResponse } from "next";
import { fetchWithTimeout } from "../../lib/fetchWithTimeout";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

  const repo = "MuhammadHafizFassya21/dashboard-Portofolio";
  const url = `https://api.github.com/repos/${repo}/languages`;
  const token = process.env.GITHUB_TOKEN;

  try {
    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          "User-Agent": "dev-dashboard-app",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      8000
    );

    if (!response.ok) {
      return res.status(200).json({});
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(200).json({});
  }
}