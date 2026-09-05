import { afterEach, describe, expect, it, vi } from "vitest";
import axios, { AxiosError } from "axios";
import { appRouter } from "./routers";
import * as db from "./db";
import { keyProvider, validateProviderKey } from "./_core/keyProvider";
import { verifyDeepseekKey } from "./_core/deepseekAuth";
import * as memory from "./memory";
import * as billing from "./billing";
import * as quota from "./_core/quota";
import { callExtractionModel } from "./memory";
import { configuredLlmProvider, LLM_PROVIDERS } from "../shared/llmProviders";
import type { TrpcContext } from "./_core/context";
const caller = () => appRouter.createCaller({ user: { id: "test-deepseek", role: "user", birthDate: new Date("1990-01-01") }, req: { headers: {} }, res: {} } as TrpcContext);
afterEach(() => vi.restoreAllMocks());
describe("DeepSeek official integration", () => {
  it("defaults legacy and untrusted URLs to OpenRouter", () => {
    expect(configuredLlmProvider(null)).toBe("openrouter");
    expect(configuredLlmProvider("https://untrusted.invalid")).toBe("openrouter");
    expect(configuredLlmProvider(LLM_PROVIDERS.deepseek.baseUrl)).toBe("deepseek");
  });
  it("authenticates without generating or exposing balance", async () => {
    const get = vi.spyOn(axios, "get").mockResolvedValue({ data: { is_available: false, balance_infos: [] } });
    const post = vi.spyOn(axios, "post");
    await expect(verifyDeepseekKey("sk-test-deepseek")).resolves.toBeUndefined();
    expect(get).toHaveBeenCalledWith("https://api.deepseek.com/user/balance", expect.objectContaining({ headers: { Authorization: "Bearer sk-test-deepseek" }, maxRedirects: 0 }));
    expect(post).not.toHaveBeenCalled();
  });
  it("rejects an OpenRouter key before sending it to DeepSeek", async () => {
    const get = vi.spyOn(axios, "get");
    await expect(validateProviderKey("deepseek", "sk-or-v1-test-only")).rejects.toThrow("不能使用 OpenRouter");
    expect(get).not.toHaveBeenCalled();
  });
  it("does not persist a rejected key or expose upstream secrets", async () => {
    const error = new AxiosError("secret-request-value");
    error.response = { status: 401 } as any;
    vi.spyOn(axios, "get").mockRejectedValue(error);
    const save = vi.spyOn(keyProvider, "setUserKey");
    await expect(caller().apiConfig.setKey({ name: "deepseek", value: "sk-test-only" })).rejects.toThrow("DeepSeek 认证失败");
    expect(save).not.toHaveBeenCalled();
  });
  it("uses only the DeepSeek key for saved-key verification", async () => {
    const getKey = vi.spyOn(keyProvider, "get").mockResolvedValue("sk-deepseek-test");
    vi.spyOn(axios, "get").mockResolvedValue({ data: { is_available: true } });
    expect(await caller().apiConfig.verifyDeepseekKey()).toEqual({ ok: true });
    expect(getKey).toHaveBeenCalledTimes(1);
    expect(getKey).toHaveBeenCalledWith({ userId: "test-deepseek" }, "deepseek");
  });
  it("persists a fixed official endpoint and defaults the model on switch", async () => {
    vi.spyOn(db, "getUserApiConfig").mockResolvedValue({ llmModel: "openai/gpt-4o-mini", llmApiUrl: null } as any);
    const save = vi.spyOn(db, "upsertApiConfig").mockResolvedValue(undefined as any);
    await caller().apiConfig.updatePreferences({ llmProvider: "deepseek" });
    expect(save).toHaveBeenCalledWith({ userId: "test-deepseek", llmApiUrl: "https://api.deepseek.com", llmModel: "deepseek-v4-flash" });
    await expect(caller().apiConfig.updatePreferences({ llmProvider: "deepseek", llmModel: "openai/gpt-4o-mini" })).rejects.toThrow("DeepSeek 官方模型");
  });
  it.each(["deepseek", "openrouter"] as const)("routes memory extraction through %s", async (provider) => {
    const post = vi.spyOn(axios, "post").mockResolvedValue({ data: { choices: [{ message: { content: '{"memories":[]}' } }] } });
    await callExtractionModel("test-provider-key", "test transcript", provider);
    expect(post).toHaveBeenCalledWith(`${LLM_PROVIDERS[provider].baseUrl}/chat/completions`, expect.objectContaining({ model: LLM_PROVIDERS[provider].defaultModel }), expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer test-provider-key" }) }));
    if (provider === "deepseek") expect(post.mock.calls[0][1]).toMatchObject({ thinking: { type: "disabled" }, max_tokens: 1024 });
  });
});

it.each(["deepseek", "openrouter"] as const)("chat uses matching %s endpoint, key, model and extraction provider", async (provider) => {
  vi.spyOn(quota, "checkRateLimit").mockImplementation(() => {});
  vi.spyOn(billing, "isBillingEnforced").mockReturnValue(false);
  vi.spyOn(billing, "getTierLimits").mockResolvedValue({ tier: "pro", limits: {} } as any);
  vi.spyOn(db, "getUserApiConfig").mockResolvedValue({ llmApiUrl: LLM_PROVIDERS[provider].baseUrl, llmModel: LLM_PROVIDERS[provider].defaultModel } as any);
  const getKey = vi.spyOn(keyProvider, "get").mockImplementation(async (_, name) => name === provider ? "test-matching-key" : "wrong-key");
  vi.spyOn(keyProvider, "describeUserKeys").mockResolvedValue({ [provider]: { isSet: true } } as any);
  vi.spyOn(db, "getConversation").mockResolvedValue({ id: 1 } as any);
  vi.spyOn(db, "getActiveGirlfriend").mockResolvedValue({ id: 1, name: "Raze", personality: "friendly", appearance: "test" } as any);
  vi.spyOn(db, "createMessage").mockImplementation(async value => value as any);
  vi.spyOn(db, "getRecentMessages").mockResolvedValue([{ role: "user", content: "你好" }] as any);
  vi.spyOn(memory, "buildMemoryPromptBlock").mockResolvedValue("");
  const extraction = vi.spyOn(memory, "maybeExtractMemories").mockImplementation(() => {});
  const post = vi.spyOn(axios, "post").mockResolvedValue({ data: { choices: [{ message: { content: "你好呀" } }] } });
  const result = await caller().chat.sendMessage({ conversationId: 1, content: "你好" });
  expect(result.assistantMessage.content).toBe("你好呀");
  expect(getKey).toHaveBeenCalledWith({ userId: "test-deepseek" }, provider);
  expect(post).toHaveBeenCalledWith(`${LLM_PROVIDERS[provider].baseUrl}/chat/completions`, expect.objectContaining({ model: LLM_PROVIDERS[provider].defaultModel }), expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer test-matching-key" }) }));
  expect(extraction).toHaveBeenCalledWith(expect.objectContaining({ apiKey: "test-matching-key", provider }));
});
