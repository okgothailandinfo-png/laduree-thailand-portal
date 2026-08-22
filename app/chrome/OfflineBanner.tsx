"use client";

import { useEffect, useState } from "react";

/** Singapore offline banner wording — docs/singapore-ui-audit.md */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    function sync() {
      setOffline(!navigator.onLine);
    }
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="offline-banner" role="status">
      <p className="offline-banner__title">No Internet Connection.</p>
      <p className="offline-banner__body">
        Please check your internet connection and try again.
      </p>
    </div>
  );
}
