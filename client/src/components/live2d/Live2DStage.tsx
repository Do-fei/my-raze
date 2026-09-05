import {
  MESSAGE_EMOTION_LABELS,
  OFFICIAL_LIVE2D_MODEL,
  PLAYFUL_EMOTION_LABELS,
  PLAYFUL_EMOTIONS,
  PLAYFUL_OVERRIDE_MS,
  nextPlayfulEmotion,
  type CompanionMood,
  type MessageEmotion,
  type PlayfulEmotion,
} from "@shared/live2d";
import { Loader2 } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supportsLive2DStage } from "@/lib/cubism-core";
import { cn } from "@/lib/utils";
import type { Live2DHandle } from "./Live2DCanvas";
import { useAvatarController } from "./useAvatarController";

const Live2DCanvas = lazy(() =>
  import("./Live2DCanvas").then((m) => ({ default: m.Live2DCanvas }))
);

type Props = {
  name: string;
  portraitUrl?: string | null;
  isRecording?: boolean;
  isTranscribing?: boolean;
  isThinking?: boolean;
  isSpeaking?: boolean;
  mood?: CompanionMood | null;
  messageEmotion?: MessageEmotion | null;
  replySequence?: number;
  onReady?: (handle: Live2DHandle) => void;
};

const PHASE_LABEL: Record<string, string> = {
  idle: "在看你",
  listening: "在听",
  thinking: "在想",
  speaking: "在说",
};

function PortraitFallback({
  name,
  portraitUrl,
  label,
}: {
  name: string;
  portraitUrl?: string | null;
  label: string;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-b from-violet-100/40 via-pink-50/30 to-background dark:from-violet-950/40 dark:via-background">
      {portraitUrl ? (
        <img
          src={portraitUrl}
          alt={name}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-6xl">
          ♡
        </div>
      )}
      <p className="pointer-events-none absolute bottom-2 text-[11px] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export function Live2DStage({
  name,
  portraitUrl,
  isRecording,
  isTranscribing,
  isThinking,
  isSpeaking,
  mood,
  messageEmotion,
  replySequence = 0,
  onReady,
}: Props) {
  const [failed, setFailed] = useState(false);
  const [userOverride, setUserOverride] = useState<PlayfulEmotion | null>(null);
  const [overrideTick, setOverrideTick] = useState(0);
  const handleRef = useRef<Live2DHandle | null>(null);
  const support = useMemo(() => supportsLive2DStage(), []);
  const reducedMotion = support.reason === "reduced-motion";
  const { phase, emotion } = useAvatarController({
    isRecording,
    isTranscribing,
    isThinking,
    isSpeaking,
    mood,
    messageEmotion,
    userOverride,
  });
  const useCanvas = support.ok && !failed;

  useEffect(() => {
    setUserOverride(null);
  }, [messageEmotion, replySequence]);

  useEffect(() => {
    if (!userOverride) return;
    const timer = window.setTimeout(() => setUserOverride(null), PLAYFUL_OVERRIDE_MS);
    return () => window.clearTimeout(timer);
  }, [userOverride, overrideTick]);

  const handleReady = useCallback(
    (next: Live2DHandle) => {
      handleRef.current = next;
      onReady?.(next);
    },
    [onReady]
  );

  const playPlayful = useCallback((next: PlayfulEmotion) => {
    setUserOverride(next);
    setOverrideTick((tick) => tick + 1);
    handleRef.current?.playReact(next);
  }, []);

  const handleHit = useCallback(() => {
    setUserOverride((prev) => {
      const next = nextPlayfulEmotion(prev);
      queueMicrotask(() => handleRef.current?.playReact(next));
      return next;
    });
    setOverrideTick((tick) => tick + 1);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-violet-50/80 to-background dark:from-violet-950/50">
      {useCanvas ? (
        <Suspense
          fallback={
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          }
        >
          <Live2DCanvas
            phase={phase}
            emotion={emotion}
            replySequence={replySequence}
            mood={mood}
            reducedMotion={reducedMotion}
            onReady={handleReady}
            onFail={() => setFailed(true)}
            onHit={handleHit}
          />
        </Suspense>
      ) : (
        <PortraitFallback
          name={name}
          portraitUrl={portraitUrl}
          label={
            reducedMotion
              ? "已按系统设置使用静态立绘"
              : "Live2D 暂不可用，显示立绘"
          }
        />
      )}

      <div className="pointer-events-none absolute left-2 top-2 rounded-full bg-background/70 px-2 py-0.5 text-[10px] text-muted-foreground backdrop-blur">
        {PHASE_LABEL[phase]} · {MESSAGE_EMOTION_LABELS[emotion]}
      </div>

      {useCanvas && userOverride === "flirty" && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="absolute left-[46%] top-[34%] animate-bounce text-3xl text-pink-500 drop-shadow">
            ♡
          </span>
          <span className="absolute left-[54%] top-[30%] animate-bounce text-xl text-rose-400 delay-150 drop-shadow">
            ♡
          </span>
          <span className="absolute left-[50%] top-[26%] animate-bounce text-lg text-pink-400 delay-300 drop-shadow">
            ♡
          </span>
        </div>
      )}

      {useCanvas && (
        <div className="absolute bottom-6 left-1 right-1 z-10 flex flex-wrap justify-center gap-1 px-1">
          {PLAYFUL_EMOTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => playPlayful(item)}
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] leading-5 shadow-sm backdrop-blur transition-colors",
                userOverride === item
                  ? "bg-primary text-primary-foreground"
                  : "bg-background/80 text-foreground hover:bg-background"
              )}
            >
              {PLAYFUL_EMOTION_LABELS[item]}
            </button>
          ))}
        </div>
      )}

      <p className="pointer-events-none absolute bottom-1 left-0 right-0 text-center text-[10px] text-muted-foreground/80">
        {useCanvas ? "点她或点下面的按钮看表情" : OFFICIAL_LIVE2D_MODEL.label}
      </p>
    </div>
  );
}
