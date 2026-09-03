import { LIVE2D_PREF_KEY, shouldEnableLive2D } from "@shared/live2d";
import { useCallback, useEffect, useState } from "react";

export function readLive2DPreference(): boolean {
  if (typeof window === "undefined") return true;
  return shouldEnableLive2D(localStorage.getItem(LIVE2D_PREF_KEY));
}

export function useLive2DPreference() {
  const [enabled, setEnabled] = useState(readLive2DPreference);

  useEffect(() => {
    const sync = () => setEnabled(readLive2DPreference());
    window.addEventListener("storage", sync);
    window.addEventListener("live2d-pref", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("live2d-pref", sync);
    };
  }, []);

  const update = useCallback((next: boolean) => {
    localStorage.setItem(LIVE2D_PREF_KEY, String(next));
    setEnabled(next);
    window.dispatchEvent(new Event("live2d-pref"));
  }, []);

  return { enabled, setEnabled: update };
}
