import { CUBISM_CORE_CDN, CUBISM_CORE_LOCAL } from "@shared/live2d";

declare global {
  interface Window {
    Live2DCubismCore?: unknown;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[data-cubism-core="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), {
        once: true,
      });
      if (window.Live2DCubismCore) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.cubismCore = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

/** Cubism Core is proprietary — we never bundle it in git. Local file or official CDN. */
export async function ensureCubismCore(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Cubism Core can only load in the browser");
  }
  if (window.Live2DCubismCore) return;

  try {
    await loadScript(CUBISM_CORE_LOCAL);
    if (window.Live2DCubismCore) return;
  } catch {
    // fall through to the official CDN
  }

  await loadScript(CUBISM_CORE_CDN);
  if (!window.Live2DCubismCore) {
    throw new Error("Cubism Core loaded but window.Live2DCubismCore is missing");
  }
}

export function supportsLive2DStage(): { ok: boolean; reason?: string } {
  if (typeof window === "undefined") return { ok: false, reason: "ssr" };
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return { ok: false, reason: "reduced-motion" };
  }
  const canvas = document.createElement("canvas");
  const gl =
    canvas.getContext("webgl2") ||
    canvas.getContext("webgl") ||
    canvas.getContext("experimental-webgl");
  if (!gl) return { ok: false, reason: "no-webgl" };
  return { ok: true };
}
