import type { NextApiRequest, NextApiResponse } from "next";
import { fetchWithTimeout } from "../../lib/fetchWithTimeout";
import { runGa4Report, normalizeRows } from "../../lib/ga4";

export type ActivityLogItem = {
  date: string;
  codingTime: string;
  codingSeconds: number;
  mainLanguage: string;
  projectName: string;
  commitsCount: number;
  views: number;
};

function formatSecondsToDigital(seconds: number): string {
  if (!seconds || seconds <= 0) return "0h 0m";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function getDatesArray(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const curr = new Date(startStr);
  const end = new Date(endStr);
  curr.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);

  let count = 0;
  while (curr <= end && count < 365) {
    dates.push(curr.toISOString().slice(0, 10));
    curr.setUTCDate(curr.getUTCDate() + 1);
    count++;
  }
  return dates;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  const todayStr = new Date().toISOString().slice(0, 10);
  const defaultStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const startDate = typeof req.query.startDate === "string" ? req.query.startDate : defaultStart;
  const endDate = typeof req.query.endDate === "string" ? req.query.endDate : todayStr;

  const dateList = getDatesArray(startDate, endDate);

  // Initialize maps
  const wakaMap = new Map<string, { seconds: number; mainLang: string; projectName: string }>();
  const githubMap = new Map<string, number>();
  const viewsMap = new Map<string, number>();

  dateList.forEach((d) => {
    wakaMap.set(d, { seconds: 0, mainLang: "-", projectName: "-" });
    githubMap.set(d, 0);
    viewsMap.set(d, 0);
  });

  const wakaKey = process.env.WAKATIME_API_KEY;
  const ghToken = process.env.GITHUB_TOKEN;
  const ghUser = process.env.GITHUB_USERNAME;
  const umamiKey = process.env.UMAMI_API_KEY;
  const umamiWebId = process.env.UMAMI_WEBSITE_ID;

  // 1. Fetch WakaTime Summaries
  if (wakaKey) {
    try {
      const url = `https://wakatime.com/api/v1/users/current/summaries?start=${startDate}&end=${endDate}`;
      const r = await fetchWithTimeout(
        url,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${wakaKey}:`).toString("base64")}`,
          },
        },
        8000
      );
      if (r.ok) {
        const json = await r.json();
        const days = Array.isArray(json.data) ? json.data : [];
        for (const day of days) {
          const date = day?.range?.date;
          if (date) {
            const seconds = day?.grand_total?.total_seconds ?? 0;
            const languages = Array.isArray(day?.languages) ? day.languages : [];
            const sortedLangs = [...languages].sort((a, b) => (b.total_seconds || 0) - (a.total_seconds || 0));
            const mainLang = sortedLangs[0]?.name ?? "-";

            const projects = Array.isArray(day?.projects) ? day.projects : [];
            const sortedProjects = [...projects].sort((a, b) => (b.total_seconds || 0) - (a.total_seconds || 0));
            const projectName = sortedProjects[0]?.name ?? "-";

            wakaMap.set(date, { seconds, mainLang, projectName });
          }
        }
      }
    } catch (e) {
      // safe fallback
    }
  }

  // 2. Fetch GitHub Contributions
  if (ghUser) {
    try {
      const fromIso = `${startDate}T00:00:00Z`;
      const toIso = `${endDate}T23:59:59Z`;
      const query = `
        query($login: String!, $from: DateTime!, $to: DateTime!) {
          user(login: $login) {
            contributionsCollection(from: $from, to: $to) {
              contributionCalendar {
                weeks {
                  contributionDays {
                    date
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
            "User-Agent": "dev-dashboard-app",
            ...(ghToken ? { Authorization: `Bearer ${ghToken}` } : {}),
          },
          body: JSON.stringify({
            query,
            variables: { login: ghUser, from: fromIso, to: toIso },
          }),
        },
        8000
      );
      if (r.ok) {
        const json = await r.json();
        const weeks = json.data?.user?.contributionsCollection?.contributionCalendar?.weeks ?? [];
        for (const w of weeks) {
          const days = w?.contributionDays ?? [];
          for (const d of days) {
            if (d?.date) {
              githubMap.set(d.date, d.contributionCount || 0);
            }
          }
        }
      }
    } catch (e) {
      // safe fallback
    }
  }

  // 3. Fetch Umami Views
  let hasUmamiViews = false;
  if (umamiKey && umamiWebId) {
    try {
      const startAt = new Date(startDate).getTime();
      const endAt = new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1;
      const url = `https://api.umami.is/v1/websites/${umamiWebId}/pageviews?startAt=${startAt}&endAt=${endAt}&unit=day&timezone=Asia/Jakarta`;
      const r = await fetchWithTimeout(
        url,
        {
          headers: { Authorization: `Bearer ${umamiKey}` },
        },
        8000
      );
      if (r.ok) {
        const data = await r.json();
        const series = Array.isArray(data?.pageviews) ? data.pageviews : [];
        series.forEach((pt: any) => {
          if (pt?.x) {
            const dateStr = new Date(pt.x).toISOString().slice(0, 10);
            const val = Number(pt.y) || 0;
            if (val > 0) hasUmamiViews = true;
            viewsMap.set(dateStr, val);
          }
        });
      }
    } catch (e) {
      // safe fallback
    }
  }

  // 4. Fetch GA4 Views if Umami not available or had 0 views
  if (!hasUmamiViews) {
    try {
      const response = await runGa4Report({
        dateRange: startDate,
        dimensions: ['date'],
        metrics: ['screenPageViews'],
      });
      const rows = normalizeRows(response);
      rows.forEach((row: any) => {
        let dateStr = row.date || '';
        if (dateStr.length === 8) {
          dateStr = `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
        }
        if (viewsMap.has(dateStr)) {
          viewsMap.set(dateStr, row.screenPageViews || 0);
        }
      });
    } catch (e) {
      // safe fallback
    }
  }

  // Construct combined response sorted descending by date
  const result: ActivityLogItem[] = dateList
    .map((date) => {
      const waka = wakaMap.get(date) || { seconds: 0, mainLang: "-", projectName: "-" };
      const commitsCount = githubMap.get(date) || 0;
      const views = viewsMap.get(date) || 0;

      return {
        date,
        codingTime: formatSecondsToDigital(waka.seconds),
        codingSeconds: waka.seconds,
        mainLanguage: waka.mainLang,
        projectName: waka.projectName,
        commitsCount,
        views,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return res.status(200).json({
    success: true,
    source: "activity-logs",
    startDate,
    endDate,
    data: result,
  });
}
