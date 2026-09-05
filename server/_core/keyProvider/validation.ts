import { verifyDeepseekKey } from "../deepseekAuth";
import type { KeyName } from "./types";

import { verifyOpenRouterKey } from "../openrouterAuth";

/** OpenRouter uses live authentication; other providers use format checks. */
export async function validateProviderKey(
  name: KeyName,
  value: string
): Promise<void> {
  const trimmed = value.trim();
  if (trimmed !== value) {
    throw new Error("Key contains leading/trailing whitespace");
  }
  if (trimmed.length < 8) {
    throw new Error("Key looks too short for any provider");
  }

  switch (name) {
    case "deepseek":
      if (!trimmed.startsWith("sk-") || trimmed.startsWith("sk-or-")) throw new Error("请填写 DeepSeek 官方 Key，不能使用 OpenRouter Key");
      await verifyDeepseekKey(trimmed);
      break;
    case "openrouter":
      // OpenRouter keys are `sk-or-v1-...` per their docs.
      if (!/^sk-or-/.test(trimmed)) {
        throw new Error(
          "OpenRouter keys start with `sk-or-` — check that you copied the right one"
        );
      }
      await verifyOpenRouterKey(trimmed);
      break;
    case "openai":
      if (!/^sk-/.test(trimmed)) {
        throw new Error("OpenAI keys start with `sk-`");
      }
      break;
    case "fal":
      // fal.ai keys are `<id>:<secret>` style.
      if (!/^[A-Za-z0-9_-]+(:[A-Za-z0-9_-]+)?$/.test(trimmed)) {
        throw new Error(
          "fal.ai keys are usually `id:secret`; the value you provided doesn't match"
        );
      }
      break;
    case "elevenlabs":
      // ElevenLabs uses opaque tokens — just length sanity.
      if (trimmed.length < 20) {
        throw new Error("ElevenLabs keys are typically 20+ characters");
      }
      break;
    case "fish-audio":
      // Fish Audio uses opaque bearer tokens — just length sanity.
      if (trimmed.length < 16) {
        throw new Error("Fish Audio keys are typically 16+ characters");
      }
      break;
    default: {
      // Exhaustiveness: if a new KeyName is added without a case here,
      // this lets TypeScript's never-narrowing flag it at compile time.
      const _exhaustive: never = name;
      void _exhaustive;
    }
  }
}
