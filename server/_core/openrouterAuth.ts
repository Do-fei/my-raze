import axios from "axios";

/** Only expose fixed messages: Axios errors can contain Authorization headers. */
export function openRouterFailure(error: unknown): { status?: number; message: string } {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  const message = status === 401 || status === 403
    ? "OpenRouter 认证失败，请在设置中检查 Key（模型列表可加载不代表认证成功）。"
    : status === 402
      ? "OpenRouter 账户额度不足，请检查账户余额或 Key 限额。"
      : status === 429
        ? "OpenRouter 请求过于频繁，请稍后重试。"
        : "OpenRouter 暂时无法完成请求，请稍后重试。";
  return { status, message };
}

/** Authentication only; never requests generated content or returns account details. */
export async function verifyOpenRouterKey(key: string): Promise<void> {
  try {
    await axios.get("https://openrouter.ai/api/v1/key", {
      headers: { Authorization: `Bearer ${key}` },
      timeout: 15_000,
      maxRedirects: 0,
    });
  } catch (error) {
    throw new Error(openRouterFailure(error).message);
  }
}
