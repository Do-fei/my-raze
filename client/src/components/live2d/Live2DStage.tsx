import {
  OFFICIAL_LIVE2D_MODEL,
  resolveAvatarPhase,
  resolveExpression,
  type CompanionMood,
  type MessageEmotion,
} from "@shared/live2d";
import { Loader2 } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { supportsLive2DStage } from "@/lib/cubism-core";
import type { Live2DHandle } from "./Live2DCanvas";

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
  onReady,
}: Props) {
  const [failed, setFailed] = useState(false);
  const support = useMemo(() => supportsLive2DStage(), []);
  const reducedMotion = support.reason === "reduced-motion";
  const phase = resolveAvatarPhase({
    isRecording,
    isTranscribing,
    isThinking,
    isSpeaking,
  });
  const emotion = resolveExpression({ phase, mood, messageEmotion });
  const useCanvas = support.ok && !failed;

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
            mood={mood}
            reducedMotion={reducedMotion}
            onReady={onReady}
            onFail={() => setFailed(true)}
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
        {PHASE_LABEL[phase]} · {emotion}
      </div>
      <p className="pointer-events-none absolute bottom-1.5 left-0 right-0 text-center text-[10px] text-muted-foreground/80">
        {OFFICIAL_LIVE2D_MODEL.label}
      </p>
    </div>
  );
}
