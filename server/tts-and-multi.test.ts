import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
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
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Multi-girlfriend support", () => {
  it("girlfriend.list returns an array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.girlfriend.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("girlfriend.getActive returns null when no active girlfriend", async () => {
    // Create a fresh user context that has no girlfriends
    const user: AuthenticatedUser = {
      id: 99999,
      openId: "no-gf-user",
      email: "nogf@example.com",
      name: "No GF User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const ctx: TrpcContext = {
      user,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.girlfriend.getActive();
    expect(result).toBeFalsy();
  });
});

describe("API config management", () => {
  it("apiConfig.get returns null for new user", async () => {
    const user: AuthenticatedUser = {
      id: 99998,
      openId: "new-config-user",
      email: "newconfig@example.com",
      name: "New Config User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    const ctx: TrpcContext = {
      user,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.apiConfig.get();
    expect(result).toBeFalsy();
  });
});

describe("Selfie management", () => {
  it("selfie.list returns an array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.selfie.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Conversation management", () => {
  it("conversation.list returns an array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.conversation.list();
    expect(Array.isArray(result)).toBe(true);
  });
});
