import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { fetchWithTimeout } from "../../lib/fetchWithTimeout";

export type VisitorLogEntry = {
  id: string;
  timestamp: string;
  ip: string;
  device: "Mobile" | "Tablet" | "Desktop";
  os: "iOS" | "Android" | "Windows" | "macOS" | "Linux" | "Other";
  browser: "Chrome" | "Safari" | "Firefox" | "Edge" | "Opera" | "Other";
  referrer: string;
  path: string;
};

export type VisitorLogsData = {
  lastUpdated: string;
  totalVisits: number;
  logs: VisitorLogEntry[];
};

const LOCAL_DATA_FILE = path.join(process.cwd(), "data", "visitor-logs.json");

function parseUserAgent(ua: string): {
  device: "Mobile" | "Tablet" | "Desktop";
  os: "iOS" | "Android" | "Windows" | "macOS" | "Linux" | "Other";
  browser: "Chrome" | "Safari" | "Firefox" | "Edge" | "Opera" | "Other";
} {
  const lower = ua.toLowerCase();

  // Device detection
  let device: "Mobile" | "Tablet" | "Desktop" = "Desktop";
  if (/ipad|tablet|(android(?!.*mobile))/i.test(lower)) {
    device = "Tablet";
  } else if (/iphone|ipod|android.*mobile|blackberry|windows phone|mobile/i.test(lower)) {
    device = "Mobile";
  }

  // OS detection
  let os: "iOS" | "Android" | "Windows" | "macOS" | "Linux" | "Other" = "Other";
  if (/iphone|ipad|ipod/i.test(lower)) {
    os = "iOS";
  } else if (/android/i.test(lower)) {
    os = "Android";
  } else if (/windows nt|win64|win32/i.test(lower)) {
    os = "Windows";
  } else if (/mac os x|macintosh/i.test(lower)) {
    os = "macOS";
  } else if (/linux/i.test(lower)) {
    os = "Linux";
  }

  // Browser detection
  let browser: "Chrome" | "Safari" | "Firefox" | "Edge" | "Opera" | "Other" = "Other";
  if (/edg\/|edge\//i.test(lower)) {
    browser = "Edge";
  } else if (/opr\/|opera/i.test(lower)) {
    browser = "Opera";
  } else if (/chrome\/|crios\//i.test(lower)) {
    browser = "Chrome";
  } else if (/firefox\/|fxios\//i.test(lower)) {
    browser = "Firefox";
  } else if (/safari/i.test(lower)) {
    browser = "Safari";
  }

  return { device, os, browser };
}

function parseReferrer(rawReferrer?: string): string {
  if (!rawReferrer || rawReferrer.trim() === "") return "Direct";
  const lower = rawReferrer.toLowerCase();
  if (lower.includes("instagram.com")) return "Instagram";
  if (lower.includes("linkedin.com")) return "LinkedIn";
  if (lower.includes("google.")) return "Google";
  if (lower.includes("github.com")) return "GitHub";
  if (lower.includes("twitter.com") || lower.includes("t.co") || lower.includes("x.com")) return "Twitter / X";
  if (lower.includes("youtube.com")) return "YouTube";
  if (lower.includes("tiktok.com")) return "TikTok";
  try {
    const url = new URL(rawReferrer);
    return url.hostname.replace("www.", "");
  } catch {
    return rawReferrer.slice(0, 50);
  }
}

