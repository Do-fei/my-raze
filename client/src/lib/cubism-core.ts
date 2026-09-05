import { CUBISM_CORE_CDN, CUBISM_CORE_LOCAL } from "@shared/live2d";

declare global {
  interface Window {
    Live2DCubismCore?: unknown;
  }
}

const pendingScripts = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  const pending = pendingScripts.get(src);
  if (pending) return pending;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.cubismCore = src;
    const finish = (error?: Error) => {
      window.clearTimeout(timer);
      script.onload = null;
      script.onerror = null;
      if (error) script.remove();
      error ? reject(error) : resolve();
    };
    const timer = window.setTimeout(
      () => finish(new Error(`Timed out loading ${src}`)),
      15_000
    );
    script.onload = () => finish(window.Live2DCubismCore
      ? undefined
      : new Error(`Cubism Core missing after loading ${src}`));
    script.onerror = () => finish(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
  pendingScripts.set(src, promise);
  void promise.then(
    () => pendingScripts.delete(src),
    () => pendingScripts.delete(src)
  );
  return promise;
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
