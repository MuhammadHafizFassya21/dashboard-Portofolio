import type { NextApiRequest, NextApiResponse } from "next";
import { createAdminToken } from "../../../lib/adminAuth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { pin } = req.body || {};
    const validPin = process.env.ADMIN_PIN || "210306";

    if (!pin || String(pin).trim() !== String(validPin).trim()) {
      return res.status(401).json({
        success: false,
        message: "PIN Admin salah!",
      });
    }

    // PIN matched, create signed admin token
    const token = createAdminToken();

    // Set secure HTTP-only cookie
    const isProd = process.env.NODE_ENV === "production";
    const cookieHeader = `admin_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${
      isProd ? "; Secure" : ""
    }`;
    res.setHeader("Set-Cookie", cookieHeader);

    return res.status(200).json({
      success: true,
      message: "Login berhasil",
      token,
    });
  } catch (err: any) {
    console.error("Admin login error:", err);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan internal server.",
    });
  }
}
