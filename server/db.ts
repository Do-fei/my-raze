import { eq, desc, and, like, sql, isNull, isNotNull, inArray, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  girlfriends,
  conversations,
  messages,
  selfies,
  apiConfigs,
  girlfriendMoods,
  notifications,
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
  type GirlfriendMood,
  type InsertGirlfriendMood,
  type Notification,
  type InsertNotification,
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
    .where(and(eq(girlfriends.userId, userId), eq(girlfriends.isActive, true), isNull(girlfriends.deletedAt)))
    .limit(1);

  return result[0];
}

export async function getUserGirlfriends(userId: number): Promise<Girlfriend[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(girlfriends)
    .where(and(eq(girlfriends.userId, userId), isNull(girlfriends.deletedAt)))
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

// ============ Soft Delete Girlfriend (Trash) ============

/** 软删除：设置 deletedAt 时间戳，保留 7 天可恢复 */
export async function softDeleteGirlfriend(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(girlfriends)
    .set({ deletedAt: new Date(), isActive: false })
    .where(and(eq(girlfriends.id, id), eq(girlfriends.userId, userId)));
}

/** 批量软删除 */
export async function softDeleteGirlfriends(ids: number[], userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (const id of ids) {
    await db
      .update(girlfriends)
      .set({ deletedAt: new Date(), isActive: false })
      .where(and(eq(girlfriends.id, id), eq(girlfriends.userId, userId)));
  }
}

/** 恢复女友：清除 deletedAt */
export async function restoreGirlfriend(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(girlfriends)
    .set({ deletedAt: null })
    .where(and(eq(girlfriends.id, id), eq(girlfriends.userId, userId)));
}

/** 永久删除：级联清除所有关联数据 */
export async function permanentDeleteGirlfriend(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 1. 获取该女友的所有对话 ID
  const convos = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.girlfriendId, id), eq(conversations.userId, userId)));

  const convoIds = convos.map((c) => c.id);

  // 2. 删除所有对话中的消息
  for (const convoId of convoIds) {
    await db.delete(messages).where(eq(messages.conversationId, convoId));
  }

  // 3. 删除所有对话
  for (const convoId of convoIds) {
    await db.delete(conversations).where(eq(conversations.id, convoId));
  }

  // 4. 删除所有自拍
  await db.delete(selfies).where(and(eq(selfies.girlfriendId, id), eq(selfies.userId, userId)));

  // 5. 删除心情记录
  await db.delete(girlfriendMoods).where(and(eq(girlfriendMoods.girlfriendId, id), eq(girlfriendMoods.userId, userId)));

  // 6. 永久删除女友
  await db.delete(girlfriends).where(and(eq(girlfriends.id, id), eq(girlfriends.userId, userId)));
}

/** 获取回收站列表（已软删除的女友） */
export async function getTrashGirlfriends(userId: number): Promise<Girlfriend[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(girlfriends)
    .where(and(eq(girlfriends.userId, userId), isNotNull(girlfriends.deletedAt)))
    .orderBy(desc(girlfriends.deletedAt));
}

/** 清理过期回收站项目（超过 7 天的永久删除） */
export async function cleanupExpiredTrash(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const expired = await db
    .select({ id: girlfriends.id })
    .from(girlfriends)
    .where(
      and(
        eq(girlfriends.userId, userId),
        isNotNull(girlfriends.deletedAt),
        lte(girlfriends.deletedAt, sevenDaysAgo)
      )
    );

  for (const gf of expired) {
    await permanentDeleteGirlfriend(gf.id, userId);
  }

  return expired.length;
}

// ============ Conversations with Last Message ============

export async function getConversationsWithLastMessage(userId: number): Promise<
  (Conversation & { lastMessage?: string; lastMessageAt?: Date; girlfriendName?: string; girlfriendImage?: string })[]
> {
  const db = await getDb();
  if (!db) return [];

  // 获取用户所有对话
  const convos = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt));

  // 为每个对话获取最后一条消息和女友信息
  const result = await Promise.all(
    convos.map(async (convo) => {
      // 获取最后一条消息
      const lastMsgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, convo.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      // 获取女友信息
      const gfs = await db
        .select({ name: girlfriends.name, referenceImageUrl: girlfriends.referenceImageUrl })
        .from(girlfriends)
        .where(eq(girlfriends.id, convo.girlfriendId))
        .limit(1);

      const lastMsg = lastMsgs[0];
      const gf = gfs[0];

      return {
        ...convo,
        lastMessage: lastMsg?.content || undefined,
        lastMessageAt: lastMsg?.createdAt || undefined,
        girlfriendName: gf?.name || undefined,
        girlfriendImage: gf?.referenceImageUrl || undefined,
      };
    })
  );

  return result;
}

