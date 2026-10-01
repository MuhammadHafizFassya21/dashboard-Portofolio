import type { NextApiRequest, NextApiResponse } from "next";
import { fetchWithTimeout } from "../../lib/fetchWithTimeout";

type Day = { date: string; contributionCount: number; color: string };
type Week = { contributionDays: Day[] };

export type GithubStatsResponse = {
  success: boolean;
  source: string;
  message?: string;
  totalContributions: number;
  totalCommits: number;
  totalRepositories: number;
  totalPullRequests: number;
  totalIssues: number;
  mostActiveRepo: {
    name: string;
    contributions: number;
    language?: string;
    color?: string;
  } | null;
  mostActiveLanguage: {
    name: string;
    count: number;
    color?: string;
  } | null;
  weeks: Week[];
  data: any;
};

const FALLBACK_CALENDAR: GithubStatsResponse = {
  success: false,
  source: "github",
  message: "Fallback data used: Missing token or GitHub API rate limit/error",
  totalContributions: 0,
  totalCommits: 0,
  totalRepositories: 0,
  totalPullRequests: 0,
  totalIssues: 0,
  mostActiveRepo: null,
  mostActiveLanguage: null,
  weeks: [],
  data: {},
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

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
      // 1. Fetch all years and repositories
      const yearsQuery = `
        query($login: String!) {
          user(login: $login) {
            repositories(first: 100, ownerAffiliations: [OWNER]) {
              totalCount
              nodes {
                name
                primaryLanguage { name color }
              }
            }
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
      const user = yearsJson.data?.user;
      const years: number[] = user?.contributionsCollection?.contributionYears ?? [];
      const totalRepositories = user?.repositories?.totalCount || 0;

      // Extract repository languages
      const langCount: Record<string, number> = {};
      const langColorMap: Record<string, string> = {};
      user?.repositories?.nodes?.forEach((r: any) => {
        if (r.primaryLanguage?.name) {
          const l = r.primaryLanguage.name;
          langCount[l] = (langCount[l] || 0) + 1;
          langColorMap[l] = r.primaryLanguage.color;
        }
      });

      const sortedLangs = Object.entries(langCount).sort((a, b) => b[1] - a[1]);
      const mostActiveLanguage = sortedLangs.length > 0 ? {
        name: sortedLangs[0][0],
        count: sortedLangs[0][1],
        color: langColorMap[sortedLangs[0][0]] || "#3178c6"
      } : null;

      let totalContributions = 0;
      let totalCommits = 0;
      let totalPullRequests = 0;
      let totalIssues = 0;
      const repoContributionsMap: Record<string, { count: number; language?: string; color?: string }> = {};
      let heatmapCal: { totalContributions: number; weeks: Week[] } | null = null;

      const totalsPromises = years.map((year) => {
        const from = `${year}-01-01T00:00:00Z`;
        const to = `${year}-12-31T23:59:59Z`;
        const q = `
          query($login: String!, $from: DateTime!, $to: DateTime!) {
            user(login: $login) {
              contributionsCollection(from: $from, to: $to) {
                totalCommitContributions
                totalIssueContributions
                totalPullRequestContributions
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
                commitContributionsByRepository(maxRepositories: 50) {
                  contributions { totalCount }
                  repository {
                    name
                    primaryLanguage { name color }
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
        const cc = resItem.data?.user?.contributionsCollection;
        const count = cc?.contributionCalendar?.totalContributions ?? 0;
        totalContributions += count;
        totalCommits += cc?.totalCommitContributions ?? 0;
        totalPullRequests += cc?.totalPullRequestContributions ?? 0;
        totalIssues += cc?.totalIssueContributions ?? 0;

        cc?.commitContributionsByRepository?.forEach((item: any) => {
          const repoName = item.repository?.name;
          if (repoName) {
            const current = repoContributionsMap[repoName]?.count || 0;
            repoContributionsMap[repoName] = {
              count: current + (item.contributions?.totalCount || 0),
              language: item.repository?.primaryLanguage?.name,
              color: item.repository?.primaryLanguage?.color,
            };
          }
        });

        if (index === 0 && cc?.contributionCalendar) {
          heatmapCal = cc.contributionCalendar;
        }
      }

      const sortedRepos = Object.entries(repoContributionsMap).sort((a, b) => b[1].count - a[1].count);
      const mostActiveRepo = sortedRepos.length > 0 ? {
        name: sortedRepos[0][0],
        contributions: sortedRepos[0][1].count,
        language: sortedRepos[0][1].language,
        color: sortedRepos[0][1].color,
      } : null;

      const weeks: Week[] = (heatmapCal as any)?.weeks ?? [];
      const payload: GithubStatsResponse = {
        success: true,
        source: "github",
        totalContributions,
        totalCommits,
        totalRepositories,
        totalPullRequests,
        totalIssues,
        mostActiveRepo,
        mostActiveLanguage,
        weeks,
        data: {
          totalContributions,
          totalCommits,
          totalRepositories,
          totalPullRequests,
          totalIssues,
          mostActiveRepo,
          mostActiveLanguage,
          weeks,
        },
      };

      return res.status(200).json(payload);
    }

    // Date-based range
    const to = new Date();
    const from = new Date();
    if (range === "7D") {
      from.setDate(to.getDate() - 7);
    } else if (range === "30D") {
      from.setDate(to.getDate() - 30);
    } else if (range === "90D") {
      from.setDate(to.getDate() - 90);
    } else {
      from.setDate(to.getDate() - 365);
    }

    const query = `
      query($login: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $login) {
          repositories(first: 100, ownerAffiliations: [OWNER]) {
            totalCount
            nodes {
              name
              primaryLanguage { name color }
            }
          }
          contributionsCollection(from: $from, to: $to) {
            totalCommitContributions
            totalIssueContributions
            totalPullRequestContributions
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
            commitContributionsByRepository(maxRepositories: 30) {
              contributions {
                totalCount
              }
              repository {
                name
                primaryLanguage { name color }
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
    const user = json.data?.user;
    const cc = user?.contributionsCollection;

    if (json.errors || !cc?.contributionCalendar) {
      return res.status(200).json(FALLBACK_CALENDAR);
    }

    const totalContributions = cc.contributionCalendar.totalContributions ?? 0;
    const totalCommits = cc.totalCommitContributions ?? 0;
    const totalRepositories = user?.repositories?.totalCount ?? 0;
    const totalPullRequests = cc.totalPullRequestContributions ?? 0;
    const totalIssues = cc.totalIssueContributions ?? 0;
    const weeks: Week[] = cc.contributionCalendar.weeks ?? [];

    // Most active repo
    const commitRepos = cc.commitContributionsByRepository || [];
    let mostActiveRepo = null;
    if (commitRepos.length > 0) {
      const sorted = [...commitRepos].sort((a: any, b: any) => (b.contributions?.totalCount || 0) - (a.contributions?.totalCount || 0));
      mostActiveRepo = {
        name: sorted[0].repository.name,
        contributions: sorted[0].contributions.totalCount,
        language: sorted[0].repository.primaryLanguage?.name,
        color: sorted[0].repository.primaryLanguage?.color,
      };
    }

    // Most active language from repositories
    const langCount: Record<string, number> = {};
    const langColorMap: Record<string, string> = {};
    user?.repositories?.nodes?.forEach((repoItem: any) => {
      if (repoItem.primaryLanguage?.name) {
        const l = repoItem.primaryLanguage.name;
        langCount[l] = (langCount[l] || 0) + 1;
        langColorMap[l] = repoItem.primaryLanguage.color;
      }
    });

    const sortedLangs = Object.entries(langCount).sort((a, b) => b[1] - a[1]);
    const mostActiveLanguage = sortedLangs.length > 0 ? {
      name: sortedLangs[0][0],
      count: sortedLangs[0][1],
      color: langColorMap[sortedLangs[0][0]] || "#3178c6"
    } : null;

    const payload: GithubStatsResponse = {
      success: true,
      source: "github",
      totalContributions,
      totalCommits,
      totalRepositories,
      totalPullRequests,
      totalIssues,
      mostActiveRepo,
      mostActiveLanguage,
      weeks,
      data: {
        totalContributions,
        totalCommits,
        totalRepositories,
        totalPullRequests,
        totalIssues,
        mostActiveRepo,
        mostActiveLanguage,
        weeks,
      },
    };

    return res.status(200).json(payload);
  } catch (err: any) {
    return res.status(200).json({
      ...FALLBACK_CALENDAR,
      message: `Fallback data used: ${err.message}`,
    });
  }
}
