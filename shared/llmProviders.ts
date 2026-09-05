export type LlmProvider = "openrouter" | "deepseek";
export const DEEPSEEK_MODELS = ["deepseek-v4-flash", "deepseek-v4-pro"] as const;
export const LLM_PROVIDERS = {
  openrouter: { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", defaultModel: "openai/gpt-4o-mini" },
  deepseek: { label: "DeepSeek", baseUrl: "https://api.deepseek.com", defaultModel: DEEPSEEK_MODELS[0] },
} as const;
/** Legacy empty/unknown URLs never become arbitrary outbound destinations. */
export function configuredLlmProvider(url?: string | null): LlmProvider {
  return url === LLM_PROVIDERS.deepseek.baseUrl ? "deepseek" : "openrouter";
}
export function llmRequestOptions(provider: LlmProvider) {
  return provider === "deepseek" ? { thinking: { type: "disabled" }, max_tokens: 1024 } : {};
}
