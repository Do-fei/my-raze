import { describe, expect, it } from "vitest";
import {
  estimateSpeechDurationMs,
  inferEmotionFromText,
  isOfficialLive2DCompanion,
  resolveAvatarPhase,
  resolveExpression,
  resolveMessageEmotion,
  shouldEnableLive2D,
  computeLive2DLayout,
  simulatedMouthValue,
  stripLive2DEmotionTag,
} from "./live2d";

describe("stripLive2DEmotionTag", () => {
  it("pulls a trailing emotion tag and removes it from user-visible text", () => {
    const { text, emotion } = stripLive2DEmotionTag("今晚想你了。\n[[emotion:sad]]");
    expect(emotion).toBe("sad");
    expect(text).toBe("今晚想你了。");
    expect(text).not.toContain("emotion");
  });

  it("accepts spaced tags and is case-insensitive", () => {
    expect(stripLive2DEmotionTag("哼 [[ emotion:ANGRY ]]").emotion).toBe("angry");
  });

  it("returns null emotion when the tag is missing", () => {
    expect(stripLive2DEmotionTag("你好呀")).toEqual({ text: "你好呀", emotion: null });
  });
});

describe("inferEmotionFromText / resolveMessageEmotion", () => {
  it("infers angry / shy / happy from copy", () => {
    expect(inferEmotionFromText("哼，我生气了")).toBe("angry");
    expect(inferEmotionFromText("才、才不是喜欢你呢")).toBe("shy");
    expect(inferEmotionFromText("今天好开心哈哈")).toBe("happy");
  });

  it("prefers the explicit tag over keyword inference", () => {
    const resolved = resolveMessageEmotion("哈哈我好开心 [[emotion:sad]]");
    expect(resolved.emotion).toBe("sad");
    expect(resolved.text).toBe("哈哈我好开心");
  });

  it("falls back to inference when the model forgets the tag", () => {
    expect(resolveMessageEmotion("人家脸红了啦").emotion).toBe("shy");
  });
});

describe("resolveAvatarPhase", () => {
  it("prioritizes speaking over listening and thinking", () => {
    expect(
      resolveAvatarPhase({
        isSpeaking: true,
        isRecording: true,
        isThinking: true,
      })
    ).toBe("speaking");
  });

  it("maps recording and transcription to listening", () => {
    expect(resolveAvatarPhase({ isRecording: true })).toBe("listening");
    expect(resolveAvatarPhase({ isTranscribing: true })).toBe("listening");
  });

  it("maps pending LLM to thinking, otherwise idle", () => {
    expect(resolveAvatarPhase({ isThinking: true })).toBe("thinking");
    expect(resolveAvatarPhase({})).toBe("idle");
  });
});

describe("resolveExpression", () => {
  it("forces listening expression while the user is talking", () => {
    expect(
      resolveExpression({
        phase: "listening",
        mood: "happy",
        messageEmotion: "angry",
      })
    ).toBe("listening");
  });

  it("uses message emotion over mood wash when idle", () => {
    expect(
      resolveExpression({
        phase: "idle",
        mood: "sad",
        messageEmotion: "happy",
      })
    ).toBe("happy");
  });

  it("falls back to mood when there is no message emotion", () => {
    expect(resolveExpression({ phase: "idle", mood: "lonely" })).toBe("sad");
  });
});

describe("official companion + preference", () => {
  it("enables Live2D only for the default Raze slot", () => {
    expect(
      isOfficialLive2DCompanion({ referenceImageKey: "default-raze-user1" })
    ).toBe(true);
    expect(
      isOfficialLive2DCompanion({
        referenceImageKey: "uploads/custom.png",
        name: "Raze",
      })
    ).toBe(false);
    expect(isOfficialLive2DCompanion({ name: "桃香" })).toBe(false);
  });

  it("treats missing preference as enabled", () => {
    expect(shouldEnableLive2D(null)).toBe(true);
    expect(shouldEnableLive2D("false")).toBe(false);
    expect(shouldEnableLive2D("true")).toBe(true);
  });
});

describe("computeLive2DLayout", () => {
  it("fits the unscaled canvas into the view without blowing up", () => {
    const layout = computeLive2DLayout(400, 800, 2048, 2048);
    expect(layout.scale).toBeLessThan(0.5);
    expect(layout.scale).toBeGreaterThan(0.1);
    expect(layout.anchorY).toBe(1);
    expect(layout.x).toBe(200);
  });

  it("does not grow when called again with the same canvas size", () => {
    const a = computeLive2DLayout(400, 800, 2048, 2048);
    const b = computeLive2DLayout(400, 800, 2048, 2048);
    expect(a.scale).toBe(b.scale);
  });

  it("falls back when the reported size is nonsense", () => {
    const layout = computeLive2DLayout(400, 800, 0, 0);
    expect(layout.scale).toBeGreaterThan(0);
    expect(layout.scale).toBeLessThan(1);
  });
});

describe("simulated mouth envelope", () => {
  it("is closed before and after the utterance", () => {
    expect(simulatedMouthValue(-10, 1000)).toBe(0);
    expect(simulatedMouthValue(1200, 1000)).toBe(0);
  });

  it("opens during the utterance", () => {
    expect(simulatedMouthValue(400, 1000)).toBeGreaterThan(0.1);
  });

  it("scales duration with speed and text length", () => {
    const slow = estimateSpeechDurationMs("你好呀今天过得怎么样", 0.5);
    const fast = estimateSpeechDurationMs("你好呀今天过得怎么样", 2);
    expect(slow).toBeGreaterThan(fast);
    expect(estimateSpeechDurationMs("", 1)).toBe(800);
  });
});