function readLocalVisitorLogs(): VisitorLogsData {
  try {
    if (fs.existsSync(LOCAL_DATA_FILE)) {
      const content = fs.readFileSync(LOCAL_DATA_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (e) {
    console.error("Local read error:", e);
  }
  return {
    lastUpdated: new Date().toISOString(),
    totalVisits: 0,
    logs: [],
  };
}

function writeLocalVisitorLogs(data: VisitorLogsData) {
  try {
    const dir = path.dirname(LOCAL_DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("Local write error:", e);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Allow GET to read or POST to log
  if (req.method === "GET") {
    try {
      const data = readLocalVisitorLogs();
      return res.status(200).json({ success: true, data });
    } catch {
      return res.status(200).json({ success: true, data: { lastUpdated: new Date().toISOString(), totalVisits: 0, logs: [] } });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    // 1. Detect visitor metadata
    const rawIp =
      (req.headers["x-forwarded-for"] as string) ||
      (req.headers["x-real-ip"] as string) ||
      req.socket.remoteAddress ||
      "127.0.0.1";
    const ip = rawIp.split(",")[0].trim();

    const userAgent = (req.headers["user-agent"] as string) || "";
    const { device, os, browser } = parseUserAgent(userAgent);

    const rawRef =
      req.body?.referrer ||
      (req.headers["referer"] as string) ||
      (req.headers["referrer"] as string) ||
      "";
    const referrer = parseReferrer(rawRef);

    const visitPath = req.body?.path || "/";
    const nowIso = new Date().toISOString();

    const newLog: VisitorLogEntry = {
      id: `vis-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: nowIso,
      ip,
      device,
      os,
      browser,
      referrer,
      path: visitPath,
    };

    // 2. Read current visitor logs (prefer local file first, fallback to initial)
    let currentData = readLocalVisitorLogs();

    // 3. GitHub API sync attempt
    const token = process.env.GITHUB_TOKEN;
    const username = process.env.GITHUB_USERNAME || "MuhammadHafizFassya21";
    const repo = process.env.GITHUB_REPO || "dashboard-Portofolio";
    const filePath = "data/visitor-logs.json";

    if (token && username && repo) {
      try {
        const ghHeaders = {
          Authorization: `Bearer ${token}`,
          "User-Agent": "dev-dashboard-visitor-tracker",
          Accept: "application/vnd.github.v3+json",
        };

        const getUrl = `https://api.github.com/repos/${username}/${repo}/contents/${filePath}`;
        const getRes = await fetchWithTimeout(getUrl, { headers: ghHeaders }, 4000);

        let fileSha: string | undefined;

        if (getRes.ok) {
          const ghJson = await getRes.json();
          fileSha = ghJson.sha;
          if (ghJson.content) {
            const decodedStr = Buffer.from(ghJson.content, "base64").toString("utf-8");
            currentData = JSON.parse(decodedStr);
          }
        }

        // Prepend new visitor log and cap at 500
        const updatedLogs = [newLog, ...(currentData.logs || [])].slice(0, 500);
        const updatedData: VisitorLogsData = {
          lastUpdated: nowIso,
          totalVisits: (currentData.totalVisits || 0) + 1,
          logs: updatedLogs,
        };

        // Write locally
        writeLocalVisitorLogs(updatedData);

        // THROTTLING GITHUB COMMIT:
        // Jangan commit setiap request. Commit hanya jika:
        // 1. Commit terakhir sudah lebih dari 15 menit yang lalu, ATAU
        // 2. Kunjungan baru bertambah minimal 5 kunjungan (batch)
        const lastCommitTime = currentData.lastUpdated ? new Date(currentData.lastUpdated).getTime() : 0;
        const timeDiffMinutes = (Date.now() - lastCommitTime) / (1000 * 60);

        if (timeDiffMinutes >= 15 || (updatedData.totalVisits % 5 === 0)) {
          const putUrl = `https://api.github.com/repos/${username}/${repo}/contents/${filePath}`;
          const commitBody: any = {
            message: `chrono: sync visitor logs (${updatedData.totalVisits} visits)`,
            content: Buffer.from(JSON.stringify(updatedData, null, 2)).toString("base64"),
          };
          if (fileSha) {
            commitBody.sha = fileSha;
          }

          // Fire PUT request with 5s timeout
          await fetchWithTimeout(
            putUrl,
            {
              method: "PUT",
              headers: {
                ...ghHeaders,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(commitBody),
            },
            5000
          );
        }

        return res.status(200).json({
          success: true,
          message: "Visitor logged successfully",
          data: { totalVisits: updatedData.totalVisits, newLog },
        });
      } catch (ghErr) {
        console.error("GitHub commit fallback error:", ghErr);
      }
    }

    // Local fallback update if GitHub commit skipped or failed
    const updatedLogs = [newLog, ...(currentData.logs || [])].slice(0, 500);
    const updatedData: VisitorLogsData = {
      lastUpdated: nowIso,
      totalVisits: (currentData.totalVisits || 0) + 1,
      logs: updatedLogs,
    };
    writeLocalVisitorLogs(updatedData);

    return res.status(200).json({
      success: true,
      message: "Visitor logged locally",
      data: { totalVisits: updatedData.totalVisits, newLog },
    });
  } catch (err: any) {
    // Silent fail guard: always return 200 so web visitors are never blocked or disrupted
    console.error("Visitor logger unexpected error:", err);
    return res.status(200).json({
      success: true,
      message: "Visitor logged (silent fail guard)",
    });
  }
}
