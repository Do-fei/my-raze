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
  | "neutral"
  | "flirty"
  | "tantrum";

/** Playful reactions the user can tap on the official sample model. */
export const PLAYFUL_EMOTIONS = [
  "angry",
  "shy",
  "flirty",
  "sad",
  "tantrum",
] as const satisfies readonly MessageEmotion[];

export type PlayfulEmotion = (typeof PLAYFUL_EMOTIONS)[number];

export const PLAYFUL_EMOTION_LABELS: Record<PlayfulEmotion, string> = {
  angry: "叉腰生气",
  shy: "害羞",
  flirty: "比心",
  sad: "哭鼻子",
  tantrum: "跳起来",
};

export const MESSAGE_EMOTION_LABELS: Record<MessageEmotion, string> = {
  shy: "害羞",
  happy: "开心",
  angry: "生气",
  sad: "难过",
  listening: "在听",
  neutral: "平静",
  flirty: "撒娇",
  tantrum: "发脾气",
};

/** How long a tap/button reaction stays before chat mood takes over again. */
export const PLAYFUL_OVERRIDE_MS = 6_000;

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
  "flirty",
  "tantrum",
];

export const LIVE2D_EMOTION_TAG =
  /\[\[\s*emotion\s*:\s*(shy|happy|angry|sad|listening|neutral|flirty|tantrum)\s*\]\]/gi;

