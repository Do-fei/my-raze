import { DEFAULT_GIRLFRIEND } from "./defaultGirlfriend";

/** Unified avatar runtime phase for the Live2D stage. */
export type AvatarPhase = "idle" | "listening" | "thinking" | "speaking";

/** Server mood ladder already stored on girlfriendMoods. */
export type CompanionMood =
  | "excited"
  | "happy"
  | "content"
  | "neutral"
  | "lonely"
  | "sad";

/** Per-message emotion the model is asked to emit (or we infer). */
export type MessageEmotion =
  | "shy"
  | "happy"
  | "angry"
  | "sad"
  | "listening"
  | "neutral";

export const LIVE2D_PREF_KEY = "live2d-enabled";

/** Bundled official sample (Hiyori). Swap this path when the Raze model arrives. */
export const OFFICIAL_LIVE2D_MODEL = {
  id: "official-hiyori-placeholder",
  model3: "/live2d/official/Hiyori.model3.json",
  label: "Raze（开发占位：Live2D 官方示例 Hiyori）",
} as const;

export const CUBISM_CORE_LOCAL = "/live2d/runtime/live2dcubismcore.min.js";
export const CUBISM_CORE_CDN =
  "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js";

const EMOTION_VALUES: MessageEmotion[] = [
  "shy",
  "happy",
  "angry",
  "sad",
  "listening",
  "neutral",
];

export const LIVE2D_EMOTION_TAG =
  /\[\[\s*emotion\s*:\s*(shy|happy|angry|sad|listening|neutral)\s*\]\]/gi;

export const LIVE2D_EMOTION_SYSTEM_CLAUSE = `
【Live2D 表情（用户不可见）】
每条回复的最后单独一行写 [[emotion:标签]]，标签只能是 shy / happy / angry / sad / listening / neutral 之一。
不要解释这个标签，不要把它念出来。`;

const POSITIVE_HINTS = [
  "爱",
  "喜欢",
  "开心",
  "快乐",
  "哈哈",
  "嘻嘻",
  "嘿嘿",
  "棒",
  "好呀",
  "好啊",
  "想你",
  "♡",
  "♥",
  "❤",
  "love",
  "happy",
  "hehe",
  "haha",
];

const SHY_HINTS = [
  "害羞",
  "羞",
  "脸红",
  "人家",
  "不要这样",
  "讨厌啦",
  "才不是",
  "哼",
  "…",
  "...",
  "shy",
  "embarrass",
];

const ANGRY_HINTS = [
  "生气",
  "讨厌",
  "哼！",
  "不理你",
  "坏蛋",
  "气死",
  "stupid",
  "angry",
  "hate",
];

const SAD_HINTS = [
  "难过",
  "伤心",
  "哭",
  "想哭",
  "委屈",
  "孤单",
  "想你了",
  "sad",
  "lonely",
  "miss you",
];

const LISTEN_HINTS = ["嗯", "我在听", "继续", "说说", "listening", "tell me"];

export function isOfficialLive2DCompanion(gf: {
  referenceImageKey?: string | null;
  name?: string | null;
}): boolean {
  if (gf.referenceImageKey?.startsWith("default-raze-")) return true;
  // Only the default official slot — never user-imported models (SDK license).
  return gf.name === DEFAULT_GIRLFRIEND.name && !gf.referenceImageKey;
}

export function shouldEnableLive2D(pref: string | null | undefined): boolean {
  return pref !== "false";
}

export function isMessageEmotion(value: string): value is MessageEmotion {
  return (EMOTION_VALUES as string[]).includes(value);
}

export function stripLive2DEmotionTag(text: string): {
  text: string;
  emotion: MessageEmotion | null;
} {
  if (!text) return { text: "", emotion: null };
  let emotion: MessageEmotion | null = null;
  const cleaned = text.replace(LIVE2D_EMOTION_TAG, (match) => {
    const inner = /emotion\s*:\s*([a-z]+)/i.exec(match);
    const raw = inner?.[1]?.toLowerCase() ?? "";
    if (isMessageEmotion(raw)) emotion = raw;
    return "";
  });
  return { text: cleaned.replace(/\n{3,}/g, "\n\n").trim(), emotion };
}

export function inferEmotionFromText(text: string): MessageEmotion {
  const content = text.toLowerCase();
  if (ANGRY_HINTS.some((k) => content.includes(k.toLowerCase()))) return "angry";
  if (SAD_HINTS.some((k) => content.includes(k.toLowerCase()))) return "sad";
  if (SHY_HINTS.some((k) => content.includes(k.toLowerCase()))) return "shy";
  if (LISTEN_HINTS.some((k) => content.includes(k.toLowerCase()))) return "listening";
  if (POSITIVE_HINTS.some((k) => content.includes(k.toLowerCase()))) return "happy";
  return "neutral";
}