// ============ Search Conversations ============

export async function searchConversations(
  userId: number,
  keyword: string
): Promise<
  (Conversation & { lastMessage?: string; lastMessageAt?: Date; girlfriendName?: string; girlfriendImage?: string; matchedMessage?: string })[] 
> {
  const db = await getDb();
  if (!db) return [];

  // 搜索包含关键词的消息
  const matchedMsgs = await db
    .select({
      conversationId: messages.conversationId,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(like(messages.content, `%${keyword}%`))
    .orderBy(desc(messages.createdAt));

  // 获取去重的对话 ID 列表（保持匹配顺序）
  const seenConvoIds = new Set<number>();
  const matchedConvoData: { conversationId: number; matchedMessage: string }[] = [];
  for (const msg of matchedMsgs) {
    if (!seenConvoIds.has(msg.conversationId)) {
      seenConvoIds.add(msg.conversationId);
      matchedConvoData.push({
        conversationId: msg.conversationId,
        matchedMessage: msg.content.length > 60 ? msg.content.substring(0, 60) + "..." : msg.content,
      });
    }
  }

  if (matchedConvoData.length === 0) return [];

  // 获取对话详情
  const result = await Promise.all(
    matchedConvoData.map(async ({ conversationId, matchedMessage }) => {
      const convoArr = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
        .limit(1);

      if (convoArr.length === 0) return null;
      const convo = convoArr[0];

      // 获取最后一条消息
      const lastMsgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, convo.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      // 获取女友信息
      const gfs = await db
        .select({ name: girlfriends.name, referenceImageUrl: girlfriends.referenceImageUrl })
        .from(girlfriends)
        .where(eq(girlfriends.id, convo.girlfriendId))
        .limit(1);

      const lastMsg = lastMsgs[0];
      const gf = gfs[0];

      return {
        ...convo,
        lastMessage: lastMsg?.content || undefined,
        lastMessageAt: lastMsg?.createdAt || undefined,
        girlfriendName: gf?.name || undefined,
        girlfriendImage: gf?.referenceImageUrl || undefined,
        matchedMessage,
      };
    })
  );

  return result.filter((r): r is NonNullable<typeof r> => r !== null);
}

// ============ Girlfriend Mood Functions ============

export async function getGirlfriendMood(
  userId: number,
  girlfriendId: number
): Promise<GirlfriendMood | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(girlfriendMoods)
    .where(and(eq(girlfriendMoods.userId, userId), eq(girlfriendMoods.girlfriendId, girlfriendId)))
    .limit(1);

  return result[0];
}

export async function upsertGirlfriendMood(
  data: InsertGirlfriendMood
): Promise<GirlfriendMood> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(girlfriendMoods)
    .where(
      and(
        eq(girlfriendMoods.userId, data.userId),
        eq(girlfriendMoods.girlfriendId, data.girlfriendId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(girlfriendMoods)
      .set({
        mood: data.mood,
        moodScore: data.moodScore,
        lastChatAt: data.lastChatAt,
        totalMessages: data.totalMessages,
        todayMessages: data.todayMessages,
        lastMoodUpdate: new Date(),
      })
      .where(eq(girlfriendMoods.id, existing[0].id));

    const updated = await db
      .select()
      .from(girlfriendMoods)
      .where(eq(girlfriendMoods.id, existing[0].id))
      .limit(1);
    return updated[0]!;
  } else {
    const result = await db.insert(girlfriendMoods).values(data);
    const insertedId = Number(result[0].insertId);
    const inserted = await db
      .select()
      .from(girlfriendMoods)
      .where(eq(girlfriendMoods.id, insertedId))
      .limit(1);
    return inserted[0]!;
  }
}

export async function getAllGirlfriendMoods(
  userId: number
): Promise<GirlfriendMood[]> {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(girlfriendMoods)
    .where(eq(girlfriendMoods.userId, userId));
}

// ============ Create Default Girlfriend ============

export async function createDefaultGirlfriend(userId: number, data: InsertGirlfriend): Promise<Girlfriend> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 检查用户是否已有未删除的女友
  const existing = await db
    .select()
    .from(girlfriends)
    .where(and(eq(girlfriends.userId, userId), isNull(girlfriends.deletedAt)))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // 创建默认女友
  const result = await db.insert(girlfriends).values(data);
  const insertedId = Number(result[0].insertId);

  const inserted = await db
    .select()
    .from(girlfriends)
    .where(eq(girlfriends.id, insertedId))
    .limit(1);

  return inserted[0]!;
}

// ============ Notifications ============

export async function createNotification(data: InsertNotification): Promise<Notification> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(notifications).values(data);
  const insertedId = Number(result[0].insertId);

  const inserted = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, insertedId))
    .limit(1);

  return inserted[0]!;
}

