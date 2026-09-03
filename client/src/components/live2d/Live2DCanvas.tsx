import {
  computeLive2DLayout,
  CUBISM_CORE_CDN,
  emotionToPreset,
  OFFICIAL_LIVE2D_MODEL,
  type AvatarPhase,
  type CompanionMood,
  type MessageEmotion,
} from "@shared/live2d";
import { useEffect, useRef } from "react";
import { ensureCubismCore } from "@/lib/cubism-core";

type CoreModel = {
  setParameterValueById?: (id: string, value: number, weight?: number) => void;
};

type EngineModel = {
  anchor: { set: (x: number, y: number) => void };
  position: { set: (x: number, y: number) => void };
  scale: { set: (x: number, y?: number) => void };
  width: number;
  height: number;
  internalModel?: {
    coreModel?: CoreModel;
    originalWidth?: number;
    originalHeight?: number;
    width?: number;
    height?: number;
  };
  focus: (x: number, y: number, instant?: boolean) => void;
  tap: (x: number, y: number) => void;
  motion: (group: string, index?: number) => Promise<boolean>;
  speak?: (
    sound: string,
    opts?: { volume?: number; onFinish?: () => void; onError?: (e: Error) => void }
  ) => Promise<boolean>;
  stopSpeaking?: () => void;
  destroy: (options?: { children?: boolean }) => void;
  on: (event: string, fn: (...args: unknown[]) => void) => void;
};

export type Live2DHandle = {
  setMouth: (value: number) => void;
  speakAudio: (url: string) => Promise<void>;
  stopAudio: () => void;
  playReact: (emotion?: MessageEmotion) => void;
};

type Props = {
  phase: AvatarPhase;
  emotion: MessageEmotion;
  mood?: CompanionMood | null;
  reducedMotion?: boolean;
  onReady?: (handle: Live2DHandle) => void;
  onFail?: (reason: string) => void;
  onHit?: (areas: string[]) => void;
};

function applyParams(model: EngineModel | null, params: Record<string, number>) {
  const core = model?.internalModel?.coreModel;
  if (!core?.setParameterValueById) return;
  for (const [id, value] of Object.entries(params)) {
    try {
      core.setParameterValueById(id, value);
    } catch {
      // Parameter may not exist on this model.
    }
  }
}

function intrinsicModelSize(model: EngineModel): { w: number; h: number } {
  const internal = model.internalModel;
  const w = internal?.originalWidth || internal?.width || 2048;
  const h = internal?.originalHeight || internal?.height || 2048;
  return { w, h };
}

function layoutModel(model: EngineModel, viewW: number, viewH: number) {
  const { w, h } = intrinsicModelSize(model);
  const layout = computeLive2DLayout(viewW, viewH, w, h);
  model.scale.set(layout.scale);
  model.anchor.set(layout.anchorX, layout.anchorY);
  model.position.set(layout.x, layout.y);
}