export function resolveMessageEmotion(rawAssistantText: string): {
  text: string;
  emotion: MessageEmotion;
} {
  const stripped = stripLive2DEmotionTag(rawAssistantText);
  return {
    text: stripped.text,
    emotion: stripped.emotion ?? inferEmotionFromText(stripped.text),
  };
}

export function resolveAvatarPhase(flags: {
  isRecording?: boolean;
  isTranscribing?: boolean;
  isThinking?: boolean;
  isSpeaking?: boolean;
}): AvatarPhase {
  if (flags.isSpeaking) return "speaking";
  if (flags.isRecording || flags.isTranscribing) return "listening";
  if (flags.isThinking) return "thinking";
  return "idle";
}

/** Hiyori has no expression files — we drive named parameter presets instead. */
export type ParameterPreset = {
  /** Parameter id → target 0..1 (or typical Live2D range). */
  params: Record<string, number>;
  motionGroup?: "Idle" | "TapBody";
  motionIndex?: number;
};

export function moodToEmotion(mood: CompanionMood | null | undefined): MessageEmotion {
  switch (mood) {
    case "excited":
    case "happy":
      return "happy";
    case "lonely":
    case "sad":
      return "sad";
    case "content":
      return "shy";
    default:
      return "neutral";
  }
}

/**
 * Message emotion wins; mood is the idle wash. Phase can force a listening tilt.
 */
export function resolveExpression(args: {
  phase: AvatarPhase;
  mood?: CompanionMood | null;
  messageEmotion?: MessageEmotion | null;
}): MessageEmotion {
  if (args.phase === "listening") return "listening";
  if (args.phase === "thinking") {
    return args.messageEmotion ?? moodToEmotion(args.mood) ?? "neutral";
  }
  return args.messageEmotion ?? moodToEmotion(args.mood);
}

export function emotionToPreset(emotion: MessageEmotion): ParameterPreset {
  switch (emotion) {
    case "happy":
      return {
        params: {
          ParamMouthForm: 0.7,
          ParamEyeLSmile: 0.8,
          ParamEyeRSmile: 0.8,
          ParamBrowLY: 0.2,
          ParamBrowRY: 0.2,
        },
      };
    case "shy":
      return {
        params: {
          ParamMouthForm: 0.35,
          ParamEyeLOpen: 0.75,
          ParamEyeROpen: 0.75,
          ParamBrowLForm: 0.4,
          ParamBrowRForm: 0.4,
          ParamCheek: 0.8,
        },
      };
    case "angry":
      return {
        params: {
          ParamMouthForm: -0.4,
          ParamBrowLY: -0.6,
          ParamBrowRY: -0.6,
          ParamBrowLAngle: -0.5,
          ParamBrowRAngle: 0.5,
          ParamEyeLOpen: 0.85,
          ParamEyeROpen: 0.85,
        },
      };
    case "sad":
      return {
        params: {
          ParamMouthForm: -0.55,
          ParamBrowLForm: 0.7,
          ParamBrowRForm: 0.7,
          ParamBrowLY: 0.35,
          ParamBrowRY: 0.35,
          ParamEyeLOpen: 0.7,
          ParamEyeROpen: 0.7,
        },
      };
    case "listening":
      return {
        params: {
          ParamEyeLOpen: 1,
          ParamEyeROpen: 1,
          ParamMouthForm: 0.1,
          ParamAngleZ: 8,
        },
      };
    default:
      return { params: {} };
  }
}

/** Estimate browser-TTS duration so we can run a fake mouth envelope. */
export function estimateSpeechDurationMs(text: string, speed: number): number {
  const chars = text.replace(/\s+/g, "").length;
  const safeSpeed = speed > 0 ? speed : 1;
  // ~180ms per CJK char at 1x, floor 800ms, cap 20s.
  return Math.min(20_000, Math.max(800, (chars * 180) / safeSpeed));
}

export function simulatedMouthValue(elapsedMs: number, durationMs: number): number {
  if (elapsedMs < 0 || elapsedMs > durationMs) return 0;
  const t = elapsedMs / 1000;
  const envelope = Math.sin((Math.PI * elapsedMs) / durationMs);
  const chatter = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 14));
  return Math.max(0, Math.min(1, envelope * chatter));
}
