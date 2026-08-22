import type { NextApiRequest, NextApiResponse } from "next";
import { fetchWithTimeout } from "../../lib/fetchWithTimeout";

type Day = { date: string; contributionCount: number; color: string };
type Week = { contributionDays: Day[] };

const FALLBACK_CALENDAR = {
  success: false,
  source: "github",
  message: "Fallback data used: Missing token or GitHub API rate limit/error",
  totalContributions: 0,
  weeks: [] as Week[],
  data: {
    totalContributions: 0,
    weeks: [] as Week[],
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  // Set Vercel Edge Caching Header
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

  const token = process.env.GITHUB_TOKEN;
  const username = process.env.GITHUB_USERNAME;
  const { range } = req.query;

  if (!token || !username) {
    return res.status(200).json({
      ...FALLBACK_CALENDAR,
      message: `Fallback data used: Missing ${!token ? "GITHUB_TOKEN" : "GITHUB_USERNAME"}`,
    });
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "dev-dashboard-app",
    };

    if (range === "all") {
      const yearsQuery = `
        query($login: String!) {
          user(login: $login) {
            contributionsCollection {
              contributionYears
            }
          }
        }
      `;

      const yearsResponse = await fetchWithTimeout(
        "https://api.github.com/graphql",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            query: yearsQuery,
            variables: { login: username },
          }),
        },
        8000
      );

      if (!yearsResponse.ok) {
        return res.status(200).json(FALLBACK_CALENDAR);
      }

      const yearsJson = await yearsResponse.json();
      const years: number[] = yearsJson.data?.user?.contributionsCollection?.contributionYears ?? [];

      if (years.length === 0) {
        return res.status(200).json(FALLBACK_CALENDAR);
      }

      let totalContributions = 0;
      let heatmapCal: { totalContributions: number; weeks: Week[] } | null = null;

      const totalsPromises = years.map((year) => {
        const from = `${year}-01-01T00:00:00Z`;
        const to = `${year}-12-31T23:59:59Z`;
        const q = `
          query($login: String!, $from: DateTime!, $to: DateTime!) {
            user(login: $login) {
              contributionsCollection(from: $from, to: $to) {
                contributionCalendar {
                  totalContributions
                  weeks {
                    contributionDays {
                      date
                      contributionCount
                      color
                    }
                  }
                }
              }
            }
          }
        `;
        return fetchWithTimeout(
          "https://api.github.com/graphql",
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              query: q,
              variables: { login: username, from, to },
            }),
          },
          8000
        )
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
      });

      const results = await Promise.all(totalsPromises);
      for (let index = 0; index < results.length; index++) {
        const resItem: any = results[index];
        if (!resItem) continue;
        const count = resItem.data?.user?.contributionsCollection?.contributionCalendar?.totalContributions ?? 0;
        totalContributions += count;
        if (index === 0 && resItem.data?.user?.contributionsCollection?.contributionCalendar) {
          heatmapCal = resItem.data.user.contributionsCollection.contributionCalendar;
        }
      }

      const weeks: Week[] = (heatmapCal as any)?.weeks ?? [];
      return res.status(200).json({
        success: true,
        source: "github",
        totalContributions,
        weeks,
        data: { totalContributions, weeks },
      });
    }

    // Default: Last 365 days
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 365);

    const query = `
      query($login: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $login) {
          contributionsCollection(from: $from, to: $to) {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  date
                  contributionCount
                  color
                }
              }
            }
          }
        }
      }
    `;

    const r = await fetchWithTimeout(
      "https://api.github.com/graphql",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          query,
          variables: { login: username, from: from.toISOString(), to: to.toISOString() },
        }),
      },
      8000
    );

    if (!r.ok) {
      return res.status(200).json(FALLBACK_CALENDAR);
    }

    const json = await r.json();

    if (json.errors || !json.data?.user?.contributionsCollection?.contributionCalendar) {
      return res.status(200).json(FALLBACK_CALENDAR);
    }

    const cal = json.data.user.contributionsCollection.contributionCalendar as {
      totalContributions: number;
      weeks: Week[];
    };

    return res.status(200).json({
      success: true,
      source: "github",
      totalContributions: cal.totalContributions ?? 0,
      weeks: cal.weeks ?? [],
      data: cal,
    });
  } catch (err: any) {
    return res.status(200).json({
      ...FALLBACK_CALENDAR,
      message: `Fallback data used: ${err.message}`,
    });
  }
}
