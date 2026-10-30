import { useEffect } from "react";

export function useVisitorLogger() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Avoid duplicate logging within the same browser session
    const sessionKey = "logged_visit_session";
    const alreadyLogged = sessionStorage.getItem(sessionKey);
    if (alreadyLogged) return;

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
        sessionStorage.setItem(sessionKey, "true");
      } catch (err) {
        // Silent fail: do not disrupt user experience
      }
    }

    logVisit();
  }, []);
}