export function Live2DCanvas({
  phase,
  emotion,
  reducedMotion,
  onReady,
  onFail,
  onHit,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<EngineModel | null>(null);
  // Pixi container typing is heavy; the engine model is a Container at runtime.
  const pixiModel = (m: EngineModel) => m as never;
  const mouthRef = useRef(0);
  const emotionRef = useRef(emotion);
  const phaseRef = useRef(phase);
  const onReadyRef = useRef(onReady);
  const onFailRef = useRef(onFail);
  const onHitRef = useRef(onHit);

  emotionRef.current = emotion;
  phaseRef.current = phase;
  onReadyRef.current = onReady;
  onFailRef.current = onFail;
  onHitRef.current = onHit;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    // Avoid fighting Pixi Application generics in this wrapper.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let app: any = null;
    let resizeObserver: ResizeObserver | null = null;

    const boot = async () => {
      try {
        await ensureCubismCore();
        const pixi = await import("pixi.js");
        const engine = await import("untitled-pixi-live2d-engine/cubism");
        if (disposed) return;

        try {
          pixi.extensions.add(engine.Live2DPlugin);
        } catch {
          // Plugin already registered on remount.
        }

        const application = new pixi.Application();
        await application.init({
          backgroundAlpha: 0,
          antialias: true,
          preference: "webgl",
          autoDensity: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          resizeTo: host,
        });
        if (disposed) {
          application.destroy(true, { children: true });
          return;
        }
        app = application;
        application.canvas.style.width = "100%";
        application.canvas.style.height = "100%";
        application.canvas.style.display = "block";
        application.canvas.style.touchAction = "none";
        host.appendChild(application.canvas);

        const model = (await engine.Live2DModel.from(OFFICIAL_LIVE2D_MODEL.model3, {
          autoInteract: false,
          autoUpdate: true,
        })) as unknown as EngineModel;
        if (disposed) {
          model.destroy({ children: true });
          return;
        }
        modelRef.current = model;
        layoutModel(model, application.screen.width, application.screen.height);
        application.stage.addChild(pixiModel(model));

        model.on("hit", (...args: unknown[]) => {
          const areas = (args[0] as string[]) ?? [];
          onHitRef.current?.(areas);
          void model.motion("TapBody");
        });

        application.ticker.add(() => {
          const current = modelRef.current;
          if (!current) return;
          applyParams(current, emotionToPreset(emotionRef.current).params);
          if (phaseRef.current === "speaking" || mouthRef.current > 0.01) {
            applyParams(current, { ParamMouthOpenY: mouthRef.current });
          }
        });

        const handle: Live2DHandle = {
          setMouth: (value) => {
            mouthRef.current = Math.max(0, Math.min(1, value));
          },
          speakAudio: async (url) => {
            if (typeof model.speak === "function") {
              await model.speak(url, { volume: 1 });
            }
          },
          stopAudio: () => {
            model.stopSpeaking?.();
            mouthRef.current = 0;
          },
          playReact: (nextEmotion) => {
            const current = modelRef.current;
            if (!current) return;
            const preset = nextEmotion ? emotionToPreset(nextEmotion) : null;
            void current.motion(preset?.motionGroup ?? "TapBody", preset?.motionIndex);
          },
        };
        onReadyRef.current?.(handle);

        if (!reducedMotion) {
          void model.motion("Idle");
        }

        resizeObserver = new ResizeObserver(() => {
          if (!modelRef.current || !app) return;
          layoutModel(modelRef.current, app.screen.width, app.screen.height);
        });
        resizeObserver.observe(host);

        const onPointerMove = (event: PointerEvent) => {
          if (reducedMotion || !modelRef.current || !app) return;
          const rect = app.canvas.getBoundingClientRect();
          modelRef.current.focus(event.clientX - rect.left, event.clientY - rect.top);
        };
        const onPointerTap = (event: PointerEvent) => {
          if (!modelRef.current || !app) return;
          const rect = app.canvas.getBoundingClientRect();
          modelRef.current.tap(event.clientX - rect.left, event.clientY - rect.top);
        };
        host.addEventListener("pointermove", onPointerMove);
        host.addEventListener("pointerdown", onPointerTap);
        host.addEventListener("pointerleave", () => {
          if (!modelRef.current || !app) return;
          modelRef.current.focus(app.screen.width / 2, app.screen.height / 2);
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("[Live2D] stage failed, falling back to portrait:", message, {
          cubismCdn: CUBISM_CORE_CDN,
        });
        onFailRef.current?.(message);
      }
    };

    void boot();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      try {
        modelRef.current?.destroy({ children: true });
      } catch {
        // already torn down
      }
      modelRef.current = null;
      if (app) {
        try {
          app.destroy(true, { children: true });
        } catch {
          // pixi may already be destroyed
        }
      }
      host.replaceChildren();
    };
  }, [reducedMotion]);

  return <div ref={hostRef} className="absolute inset-0" />;
}
