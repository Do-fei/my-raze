import { useCallback, useState } from "react";
import { normalizeLive2DScale } from "@shared/live2d";
const STORAGE_KEY = "live2d-character-scale";
export function useLive2DScale() {
  const [scale, setScale] = useState(() => {
    try { return normalizeLive2DScale(Number(localStorage.getItem(STORAGE_KEY) ?? 1)); }
    catch { return 1; }
  });
  const updateScale = useCallback((value: number) => {
    const next = normalizeLive2DScale(value);
    setScale(next);
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* Still usable without storage. */ }
  }, []);
  return { scale, updateScale };
}
