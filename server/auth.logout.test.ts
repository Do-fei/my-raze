import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock("./_core/auth", () => ({ auth: { api: { signOut } } }));
beforeEach(() => vi.resetAllMocks());

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: CookieCall[]; appendedCookies: string[] } {
  const clearedCookies: CookieCall[] = [];
  const appendedCookies: string[] = [];

  const user: AuthenticatedUser = {
    id: "test-user-1",
    openId: "sample-user",
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: { cookie: "__Secure-better-auth.session_token=test-session" },
    } as TrpcContext["req"],
    res: {
      append: (name: string, value: string) => {
        expect(name).toBe("Set-Cookie");
        appendedCookies.push(value);
      },
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies, appendedCookies };
}

describe("auth.logout", () => {
  it.each(["", "__Secure-"])("revokes the session and forwards %s cookies separately", async prefix => {
    const { ctx, clearedCookies, appendedCookies } = createAuthContext();
    const cookies = [
      `${prefix}better-auth.session_token=; Max-Age=0; Path=/; HttpOnly`,
      `${prefix}better-auth.session_data=; Max-Age=0; Path=/; HttpOnly`,
      `${prefix}better-auth.session_data.0=; Max-Age=0; Path=/; HttpOnly`,
    ];
    const headers = new Headers();
    cookies.forEach(cookie => headers.append("Set-Cookie", cookie));
    signOut.mockResolvedValue({ headers, response: { success: true } });
    const result = await appRouter.createCaller(ctx).auth.logout();
    expect(result).toEqual({ success: true });
    expect(signOut).toHaveBeenCalledOnce();
    const args = signOut.mock.calls[0][0];
    expect(args.headers.get("cookie")).toBe(ctx.req.headers.cookie);
    expect(args.returnHeaders).toBe(true);
    expect(appendedCookies).toEqual(cookies);
    expect(clearedCookies.map(c => c.name)).toEqual(["app_session_id"]);
  });

  it("does not report success when the auth service fails", async () => {
    const { ctx, appendedCookies, clearedCookies } = createAuthContext();
    signOut.mockRejectedValue(new Error("auth unavailable"));
    await expect(appRouter.createCaller(ctx).auth.logout()).rejects.toThrow("auth unavailable");
    expect(appendedCookies).toEqual([]);
    expect(clearedCookies).toEqual([]);
  });
});