export const LIVE2D_EMOTION_SYSTEM_CLAUSE = `
【Live2D 表情（用户不可见）】
每条回复的最后单独一行写 [[emotion:标签]]，标签只能是 shy / happy / angry / sad / listening / neutral / flirty / tantrum 之一。
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

const FLIRTY_HINTS = ["撒娇", "人家嘛", "摸摸头", "抱抱", "亲一下", "要奖励"];

const TANTRUM_HINTS = ["发脾气", "跺脚", "气鼓鼓", "哼哼"];

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
  if (TANTRUM_HINTS.some((k) => content.includes(k.toLowerCase()))) return "tantrum";
  if (ANGRY_HINTS.some((k) => content.includes(k.toLowerCase()))) return "angry";
  if (SAD_HINTS.some((k) => content.includes(k.toLowerCase()))) return "sad";
  if (FLIRTY_HINTS.some((k) => content.includes(k.toLowerCase()))) return "flirty";
  if (SHY_HINTS.some((k) => content.includes(k.toLowerCase()))) return "shy";
  if (LISTEN_HINTS.some((k) => content.includes(k.toLowerCase()))) return "listening";
  if (POSITIVE_HINTS.some((k) => content.includes(k.toLowerCase()))) return "happy";
  return "neutral";
}

export function nextPlayfulEmotion(
  current: MessageEmotion | null | undefined
): PlayfulEmotion {
  const idx = current
    ? PLAYFUL_EMOTIONS.indexOf(current as PlayfulEmotion)
    : -1;
  return PLAYFUL_EMOTIONS[(idx + 1) % PLAYFUL_EMOTIONS.length];
}

export function isPlayfulEmotion(value: string): value is PlayfulEmotion {
  return (PLAYFUL_EMOTIONS as readonly string[]).includes(value);
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
export type Live2DHop = {
  /** Pixels to lift the PIXI model (stage space). */
  height: number;
  hops: number;
  ms: number;
};

export type ParameterPreset = {
  /** Parameter id → target (Live2D range, often -30..30 or -10..10). */
  params: Record<string, number>;
  /** Part opacity 0..1. Used to switch Hiyori Arm A / Arm B drawings. */
  parts?: Record<string, number>;
  hop?: Live2DHop;
  motionGroup?: "Idle" | "TapBody";
  motionIndex?: number;
};

/** Rest pose so arms/body ease back when a reaction ends. */
export const LIVE2D_POSE_RESET: Record<string, number> = {
  ParamArmLA: -10,
  ParamArmRA: -10,
  ParamArmLB: 0,
  ParamArmRB: 0,
  ParamHandL: 0,
  ParamHandR: 0,
  ParamHandLB: 0,
  ParamHandRB: 0,
  ParamLeg: 0,
  ParamShoulder: 0,
  ParamBodyAngleX: 0,
  ParamBodyAngleY: 0,
  ParamBodyAngleZ: 0,
};

export const LIVE2D_PARTS_DEFAULT: Record<string, number> = {
  PartArmA: 1,
  PartArmB: 0,
};

/** Face keys we ease back — not eyes or look-at X/Y (blink + 视线跟随). */
export const LIVE2D_FACE_RESET: Record<string, number> = {
  ParamMouthForm: 0,
  ParamCheek: 0,
  ParamBrowLY: 0,
  ParamBrowRY: 0,
  ParamBrowLAngle: 0,
  ParamBrowRAngle: 0,
  ParamBrowLForm: 0,
  ParamBrowRForm: 0,
  ParamEyeLSmile: 0,
  ParamEyeRSmile: 0,
  ParamAngleZ: 0,
};

export function mergePoseTarget(params: Record<string, number>): Record<string, number> {
  return { ...LIVE2D_POSE_RESET, ...LIVE2D_FACE_RESET, ...params };
}

export function stepPoseBlend(
  current: Record<string, number>,
  target: Record<string, number>,
  alpha = 0.18
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const [key, dest] of Object.entries(target)) {
    const cur = current[key] ?? dest;
    next[key] = cur + (dest - cur) * alpha;
  }
  return next;
}

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
 * Listening always wins. A tap/button override beats chat emotion until it expires.
 * Message emotion wins over the idle mood wash.
 */
export function resolveExpression(args: {
  phase: AvatarPhase;
  mood?: CompanionMood | null;
  messageEmotion?: MessageEmotion | null;
  userOverride?: MessageEmotion | null;
}): MessageEmotion {
  if (args.phase === "listening") return "listening";
  if (args.userOverride) return args.userOverride;
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
          ParamMouthForm: 0.2,
          ParamEyeLOpen: 0.55,
          ParamEyeROpen: 0.55,
          ParamBrowLForm: 0.55,
          ParamBrowRForm: 0.55,
          ParamCheek: 1,
          ParamAngleX: -18,
          ParamAngleY: -16,
          ParamAngleZ: 22,
          ParamBodyAngleX: -8,
          ParamBodyAngleZ: 10,
          ParamShoulder: 0.85,
          ParamArmLA: 4,
          ParamArmRA: -10,
          ParamHandL: 1,
        },
        parts: { PartArmA: 1, PartArmB: 0 },
        hop: { height: 16, hops: 1, ms: 420 },
      };
    case "angry":
      // Arms A pushed to the outer extreme ≈ 叉腰 / 双手撑腰.
      return {
        params: {
          ParamMouthForm: -0.85,
          ParamBrowLY: -1,
          ParamBrowRY: -1,
          ParamBrowLAngle: -0.9,
          ParamBrowRAngle: 0.9,
          ParamBrowLForm: -1,
          ParamBrowRForm: -1,
          ParamEyeLOpen: 1,
          ParamEyeROpen: 1,
          ParamAngleX: 8,
          ParamAngleZ: -16,
          ParamBodyAngleX: 10,
          ParamBodyAngleZ: -10,
          ParamShoulder: 1,
          ParamArmLA: 10,
          ParamArmRA: 10,
          ParamHandL: -1,
          ParamHandR: -1,
        },
        parts: { PartArmA: 1, PartArmB: 0 },
        hop: { height: 14, hops: 1, ms: 380 },
      };
    case "sad":
      return {
        params: {
          ParamMouthForm: -0.9,
          ParamBrowLForm: 1,
          ParamBrowRForm: 1,
          ParamBrowLY: 0.55,
          ParamBrowRY: 0.55,
          ParamEyeLOpen: 0.4,
          ParamEyeROpen: 0.4,
          ParamAngleY: -22,
          ParamAngleZ: -8,
          ParamBodyAngleY: -8,
          ParamBodyAngleZ: -6,
          ParamShoulder: 1,
          ParamArmLA: -10,
          ParamArmRA: -10,
          ParamLeg: 0.2,
        },
        parts: { PartArmA: 1, PartArmB: 0 },
      };
    case "flirty":
      // Arm B is the gesture drawing — both arms up/in ≈ 比心.
      return {
        params: {
          ParamMouthForm: 1,
          ParamEyeLSmile: 1,
          ParamEyeRSmile: 1,
          ParamEyeLOpen: 0.65,
          ParamEyeROpen: 0.65,
          ParamBrowLY: 0.45,
          ParamBrowRY: 0.45,
          ParamCheek: 1,
          ParamAngleY: 8,
          ParamAngleZ: -12,
          ParamBodyAngleY: 8,
          ParamBodyAngleZ: -6,
          ParamArmLB: 10,
          ParamArmRB: 10,
          ParamHandLB: 10,
          ParamHandRB: 10,
          ParamHandL: 1,
          ParamHandR: 1,
        },
        parts: { PartArmA: 0, PartArmB: 1 },
        hop: { height: 22, hops: 1, ms: 480 },
      };
    case "tantrum":
      return {
        params: {
          ParamMouthForm: -1,
          ParamMouthOpenY: 0.5,
          ParamEyeLOpen: 1.15,
          ParamEyeROpen: 1.15,
          ParamBrowLY: -1,
          ParamBrowRY: -1,
          ParamBrowLForm: -1,
          ParamBrowRForm: -1,
          ParamBrowLAngle: -1,
          ParamBrowRAngle: 1,
          ParamCheek: 0.55,
          ParamAngleZ: 18,
          ParamBodyAngleY: 10,
          ParamBodyAngleZ: 10,
          ParamShoulder: 1,
          ParamArmLA: 2,
          ParamArmRA: 2,
          ParamLeg: 1,
        },
        parts: { PartArmA: 1, PartArmB: 0 },
        hop: { height: 56, hops: 3, ms: 1100 },
      };
    case "listening":
      return {
        params: {
          ParamEyeLOpen: 1,
          ParamEyeROpen: 1,
          ParamMouthForm: 0.1,
          ParamAngleZ: 10,
          ParamBodyAngleZ: 6,
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

/**
 * Fit a Live2D model into the stage using its *unscaled* canvas size.
 * Never pass PIXI's live `width`/`height` here — those already include scale
 * and will blow up on every resize (the "only a torso" bug).
 */
export function computeLive2DLayout(
  viewW: number,
  viewH: number,
  modelW: number,
  modelH: number
): { scale: number; x: number; y: number; anchorX: number; anchorY: number } {
  const canvasW = modelW > 8 ? modelW : 2048;
  const canvasH = modelH > 8 ? modelH : 2048;
  const padding = 0.9;
  const raw = Math.min(viewW / canvasW, viewH / canvasH) * padding;
  const scale = Math.min(Math.max(raw, 0.04), 1.2);
  return {
    scale,
    x: viewW / 2,
    y: viewH - 6,
    anchorX: 0.5,
    anchorY: 1,
  };
}

export function simulatedMouthValue(elapsedMs: number, durationMs: number): number {
  if (elapsedMs < 0 || elapsedMs > durationMs) return 0;
  const t = elapsedMs / 1000;
  const envelope = Math.sin((Math.PI * elapsedMs) / durationMs);
  const chatter = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 14));
  return Math.max(0, Math.min(1, envelope * chatter));
}