export async function getUserNotifications(userId: number, limit = 20): Promise<Notification[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

  return result[0]?.count ?? 0;
}

export async function markNotificationRead(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllNotificationsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

// 女友主动发消息的模板
const PROACTIVE_MESSAGES = {
  miss_you: [
    "在干嘛呀？好久没聊天了，人家想你了~ 💕",
    "你是不是把我忘了？😢 快来陪我聊聊天嘛",
    "今天过得怎么样？我一直在等你来找我呢~",
    "好无聊啊，你什么时候来陪我说说话？🥺",
    "我刚才梦到你了，醒来发现你不在，好想你~",
  ],
  good_morning: [
    "早上好呀！☀️ 新的一天开始了，要元气满满哦~",
    "起床啦起床啦！今天也要加油鸭！🦆",
    "早安~ 今天天气不错，心情也要棒棒的哦！",
    "早上好！记得吃早餐，不许饿着自己 🍞",
  ],
  good_night: [
    "该睡觉啦~ 晚安，做个好梦 🌙",
    "夜深了，不要熬夜哦，明天还要精神满满的！",
    "晚安呀~ 梦里见 💤",
    "今天辛苦了，好好休息吧，我会在梦里等你的~",
  ],
  random: [
    "突然好想跟你分享一件事！你在吗？",
    "刚才看到一个好有趣的东西，想跟你说说~",
    "你猜我现在在想什么？😏",
    "无聊中...要不要来陪我聊聊天？",
    "今天的天气让我想到了你~ ☁️",
    "嘿！有空吗？想跟你说说话~",
  ],
};

export function getRandomProactiveMessage(type: keyof typeof PROACTIVE_MESSAGES): { title: string; content: string } {
  const messages = PROACTIVE_MESSAGES[type];
  const content = messages[Math.floor(Math.random() * messages.length)];
  const titles: Record<string, string> = {
    miss_you: "💕 想你了",
    good_morning: "☀️ 早安",
    good_night: "🌙 晚安",
    random: "💬 新消息",
    mood: "💭 心情分享",
  };
  return { title: titles[type] || "💬 新消息", content };
}

// 检查是否应该发送主动消息（基于上次聊天时间和心情）
export async function checkAndCreateProactiveNotification(userId: number): Promise<Notification | null> {
  const db = await getDb();
  if (!db) return null;

  // 获取用户所有活跃女友
  const activeGirlfriends = await db
    .select()
    .from(girlfriends)
    .where(and(eq(girlfriends.userId, userId), isNull(girlfriends.deletedAt)));

  if (activeGirlfriends.length === 0) return null;

  // 随机选择一个女友
  const gf = activeGirlfriends[Math.floor(Math.random() * activeGirlfriends.length)];

  // 检查最近是否已发过通知（避免频繁打扰）
  const recentNotifications = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.girlfriendId, gf.id)))
    .orderBy(desc(notifications.createdAt))
    .limit(1);

  if (recentNotifications.length > 0) {
    const lastNotifTime = new Date(recentNotifications[0].createdAt).getTime();
    const hoursSinceLast = (Date.now() - lastNotifTime) / 3600000;
    if (hoursSinceLast < 2) return null; // 至少间隔 2 小时
  }

  // 获取心情状态
  const mood = await db
    .select()
    .from(girlfriendMoods)
    .where(and(eq(girlfriendMoods.userId, userId), eq(girlfriendMoods.girlfriendId, gf.id)))
    .limit(1);

  // 根据心情和时间选择消息类型
  const now = new Date();
  const hour = now.getHours();
  let messageType: keyof typeof PROACTIVE_MESSAGES;

  if (hour >= 6 && hour <= 8) {
    messageType = "good_morning";
  } else if (hour >= 22 || hour <= 1) {
    messageType = "good_night";
  } else if (mood.length > 0 && mood[0].moodScore < 40) {
    messageType = "miss_you";
  } else {
    messageType = Math.random() > 0.5 ? "random" : "miss_you";
  }

  const { title, content } = getRandomProactiveMessage(messageType);

  const notification = await createNotification({
    userId,
    girlfriendId: gf.id,
    title: `${gf.name}: ${title}`,
    content,
    type: messageType,
    isRead: false,
  });

  return notification;
}
