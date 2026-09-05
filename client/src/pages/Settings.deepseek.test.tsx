// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import Settings from "./Settings";
const mocks = vi.hoisted(() => {
  const keys = Object.fromEntries(["openrouter", "deepseek", "fal", "openai", "elevenlabs", "fish-audio"].map(name => [name, { isSet: name === "openrouter" }]));
  return { config: { preferences: { llmApiUrl: null, llmModel: "openai/gpt-4o-mini" }, keys }, saveKey: vi.fn(), savePrefs: vi.fn(), invalidate: vi.fn(), error: vi.fn() };
});
vi.mock("@/contexts/ThemeContext", () => ({ useTheme: () => ({ theme: "dark", toggleTheme: vi.fn() }) }));
vi.mock("@/components/BillingCard", () => ({ BillingCard: () => null }));
vi.mock("@/components/PushCard", () => ({ PushCard: () => null }));
vi.mock("@/hooks/useLive2DPreference", () => ({ useLive2DPreference: () => ({ enabled: true, setEnabled: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { error: mocks.error, success: vi.fn(), info: vi.fn() } }));
vi.mock("@/lib/trpc", () => ({ trpc: {
  apiConfig: {
    get: { useQuery: () => ({ data: mocks.config }) },
    listModels: { useQuery: () => ({ data: { models: [] } }) },
    listElevenLabsVoices: { useQuery: () => ({}) },
    listFishAudioModels: { useQuery: () => ({}) },
    updatePreferences: { useMutation: () => ({ mutateAsync: mocks.savePrefs }) },
    setKey: { useMutation: () => ({ mutateAsync: mocks.saveKey }) },
    clearKey: { useMutation: () => ({}) },
    verifyOpenRouterKey: { useMutation: () => ({}) },
    verifyDeepseekKey: { useMutation: () => ({}) },
  },
  tts: { generate: { useMutation: () => ({}) } },
  useUtils: () => ({ apiConfig: { get: { invalidate: mocks.invalidate } } }),
} }));
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
vi.stubGlobal("React", React);
let root: ReturnType<typeof createRoot>;
let host: HTMLDivElement;
afterEach(() => { act(() => root?.unmount()); host?.remove(); vi.clearAllMocks(); });
async function showDeepseek() {
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(<Settings />));
  const select = host.querySelector<HTMLSelectElement>("#llmProvider")!;
  await act(async () => { select.value = "deepseek"; select.dispatchEvent(new Event("change", { bubbles: true })); });
}
async function inputKey() {
  const input = host.querySelector<HTMLInputElement>("#deepseekKey")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "sk-test-deepseek");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
it("switches to official DeepSeek, defaults Flash and saves its key before preferences", async () => {
  await showDeepseek();
  expect(host.querySelector("#openRouterKey")).toBeNull();
  expect(host.querySelector<HTMLSelectElement>("#deepseekModel")!.value).toBe("deepseek-v4-flash");
  await inputKey();
  await act(async () => { Array.from(host.querySelectorAll("button")).find(b => b.textContent === "保存生效")!.click(); });
  expect(mocks.saveKey).toHaveBeenCalledWith({ name: "deepseek", value: "sk-test-deepseek" });
  expect(mocks.savePrefs).toHaveBeenCalledWith({ llmProvider: "deepseek", llmModel: "deepseek-v4-flash" });
  expect(mocks.saveKey.mock.invocationCallOrder[0]).toBeLessThan(mocks.savePrefs.mock.invocationCallOrder[0]);
  expect(host.querySelector<HTMLInputElement>("#deepseekKey")!.value).toBe("");
});
it("keeps draft key and current provider preference when validation fails", async () => {
  mocks.saveKey.mockRejectedValueOnce(new Error("DeepSeek 认证失败"));
  await showDeepseek(); await inputKey();
  await act(async () => { Array.from(host.querySelectorAll("button")).find(b => b.textContent === "保存生效")!.click(); });
  expect(mocks.savePrefs).not.toHaveBeenCalled();
  expect(host.querySelector<HTMLInputElement>("#deepseekKey")!.value).toBe("sk-test-deepseek");
  expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining("认证失败"));
});
