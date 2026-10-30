import { useEffect } from "react";

export function useVisitorLogger() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Cooldown 30 menit per browser agar tidak spam log saat refresh/pindah halaman
    const STORAGE_KEY = "last_visitor_log_timestamp";
    const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

    const lastLogTime = localStorage.getItem(STORAGE_KEY);
    const now = Date.now();

    if (lastLogTime && now - parseInt(lastLogTime, 10) < COOLDOWN_MS) {
      return;
    }

    async function logVisit() {
      try {
        await fetch("/api/log-visitor", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: window.location.pathname || "/",
            referrer: document.referrer || "",
          }),
        });
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
      } catch (err) {
        // Silent fail: do not disrupt user experience
      }
    }

    logVisit();
  }, []);
}


