import type { NextApiRequest, NextApiResponse } from "next";
import { fetchWithTimeout } from "../../lib/fetchWithTimeout";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfDayUTC(d: Date) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function addDaysUTC(d: Date, days: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

type WakaTimeSummaryDay = {
  grand_total?: { total_seconds?: number };
  range?: { date?: string };
};

type WakaTimeSummariesResponse = {
  data?: WakaTimeSummaryDay[];
};

type GitHubContributionDay = {
  date: string;
  contributionCount: number;
};

type GitHubWeek = {
  contributionDays?: GitHubContributionDay[];
};

type GitHubGraphQLResponse = {
  data?: {
    user?: {
      contributionsCollection?: {
        contributionCalendar?: {
          weeks?: GitHubWeek[];
        };
      };
    };
  };
  errors?: unknown;
};

function getRangeFromQuery(range?: string | string[]) {
  const todayUTC = startOfDayUTC(new Date());
  const end = addDaysUTC(todayUTC, -1);
  let start = addDaysUTC(todayUTC, -7);

  if (range === "30D") {
    start = addDaysUTC(todayUTC, -30);
  } else if (range === "90D") {
    start = addDaysUTC(todayUTC, -90);
  } else if (range === "all") {
    start = new Date("2000-01-01");
  }

  return { start, end };
}

async function getActiveDaysFromWakaTime(range?: string | string[]): Promise<number> {
  const apiKey = process.env.WAKATIME_API_KEY;
  if (!apiKey) return 0;

  const auth = Buffer.from(`${apiKey}:`).toString("base64");
  const { start, end } = getRangeFromQuery(range);

  let url = "";
  if (range === "all") {
    url = `https://wakatime.com/api/v1/users/current/summaries?range=all_time`;
  } else {
    url = `https://wakatime.com/api/v1/users/current/summaries?start=${toISODate(start)}&end=${toISODate(end)}`;
  }

  const r = await fetchWithTimeout(url, { headers: { Authorization: `Basic ${auth}` } }, 8000);
  if (!r.ok) return 0;

  const json = (await r.json()) as WakaTimeSummariesResponse;
  const days = json.data ?? [];

  return days.reduce((acc, day) => {
    const seconds = day.grand_total?.total_seconds ?? 0;
    return acc + (seconds > 0 ? 1 : 0);
  }, 0);
}

async function getActiveDaysFromGitHub(range?: string | string[]): Promise<number> {
  const username = process.env.GITHUB_USERNAME;
  if (!username) return 0;

  const token = process.env.GITHUB_TOKEN;
  const { start, end } = getRangeFromQuery(range);

  if (range === "all") {
    const yearsQuery = `query($login: String!) { user(login: $login) { contributionsCollection { contributionYears } } }`;
    const yrRes = await fetchWithTimeout(
      "https://api.github.com/graphql",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ query: yearsQuery, variables: { login: username } }),
      },
      8000
    );
    if (!yrRes.ok) return 0;
    const yrJson = await yrRes.json();
    const years: number[] = yrJson.data?.user?.contributionsCollection?.contributionYears ?? [];

    const promises = years.map((year) => {
      const from = `${year}-01-01T00:00:00Z`;
      const to = `${year}-12-31T23:59:59Z`;
      const q = `
        query($login: String!, $from: DateTime!, $to: DateTime!) {
          user(login: $login) {
            contributionsCollection(from: $from, to: $to) {
              contributionCalendar {
                weeks {
                  contributionDays {
                    contributionCount
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
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ query: q, variables: { login: username, from, to } }),
        },
        8000
      )
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
    });

    const results = await Promise.all(promises);
    let totalActiveDays = 0;
    results.forEach((res) => {
      if (!res) return;
      const weeks = res.data?.user?.contributionsCollection?.contributionCalendar?.weeks ?? [];
      const days = weeks.flatMap((w: any) => w.contributionDays ?? []);
      totalActiveDays += days.reduce((acc: number, d: any) => acc + (d.contributionCount > 0 ? 1 : 0), 0);
    });
    return totalActiveDays;
  }

  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            weeks {
              contributionDays {
                contributionCount
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
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query,
        variables: {
          login: username,
          from: start.toISOString(),
          to: end.toISOString(),
        },
      }),
    },
    8000
  );

  if (!r.ok) return 0;

  const json = (await r.json()) as GitHubGraphQLResponse;
  const weeks = json.data?.user?.contributionsCollection?.contributionCalendar?.weeks ?? [];
  const days: GitHubContributionDay[] = weeks.flatMap((w) => w.contributionDays ?? []);

  return days.reduce((acc, d) => acc + (d.contributionCount > 0 ? 1 : 0), 0);
}

type SeriesPoint = { x: string | number; y: number };
type UmamiPageviewsResponse = { pageviews: SeriesPoint[]; sessions: SeriesPoint[] };

export async function getActiveDaysFromUmami(start: Date, end: Date): Promise<number> {
  const websiteId = process.env.UMAMI_WEBSITE_ID;
  const apiKey = process.env.UMAMI_API_KEY;

  if (!websiteId || !apiKey) return 0;

  const startAt = start.getTime();
  const endAt = end.getTime();

  const url =
    `https://api.umami.is/v1/websites/${websiteId}/pageviews` +
    `?startAt=${startAt}&endAt=${endAt}&unit=day&timezone=Asia/Jakarta`;

  const r = await fetchWithTimeout(
    url,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
    },
    8000
  );

  if (!r.ok) return 0;

  const data = (await r.json()) as UmamiPageviewsResponse;
  const series = Array.isArray(data?.pageviews) ? data.pageviews : [];

  return series.reduce((acc, p) => acc + (Number(p?.y) > 0 ? 1 : 0), 0);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  const { range } = req.query;
  const { start, end } = getRangeFromQuery(range);

  let wDays = 0;
  let gDays = 0;
  let wakatimeError: string | null = null;
  let githubError: string | null = null;

  try {
    wDays = await getActiveDaysFromWakaTime(range);
  } catch (e) {
    wakatimeError = String(e);
  }

  try {
    gDays = await getActiveDaysFromGitHub(range);
  } catch (e) {
    githubError = String(e);
  }

  const codingDays = Math.max(wDays, gDays);
  let codingSource: "wakatime" | "github" | "none" = "none";
  if (codingDays > 0) {
    codingSource = wDays >= gDays ? "wakatime" : "github";
  }

  let umamiDays: number | null = 0;
  let umamiError: string | null = null;

  try {
    umamiDays = await getActiveDaysFromUmami(start, end);
  } catch (e) {
    umamiError = String(e);
    umamiDays = 0;
  }

  const payload = {
    range: { start: toISODate(start), end: toISODate(end) },
    coding: { source: codingSource, activeDays: codingDays },
    traffic: { source: "umami", activeDays: umamiDays },
    debug: { wakatimeError, githubError, umamiError },
  };

  return res.status(200).json({
    success: true,
    source: "active-days",
    ...payload,
    data: payload,
  });
}
