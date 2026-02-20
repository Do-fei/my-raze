import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  girlfriends,
  conversations,
  messages,
  selfies,
  apiConfigs,
  type Girlfriend,
  type InsertGirlfriend,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type Selfie,
  type InsertSelfie,
  type ApiConfig,
  type InsertApiConfig,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ User Functions ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ Girlfriend Functions ============

export async function createGirlfriend(data: InsertGirlfriend): Promise<Girlfriend> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 如果设置为激活，先将该用户的其他女友设为非激活
  if (data.isActive) {
    await db
      .update(girlfriends)
      .set({ isActive: false })
      .where(eq(girlfriends.userId, data.userId));
  }

  const result = await db.insert(girlfriends).values(data);
  const insertedId = Number(result[0].insertId);

  const inserted = await db
    .select()
    .from(girlfriends)
    .where(eq(girlfriends.id, insertedId))
    .limit(1);

  return inserted[0]!;
}

export async function getActiveGirlfriend(userId: number): Promise<Girlfriend | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(girlfriends)
    .where(and(eq(girlfriends.userId, userId), eq(girlfriends.isActive, true)))
    .limit(1);

  return result[0];
}

export async function getUserGirlfriends(userId: number): Promise<Girlfriend[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(girlfriends)
    .where(eq(girlfriends.userId, userId))
    .orderBy(desc(girlfriends.createdAt));
}

export async function updateGirlfriend(
  id: number,
  userId: number,
  data: Partial<InsertGirlfriend>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 如果设置为激活，先将该用户的其他女友设为非激活
  if (data.isActive) {
    await db
      .update(girlfriends)
      .set({ isActive: false })
      .where(eq(girlfriends.userId, userId));
  }

  await db
    .update(girlfriends)
    .set(data)
    .where(and(eq(girlfriends.id, id), eq(girlfriends.userId, userId)));
}

// ============ Conversation Functions ============

export async function createConversation(data: InsertConversation): Promise<Conversation> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(conversations).values(data);
  const insertedId = Number(result[0].insertId);

  const inserted = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, insertedId))
    .limit(1);

  return inserted[0]!;
}

export async function getUserConversations(userId: number): Promise<Conversation[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));
}

export async function getConversation(
  id: number,
  userId: number
): Promise<Conversation | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
    .limit(1);

  return result[0];
}

// ============ Message Functions ============

export async function createMessage(data: InsertMessage): Promise<Message> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(messages).values(data);
  const insertedId = Number(result[0].insertId);

  const inserted = await db.select().from(messages).where(eq(messages.id, insertedId)).limit(1);

  return inserted[0]!;
}

export async function getConversationMessages(conversationId: number): Promise<Message[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
}

export async function getRecentMessages(conversationId: number, limit: number): Promise<Message[]> {
  const db = await getDb();
  if (!db) return [];

  const allMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);

  return allMessages.reverse(); // 返回时按时间正序
}

// ============ Selfie Functions ============

export async function createSelfie(data: InsertSelfie): Promise<Selfie> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(selfies).values(data);
  const insertedId = Number(result[0].insertId);

  const inserted = await db.select().from(selfies).where(eq(selfies.id, insertedId)).limit(1);

  return inserted[0]!;
}

export async function getUserSelfies(userId: number): Promise<Selfie[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(selfies)
    .where(eq(selfies.userId, userId))
    .orderBy(desc(selfies.createdAt));
}

export async function getGirlfriendSelfies(girlfriendId: number): Promise<Selfie[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(selfies)
    .where(eq(selfies.girlfriendId, girlfriendId))
    .orderBy(desc(selfies.createdAt));
}

export async function deleteSelfie(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(selfies).where(and(eq(selfies.id, id), eq(selfies.userId, userId)));
}

// ============ API Config Functions ============

export async function upsertApiConfig(data: InsertApiConfig): Promise<ApiConfig> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(apiConfigs)
    .where(eq(apiConfigs.userId, data.userId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(apiConfigs)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(apiConfigs.userId, data.userId));

    const updated = await db
      .select()
      .from(apiConfigs)
      .where(eq(apiConfigs.userId, data.userId))
      .limit(1);

    return updated[0]!;
  } else {
    const result = await db.insert(apiConfigs).values(data);
    const insertedId = Number(result[0].insertId);

    const inserted = await db
      .select()
      .from(apiConfigs)
      .where(eq(apiConfigs.id, insertedId))
      .limit(1);

    return inserted[0]!;
  }
}

export async function getUserApiConfig(userId: number): Promise<ApiConfig | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(apiConfigs)
    .where(eq(apiConfigs.userId, userId))
    .limit(1);

  return result[0];
}
