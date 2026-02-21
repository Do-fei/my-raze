import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Girlfriend configuration table
 * Stores personality, appearance description, and reference images
 */
export const girlfriends = mysqlTable("girlfriends", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  personality: text("personality").notNull(), // 性格描述，用于 LLM 系统提示词
  appearance: text("appearance").notNull(), // 外貌描述，用于图片生成
  interests: text("interests"), // 兴趣爱好
  referenceImageUrl: text("referenceImageUrl").notNull(), // S3 上的参考图片 URL
  referenceImageKey: varchar("referenceImageKey", { length: 500 }).notNull(), // S3 文件 key
  customPrompt: text("customPrompt"), // 个体定制提示词，追加在全局提示词之后
  avatarUrl: text("avatarUrl"), // 头像图片 URL（S3）
  avatarKey: varchar("avatarKey", { length: 500 }), // 头像 S3 文件 key
  isActive: boolean("isActive").default(true).notNull(), // 是否为当前激活的女友
  deletedAt: timestamp("deletedAt"), // 软删除时间，null 表示未删除，有值表示已删除（7天后可永久清除）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Girlfriend = typeof girlfriends.$inferSelect;
export type InsertGirlfriend = typeof girlfriends.$inferInsert;

/**
 * Conversation sessions table
 * Each conversation is a separate chat session
 */
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  girlfriendId: int("girlfriendId").notNull(),
  title: varchar("title", { length: 200 }), // 对话标题（可选）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Messages table
 * Stores all chat messages (user and AI)
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(), // 文本消息内容
  imageUrl: text("imageUrl"), // 如果是图片消息，存储图片 URL
  imageKey: varchar("imageKey", { length: 500 }), // S3 文件 key
  selfieMode: mysqlEnum("selfieMode", ["mirror", "direct"]), // 自拍模式（如果是自拍）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Selfies table
 * Stores all generated selfie images for gallery view
 */
export const selfies = mysqlTable("selfies", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  girlfriendId: int("girlfriendId").notNull(),
  messageId: int("messageId"), // 关联的消息 ID（可选）
  imageUrl: text("imageUrl").notNull(),
  imageKey: varchar("imageKey", { length: 500 }).notNull(),
  prompt: text("prompt").notNull(), // 用于生成的完整提示词
  userContext: text("userContext").notNull(), // 用户的上下文描述
  mode: mysqlEnum("mode", ["mirror", "direct"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Selfie = typeof selfies.$inferSelect;
export type InsertSelfie = typeof selfies.$inferInsert;

/**
 * API configurations table
 * Stores user's API keys for external services
 */
export const apiConfigs = mysqlTable("apiConfigs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  falApiKey: varchar("falApiKey", { length: 200 }), // fal.ai API Key
  llmApiKey: varchar("llmApiKey", { length: 200 }), // OpenRouter API Key
  llmApiUrl: varchar("llmApiUrl", { length: 500 }), // LLM API URL (固定为 OpenRouter)
  llmModel: varchar("llmModel", { length: 200 }), // 用户选择的模型 ID（如 openai/gpt-4o）
  // TTS 语音配置
  ttsProvider: mysqlEnum("ttsProvider", ["browser", "elevenlabs", "fishaudio"]).default("browser").notNull(), // 语音提供商
  elevenlabsApiKey: varchar("elevenlabsApiKey", { length: 200 }), // ElevenLabs API Key
  elevenlabsVoiceId: varchar("elevenlabsVoiceId", { length: 200 }), // ElevenLabs 选择的声音 ID
  elevenlabsVoiceName: varchar("elevenlabsVoiceName", { length: 200 }), // ElevenLabs 声音名称
  fishAudioApiKey: varchar("fishAudioApiKey", { length: 200 }), // Fish Audio API Key
  fishAudioModelId: varchar("fishAudioModelId", { length: 200 }), // Fish Audio 选择的声音模型 ID
  fishAudioModelName: varchar("fishAudioModelName", { length: 200 }), // Fish Audio 声音模型名称
  // 全局提示词配置
  globalPrompt: text("globalPrompt"), // 全局默认提示词，所有女友共享
  replyLanguage: varchar("replyLanguage", { length: 50 }).default("中文"), // 回复语言
  replyLengthLimit: varchar("replyLengthLimit", { length: 50 }).default("50-100字"), // 回复长度限制
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ApiConfig = typeof apiConfigs.$inferSelect;
export type InsertApiConfig = typeof apiConfigs.$inferInsert;

/**
 * Girlfriend mood tracking table
 * Tracks mood changes based on chat content and frequency
 */
export const girlfriendMoods = mysqlTable("girlfriendMoods", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  girlfriendId: int("girlfriendId").notNull(),
  mood: mysqlEnum("mood", ["excited", "happy", "content", "neutral", "lonely", "sad"]).default("happy").notNull(),
  moodScore: int("moodScore").default(70).notNull(), // 0-100, higher = happier
  lastChatAt: timestamp("lastChatAt"),
  totalMessages: int("totalMessages").default(0).notNull(),
  todayMessages: int("todayMessages").default(0).notNull(),
  lastMoodUpdate: timestamp("lastMoodUpdate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GirlfriendMood = typeof girlfriendMoods.$inferSelect;
export type InsertGirlfriendMood = typeof girlfriendMoods.$inferInsert;

/**
 * Notifications table
 * Stores push notifications from girlfriends (proactive messages)
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  girlfriendId: int("girlfriendId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  type: mysqlEnum("type", ["miss_you", "good_morning", "good_night", "random", "mood"]).default("random").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
