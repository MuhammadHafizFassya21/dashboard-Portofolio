import type { NextApiRequest, NextApiResponse } from "next";
import { verifyAdminToken } from "../../../lib/adminAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    // Extract token from cookies or Authorization header
    const cookieToken = req.cookies["admin_session"];
    const authHeader = req.headers["authorization"] || "";
    const bearerToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : undefined;

    const token = cookieToken || bearerToken;
    const isValid = verifyAdminToken(token);

    if (isValid) {
      return res.status(200).json({
        authenticated: true,
        message: "Sesi admin valid.",
      });
    }

    return res.status(200).json({
      authenticated: false,
      message: "Belum terautentikasi.",
    });
  } catch (err: any) {
    console.error("Admin verify error:", err);
    return res.status(200).json({
      authenticated: false,
      message: "Gagal memverifikasi sesi.",
    });
  }
}
