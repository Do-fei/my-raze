import axios from "axios";
import { LLM_PROVIDERS } from "../../shared/llmProviders";
export function deepseekFailure(error: unknown): { status?: number; message: string } {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  return { status, message: status === 401 || status === 403
    ? "DeepSeek 认证失败，请检查 DeepSeek 官方 API Key。"
    : status === 402 ? "DeepSeek 账户余额不足，请检查官方账户。"
    : status === 429 ? "DeepSeek 请求过于频繁，请稍后重试。"
    : "DeepSeek 暂时无法完成请求，请稍后重试。" };
}
/** Authenticated read only. Discard account amounts; never generate content. */
export async function verifyDeepseekKey(key: string): Promise<void> {
  try {
    const response = await axios.get(`${LLM_PROVIDERS.deepseek.baseUrl}/user/balance`, {
      headers: { Authorization: `Bearer ${key}` }, timeout: 15_000, maxRedirects: 0,
    });
    if (typeof response.data?.is_available !== "boolean") throw new Error("Unexpected response");
  } catch (error) { throw new Error(deepseekFailure(error).message); }
}
