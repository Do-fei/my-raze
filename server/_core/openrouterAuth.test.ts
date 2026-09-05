import { describe, it, expect, vi, afterEach } from "vitest";
import axios, { AxiosError } from "axios";
import { verifyOpenRouterKey, openRouterFailure } from "./openrouterAuth";
import { validateProviderKey } from "./keyProvider/validation";

afterEach(() => vi.restoreAllMocks());
describe("OpenRouter authentication", () => {
  it("uses the authenticated key endpoint and discards account details", async () => {
    const get = vi.spyOn(axios, "get").mockResolvedValue({ data: { data: { label: "private" } } });
    await expect(validateProviderKey("openrouter", "sk-or-test-only")).resolves.toBeUndefined();
    expect(get).toHaveBeenCalledWith("https://openrouter.ai/api/v1/key", {
      headers: { Authorization: "Bearer sk-or-test-only" }, timeout: 15000, maxRedirects: 0,
    });
  });
  it.each([401, 403, 402, 429, 500])("sanitizes upstream %i errors", async (status) => {
    const error = new AxiosError("SECRET in upstream error");
    error.response = { status, data: { secret: "SECRET" } } as any;
    vi.spyOn(axios, "get").mockRejectedValue(error);
    await expect(verifyOpenRouterKey("sk-or-test-only")).rejects.toThrow(openRouterFailure(error).message);
    expect(openRouterFailure(error).message).not.toContain("SECRET");
    expect(openRouterFailure(error).status).toBe(status);
  });
  it("does not turn a timeout into an invalid-key claim", async () => {
    vi.spyOn(axios, "get").mockRejectedValue(new AxiosError("SECRET", "ECONNABORTED"));
    await expect(verifyOpenRouterKey("sk-or-test-only")).rejects.toThrow("暂时无法");
  });
});
