import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import {
  keyProvider,
  KEY_NAMES,
  validateProviderKey,
  type KeyName,
} from "./_core/keyProvider";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createGirlfriend,
  getActiveGirlfriend,
  getUserGirlfriends,
  updateGirlfriend,
  softDeleteGirlfriend,
  softDeleteGirlfriends,
  restoreGirlfriend,
  permanentDeleteGirlfriend,
  getTrashGirlfriends,
  cleanupExpiredTrash,
  createConversation,
  getUserConversations,
  getConversation,
  createMessage,
  getConversationMessages,
  getRecentMessages,
  createSelfie,
  getUserSelfies,
  getGirlfriendSelfies,
  deleteSelfie,
  upsertApiConfig,
  getUserApiConfig,
  getConversationsWithLastMessage,
  createDefaultGirlfriend,
  searchConversations,
  getGirlfriendMood,
  upsertGirlfriendMood,
  getAllGirlfriendMoods,
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  checkAndCreateProactiveNotification,
  getIntimacyInfo,
  addIntimacyPoints,
} from "./db";
import { DEFAULT_GIRLFRIEND } from "../shared/defaultGirlfriend";
import { POINTS_RULES, DAILY_POINTS_LIMIT, getLevelByPoints, getLevelInfo, getNextLevel, getLevelProgress, getPointsToNextLevel } from "../shared/intimacy";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { invokeLLM } from "./_core/llm";
import { buildSmartPrompt } from "./promptTemplates";
import axios from "axios";
import { transcribeAudio } from "./_core/voiceTranscription";
import { transcribeWithOpenAI } from "./_core/openaiWhisper";

// 判断是否应该生成自拍的辅助函数
function shouldGenerateSelfieFromText(aiResponse: string, userMessage: string): boolean {
  const selfieKeywords = [
    "照片",
    "自拍",
    "看看",
    "发张",
    "发个",
    "拍一张",
    "拍个",
    "穿",
    "在哪",
    "在干嘛",
    "在做什么",
    "现在",
  ];

  const combinedText = (aiResponse + " " + userMessage).toLowerCase();
  return selfieKeywords.some((keyword) => combinedText.includes(keyword));
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ============ Girlfriend Management ============
  girlfriend: router({
    // 创建女友配置
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(100),
          personality: z.string().min(1),
          appearance: z.string().min(1),
          interests: z.string().optional(),
          referenceImageBase64: z.string(), // Base64 编码的图片
          referenceImageMimeType: z.string(), // 如 "image/jpeg"
        })
      )
      .mutation(async ({ ctx, input }) => {
        // 上传参考图片到 S3
        const imageBuffer = Buffer.from(input.referenceImageBase64, "base64");
        const fileKey = `girlfriend-${ctx.user.id}-${nanoid()}.${input.referenceImageMimeType.split("/")[1]}`;

        const { url: imageUrl } = await storagePut(fileKey, imageBuffer, input.referenceImageMimeType);

        // 创建女友配置
        const girlfriend = await createGirlfriend({
          userId: ctx.user.id,
          name: input.name,
          personality: input.personality,
          appearance: input.appearance,
          interests: input.interests,
          referenceImageUrl: imageUrl,
          referenceImageKey: fileKey,
          isActive: true,
        });

        return girlfriend;
      }),

    // 获取当前激活的女友
    getActive: protectedProcedure.query(async ({ ctx }) => {
      return await getActiveGirlfriend(ctx.user.id);
    }),

    // 获取所有女友列表
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserGirlfriends(ctx.user.id);
    }),

    // 更新女友配置
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(100).optional(),
          personality: z.string().min(1).optional(),
          appearance: z.string().min(1).optional(),
          interests: z.string().optional(),
          customPrompt: z.string().max(300).nullable().optional(),
          isActive: z.boolean().optional(),
          avatarUrl: z.string().nullable().optional(),
          avatarKey: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateGirlfriend(id, ctx.user.id, data);
        return { success: true };
      }),

    // 上传女友头像
    uploadAvatar: protectedProcedure
      .input(
        z.object({
          girlfriendId: z.number(),
          imageBase64: z.string(), // Base64 编码的图片
          mimeType: z.enum(["image/jpeg", "image/png", "image/gif", "image/webp"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // 验证文件大小（Base64 编码后约为原始大小的 4/3，10MB 原始文件 ≈ 13.33MB Base64）
        const maxBase64Size = 10 * 1024 * 1024 * 4 / 3; // ~13.33MB
        if (input.imageBase64.length > maxBase64Size) {
          throw new Error("图片文件过大，请选择 10MB 以内的图片");
        }

        const imageBuffer = Buffer.from(input.imageBase64, "base64");
        const ext = input.mimeType.split("/")[1] === "jpeg" ? "jpg" : input.mimeType.split("/")[1];
        const fileKey = `avatar-${ctx.user.id}-${input.girlfriendId}-${nanoid()}.${ext}`;

        const { url: avatarUrl } = await storagePut(fileKey, imageBuffer, input.mimeType);

        // 更新女友记录
        await updateGirlfriend(input.girlfriendId, ctx.user.id, {
          avatarUrl,
          avatarKey: fileKey,
        });

        return { avatarUrl, avatarKey: fileKey };
      }),

    // 软删除女友（移入回收站，7天后自动永久删除）
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await softDeleteGirlfriend(input.id, ctx.user.id);
        return { success: true };
      }),

    // 批量软删除
    batchDelete: protectedProcedure
      .input(z.object({ ids: z.array(z.number()).min(1) }))
      .mutation(async ({ ctx, input }) => {
        await softDeleteGirlfriends(input.ids, ctx.user.id);
        return { success: true, count: input.ids.length };
      }),

    // 获取回收站列表
    trash: protectedProcedure.query(async ({ ctx }) => {
      // 先自动清理超过 7 天的项目
      await cleanupExpiredTrash(ctx.user.id);
      return await getTrashGirlfriends(ctx.user.id);
    }),

    // 从回收站恢复
    restore: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await restoreGirlfriend(input.id, ctx.user.id);
        return { success: true };
      }),

    // 永久删除（从回收站彻底清除）
    permanentDelete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await permanentDeleteGirlfriend(input.id, ctx.user.id);
        return { success: true };
      }),

    // 确保默认女友存在（登录后调用）
    ensureDefault: protectedProcedure.mutation(async ({ ctx }) => {
      const girlfriend = await createDefaultGirlfriend(ctx.user.id, {
        userId: ctx.user.id,
        name: DEFAULT_GIRLFRIEND.name,
        personality: DEFAULT_GIRLFRIEND.personality,
        appearance: DEFAULT_GIRLFRIEND.appearance,
        interests: DEFAULT_GIRLFRIEND.interests,
        referenceImageUrl: DEFAULT_GIRLFRIEND.referenceImageUrl,
        referenceImageKey: `default-raze-${ctx.user.id}`,
        isActive: true,
      });
      return girlfriend;
    }),

    // ============ 亲密度系统 ============

    // 获取亲密度信息（含衰减计算）
    getIntimacy: protectedProcedure
      .input(z.object({ girlfriendId: z.number() }))
      .query(async ({ ctx, input }) => {
        const info = await getIntimacyInfo(input.girlfriendId, ctx.user.id);
        const levelInfo = getLevelInfo(info.intimacyLevel);
        const nextLevel = getNextLevel(info.intimacyLevel);
        const progress = getLevelProgress(info.intimacyPoints);
        const pointsToNext = getPointsToNextLevel(info.intimacyPoints);

        return {
          ...info,
          levelInfo,
          nextLevel,
          progress,
          pointsToNext,
        };
      }),

    // 增加亲密度经验值
    addPoints: protectedProcedure
      .input(
        z.object({
          girlfriendId: z.number(),
          reason: z.enum([
            "text_message",
            "voice_message",
            "selfie",
            "daily_first",
            "edit_profile",
            "long_conversation",
            "night_chat",
          ]),
          messageLength: z.number().optional(), // 消息长度（用于加成计算）
          voiceDuration: z.number().optional(), // 语音时长（秒）
          conversationRounds: z.number().optional(), // 对话轮数
        })
      )
      .mutation(async ({ ctx, input }) => {
        const rule = POINTS_RULES[input.reason];
        if (!rule) throw new TRPCError({ code: "BAD_REQUEST", message: "无效的经验值类型" });

        // 计算基础经验值
        let points = rule.basePoints;

        // 加成计算
        switch (input.reason) {
          case "text_message":
            if (input.messageLength && input.messageLength > 50) {
              points += rule.bonusPoints || 0;
            }
            break;
          case "voice_message":
            if (input.voiceDuration && input.voiceDuration > 30) {
              points += rule.bonusPoints || 0;
            }
            break;
          case "long_conversation":
            if (input.conversationRounds && input.conversationRounds > 10) {
              points += rule.bonusPoints || 0;
            }
            break;
          default:
            // 其他类型使用基础经验值
            break;
        }

        // 过滤过短消息（< 5 字不计算）
        if (input.reason === "text_message" && input.messageLength && input.messageLength < 5) {
          return {
            intimacyLevel: 0,
            intimacyPoints: 0,
            previousLevel: 0,
            leveledUp: false,
            consecutiveDays: 0,
            pointsAdded: 0,
            skipped: true,
            skipReason: "消息过短，不计算经验值",
          };
        }

        const result = await addIntimacyPoints(
          input.girlfriendId,
          ctx.user.id,
          points,
          input.reason
        );

        return {
          ...result,
          pointsAdded: points,
          skipped: false,
          skipReason: null,
        };
      }),
  }),

  // ============ Conversation Management ============
  conversation: router({
    // 创建新对话
    create: protectedProcedure
      .input(
        z.object({
          girlfriendId: z.number(),
          title: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await createConversation({
          userId: ctx.user.id,
          girlfriendId: input.girlfriendId,
          title: input.title,
        });
      }),

    // 获取对话列表
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserConversations(ctx.user.id);
    }),

    // 获取对话列表（包含最后一条消息和女友信息）
    listWithDetails: protectedProcedure.query(async ({ ctx }) => {
      return await getConversationsWithLastMessage(ctx.user.id);
    }),

    // 获取单个对话
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      return await getConversation(input.id, ctx.user.id);
    }),

    // 获取对话消息
    getMessages: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ input }) => {
        return await getConversationMessages(input.conversationId);
      }),

    // 搜索对话（按消息内容关键词）
    search: protectedProcedure
      .input(z.object({ keyword: z.string().min(1).max(100) }))
      .query(async ({ ctx, input }) => {
        return await searchConversations(ctx.user.id, input.keyword);
      }),
  }),

  // ============ Chat ============
  chat: router({
    // 发送消息并获取 AI 回复
    sendMessage: protectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
          content: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // 1. 验证对话所有权（必须在写入前完成 — 见 issue #4）
        // 之前的实现顺序是 createMessage → getConversation，这意味着任何登录用户
        // 传一个别人的 conversationId 也能成功 INSERT 一条 user message 进对方对话。
        const conversation = await getConversation(input.conversationId, ctx.user.id);
        if (!conversation) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Conversation not found or not owned by current user",
          });
        }

        const girlfriend = await getActiveGirlfriend(ctx.user.id);
        if (!girlfriend) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No active girlfriend found",
          });
        }

        // 2. 保存用户消息（所有权已校验）
        // TODO(phase-2 / issue #17): 把 user msg + assistant msg 包进同一个事务，
        // 避免 LLM 调用失败时留下半截对话。
        const userMessage = await createMessage({
          conversationId: input.conversationId,
          role: "user",
          content: input.content,
        });

        // 3. 获取最近的消息历史（用于上下文）
        const recentMessages = await getRecentMessages(input.conversationId, 10);

        // 4. 获取用户全局提示词配置
        const apiConfig = await getUserApiConfig(ctx.user.id);

        // 5. 构建分层系统提示词
        let systemPrompt = `你是${girlfriend.name}，一个虚拟女友。

性格特征：
${girlfriend.personality}

外貌特征：
${girlfriend.appearance}

${girlfriend.interests ? `兴趣爱好：\n${girlfriend.interests}` : ""}

请以${girlfriend.name}的身份与用户对话，保持角色的一致性。你的回复应该自然、友好、充满情感。`;

        // 追加全局提示词（如果有）
        if (apiConfig?.globalPrompt) {
          systemPrompt += `\n\n【全局行为规范】\n${apiConfig.globalPrompt}`;
        }

        // 追加回复语言和长度限制
        if (apiConfig?.replyLanguage && apiConfig.replyLanguage !== "中文") {
          systemPrompt += `\n\n请使用${apiConfig.replyLanguage}回复。`;
        }
        if (apiConfig?.replyLengthLimit) {
          systemPrompt += `\n回复长度控制在${apiConfig.replyLengthLimit}左右。`;
        }

        // 追加个体定制提示词（如果有）
        if (girlfriend.customPrompt) {
          systemPrompt += `\n\n【${girlfriend.name}专属指令】\n${girlfriend.customPrompt}`;
        }

        // 6. 构建消息历史
        const messages = [
          { role: "system" as const, content: systemPrompt },
          ...recentMessages.map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
        ];

        // 7. 调用 LLM 获取回复
        // 密钥解析顺序（issue #2 / Phase 1b-i）：
        //   1) 用户的 BYOK OpenRouter key（如果在 Settings 里配过）
        //   2) 运营方的 OPERATOR_OPENROUTER_KEY（默认订阅用户走这里）
        //   3) 都没有 → 走 Manus 内置 invokeLLM
        const openRouterKey = await keyProvider.get(
          { userId: ctx.user.id },
          "openrouter"
        );
        let aiResponse: string;
        try {
          if (openRouterKey) {
            const openRouterUrl =
              "https://openrouter.ai/api/v1/chat/completions";
            const response = await axios.post(
              openRouterUrl,
              {
                model: apiConfig?.llmModel || "openai/gpt-4o-mini",
                messages,
              },
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${openRouterKey}`,
                },
              }
            );
            const messageContent = response.data.choices[0].message.content;
            aiResponse =
              typeof messageContent === "string"
                ? messageContent
                : JSON.stringify(messageContent);
          } else {
            // Manus-built-in fallback (Phase 1b-ii will replace this when
            // self-hostable auth lands).
            const response = await invokeLLM({ messages });
            const messageContent = response.choices[0].message.content;
            aiResponse =
              typeof messageContent === "string"
                ? messageContent
                : messageContent
                  ? JSON.stringify(messageContent)
                  : "抱歉，我现在有点累了，稍后再聊吧~";
          }
        } catch (error) {
          console.error("[Chat] LLM API error:", error);
          aiResponse = "抱歉，我现在有点累了，稍后再聊吧~";
        }

        // 8. 保存 AI 回复
        const assistantMessage = await createMessage({
          conversationId: input.conversationId,
          role: "assistant",
          content: aiResponse,
        });

        // 9. 判断是否需要生成自拍
        const shouldGenerateSelfie = shouldGenerateSelfieFromText(aiResponse, input.content);

        return {
          userMessage,
          assistantMessage,
          shouldGenerateSelfie,
        };
      }),


  }),

  // ============ Selfie Generation ============
  selfie: router({
    // 生成自拍
    generate: protectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
          userContext: z.string(), // 用户的上下文描述，如 "wearing a red dress"
        })
      )
      .mutation(async ({ ctx, input }) => {
        // 0. 验证对话所有权 — 见 issue #4。selfie.generate 此前会无条件
        // INSERT 一条 assistant message 到 input.conversationId，攻击者可借此
        // 把"自拍消息"写进任意对话。
        const conversation = await getConversation(input.conversationId, ctx.user.id);
        if (!conversation) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Conversation not found or not owned by current user",
          });
        }

        // 1. 获取女友配置
        const girlfriend = await getActiveGirlfriend(ctx.user.id);
        if (!girlfriend) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No active girlfriend found",
          });
        }

        // 2. 解析 fal.ai 密钥（用户 BYOK → 运营方默认）
        const falApiKey = await keyProvider.get(
          { userId: ctx.user.id },
          "fal"
        );
        if (!falApiKey) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "fal.ai API key not configured (set OPERATOR_FAL_KEY or your own key in Settings)",
          });
        }

        // 3. 使用 Clawra 提示词模板生成提示词
        const promptResult = buildSmartPrompt({
          userContext: input.userContext,
        });

        // 4. 调用 fal.ai API 生成图片
        let imageUrl: string;
        try {
          const response = await axios.post(
            "https://fal.run/fal-ai/grok-imagine-image-edit",
            {
              prompt: promptResult.prompt,
              image_url: girlfriend.referenceImageUrl,
            },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Key ${falApiKey}`,
              },
            }
          );

          imageUrl = response.data.images[0].url;
        } catch (error) {
          console.error("[Selfie] fal.ai API error:", error);
          throw new Error("Failed to generate selfie");
        }

        // 5. 下载图片并上传到 S3
        const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
        const imageBuffer = Buffer.from(imageResponse.data);
        const fileKey = `selfie-${ctx.user.id}-${nanoid()}.png`;
        const { url: s3Url } = await storagePut(fileKey, imageBuffer, "image/png");

        // 6. 保存自拍记录
        const selfie = await createSelfie({
          userId: ctx.user.id,
          girlfriendId: girlfriend.id,
          imageUrl: s3Url,
          imageKey: fileKey,
          prompt: promptResult.prompt,
          userContext: input.userContext,
          mode: promptResult.mode,
        });

        // 7. 创建消息记录（图片消息）
        const message = await createMessage({
          conversationId: input.conversationId,
          role: "assistant",
          content: `[自拍照片]`,
          imageUrl: s3Url,
          imageKey: fileKey,
          selfieMode: promptResult.mode,
        });

        return {
          selfie,
          message,
        };
      }),

    // 获取自拍列表
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserSelfies(ctx.user.id);
    }),

    // 获取指定女友的自拍列表
    listByGirlfriend: protectedProcedure
      .input(z.object({ girlfriendId: z.number() }))
      .query(async ({ input }) => {
        return await getGirlfriendSelfies(input.girlfriendId);
      }),

    // 删除自拍
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteSelfie(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ============ API Configuration ============
  // Phase 1b-i (issues #2 + #3) reshape:
  //   - Plaintext per-user API keys removed from `apiConfigs`. They live
  //     encrypted in the `userKeys` table now, accessed via KeyProvider.
  //   - The legacy `fetch*` routes that took a raw `apiKey` argument from
  //     the client are GONE — they were the open-proxy described in #3.
  //     Replacements (`listModels`, `listElevenLabsVoices`, etc.) resolve
  //     the key server-side via the user's BYOK or the operator default.
  //   - `get` returns preferences plus a `keys` map of mask info; never
  //     plaintext.
  apiConfig: router({
    // Get user preferences + per-key descriptions (no plaintext keys).
    get: protectedProcedure.query(async ({ ctx }) => {
      const config = await getUserApiConfig(ctx.user.id);
      const keys = await keyProvider.describeUserKeys(ctx.user.id);
      return {
        // null when the user hasn't saved preferences yet — frontend
        // treats that as "use defaults".
        preferences: config ?? null,
        keys,
      };
    }),

    // Update non-secret preferences (model id, voice id, prompts, etc.).
    // Key fields no longer accepted here — see `setKey` / `clearKey`.
    updatePreferences: protectedProcedure
      .input(
        z.object({
          llmModel: z.string().optional(),
          ttsProvider: z
            .enum(["browser", "elevenlabs", "fishaudio"])
            .optional(),
          elevenlabsVoiceId: z.string().optional(),
          elevenlabsVoiceName: z.string().optional(),
          fishAudioModelId: z.string().optional(),
          fishAudioModelName: z.string().optional(),
          whisperProvider: z.enum(["manus", "openai"]).optional(),
          globalPrompt: z.string().max(500).nullable().optional(),
          replyLanguage: z.string().max(50).nullable().optional(),
          replyLengthLimit: z.string().max(50).nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await upsertApiConfig({
          userId: ctx.user.id,
          ...input,
        });
      }),

    // Set / replace a user's BYOK key. Stored encrypted; plaintext never
    // returned to the client again. The server validates the value with a
    // single test call to the provider before persisting.
    setKey: protectedProcedure
      .input(
        z.object({
          name: z.enum(KEY_NAMES as unknown as [KeyName, ...KeyName[]]),
          value: z.string().min(8).max(500),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Optional: provider-specific validation (#3 — we replace the
        // legacy "test on every keystroke" pattern with a single explicit
        // validation on submit). Failures bubble as TRPCError so the UI
        // can show "key invalid".
        try {
          await validateProviderKey(input.name, input.value);
        } catch (err: any) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: err?.message ?? "Key validation failed",
          });
        }
        await keyProvider.setUserKey(ctx.user.id, input.name, input.value);
        return { ok: true as const };
      }),

    // Remove a user's BYOK key. After this, calls fall back to operator
    // default (or fail if no operator key is configured).
    clearKey: protectedProcedure
      .input(
        z.object({
          name: z.enum(KEY_NAMES as unknown as [KeyName, ...KeyName[]]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await keyProvider.clearUserKey(ctx.user.id, input.name);
        return { ok: true as const };
      }),

    // List OpenRouter chat models. Resolves the key server-side; no
    // `apiKey` input on the wire (issue #3).
    listModels: protectedProcedure.query(async ({ ctx }) => {
      const apiKey = await keyProvider.get(
        { userId: ctx.user.id },
        "openrouter"
      );
      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "OpenRouter key not configured. Set your own in Settings, or have the operator set OPERATOR_OPENROUTER_KEY.",
        });
      }
      try {
        const response = await axios.get(
          "https://openrouter.ai/api/v1/models",
          { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        const models = response.data.data
          .filter((m: any) => {
            const arch = m.architecture;
            if (!arch) return true;
            const inputMods = arch.input_modalities || [];
            const outputMods = arch.output_modalities || [];
            return (
              inputMods.includes("text") && outputMods.includes("text")
            );
          })
          .map((m: any) => ({
            id: m.id,
            name: m.name || m.id,
            contextLength: m.context_length || 0,
            pricing: {
              prompt: m.pricing?.prompt || "0",
              completion: m.pricing?.completion || "0",
            },
            provider: m.id.split("/")[0] || "unknown",
          }))
          .sort((a: any, b: any) => a.name.localeCompare(b.name));
        return { models, total: models.length };
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 401) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "OpenRouter key invalid",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch model list",
        });
      }
    }),

    // List ElevenLabs voices via server-resolved key.
    listElevenLabsVoices: protectedProcedure.query(async ({ ctx }) => {
      const apiKey = await keyProvider.get(
        { userId: ctx.user.id },
        "elevenlabs"
      );
      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "ElevenLabs key not configured",
        });
      }
      try {
        const response = await axios.get(
          "https://api.elevenlabs.io/v1/voices",
          { headers: { "xi-api-key": apiKey } }
        );
        const voices = response.data.voices.map((v: any) => ({
          id: v.voice_id,
          name: v.name,
          category: v.category || "premade",
          description: v.description || "",
          previewUrl: v.preview_url || "",
          labels: v.labels || {},
        }));
        return { voices, total: voices.length };
      } catch (error: any) {
        const status = error?.response?.status;
        if (status === 401) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "ElevenLabs key invalid",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch voices",
        });
      }
    }),

    // List Fish Audio voice models via server-resolved key.
    listFishAudioModels: protectedProcedure
      .input(z.object({ search: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        const apiKey = await keyProvider.get(
          { userId: ctx.user.id },
          "fish-audio"
        );
        if (!apiKey) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Fish Audio key not configured",
          });
        }
        try {
          const params: any = { page_size: 100, page_number: 1 };
          if (input.search) params.title = input.search;
          const response = await axios.get(
            "https://api.fish.audio/model",
            {
              headers: { Authorization: `Bearer ${apiKey}` },
              params,
            }
          );
          const models = response.data.items.map((m: any) => ({
            id: m._id,
            name: m.title || m._id,
            description: m.description || "",
            tags: m.tags || [],
          }));
          return {
            models,
            total: response.data.total || models.length,
          };
        } catch (error: any) {
          const status = error?.response?.status;
          if (status === 401 || status === 403) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Fish Audio key invalid",
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch voice models",
          });
        }
      }),

    // The legacy `fetchOpenRouterCredits`, `fetchElevenLabsUsage`, and
    // `fetchFishAudioCredits` routes are intentionally NOT recreated.
    // Per-user usage will be surfaced through the subscription quota
    // meters built in Phase 1c (issue #10), not via raw provider account
    // peeks. Self-hosters who really want raw credits can call the
    // providers directly with their BYOK key.
  }),

  // ============ Mood System ============
  mood: router({
    // 获取指定女友的心情
    get: protectedProcedure
      .input(z.object({ girlfriendId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await getGirlfriendMood(ctx.user.id, input.girlfriendId);
      }),

    // 获取所有女友的心情
    getAll: protectedProcedure.query(async ({ ctx }) => {
      return await getAllGirlfriendMoods(ctx.user.id);
    }),

    // 更新心情（在发送消息后调用）
    update: protectedProcedure
      .input(
        z.object({
          girlfriendId: z.number(),
          messageContent: z.string(),
          isUserMessage: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // 获取当前心情
        const currentMood = await getGirlfriendMood(ctx.user.id, input.girlfriendId);

        let moodScore = currentMood?.moodScore ?? 70;
        let totalMessages = currentMood?.totalMessages ?? 0;
        let todayMessages = currentMood?.todayMessages ?? 0;

        // 检查是否是新的一天，重置今日消息数
        const now = new Date();
        const lastUpdate = currentMood?.lastMoodUpdate;
        if (lastUpdate) {
          const lastDay = new Date(lastUpdate).toDateString();
          const today = now.toDateString();
          if (lastDay !== today) {
            todayMessages = 0;
          }
        }

        // 增加消息计数
        totalMessages += 1;
        todayMessages += 1;

        // 基于聊天内容调整心情分数
        const content = input.messageContent.toLowerCase();

        // 积极情绪关键词
        const positiveKeywords = [
          "爱", "喜欢", "开心", "快乐", "幸福", "漂亮", "可爱", "棒", "好棒",
          "想你", "想念", "亲亲", "抱抱", "宝贝", "亲爱", "美丽", "温柔",
          "谢谢", "感谢", "太好了", "开心", "哈哈", "嘻嘻",
          "love", "happy", "cute", "beautiful", "miss", "hug", "kiss",
        ];

        // 消极情绪关键词
        const negativeKeywords = [
          "生气", "不开心", "难过", "伤心", "无聊", "烦", "累", "讨厌",
          "分手", "再见", "拜拜", "不想", "笨", "丑", "差",
          "sad", "angry", "boring", "hate", "bye", "ugly",
        ];

        // 计算情绪变化
        let scoreDelta = 0;

        // 用户发消息本身就是正面信号（表示在乎）
        if (input.isUserMessage) {
          scoreDelta += 2;
        }

        for (const kw of positiveKeywords) {
          if (content.includes(kw)) {
            scoreDelta += 3;
            break;
          }
        }

        for (const kw of negativeKeywords) {
          if (content.includes(kw)) {
            scoreDelta -= 5;
            break;
          }
        }

        // 今日聊天数量加成
        if (todayMessages >= 20) scoreDelta += 2;
        else if (todayMessages >= 10) scoreDelta += 1;

        // 时间衰减：如果上次聊天超过24小时，心情下降
        if (currentMood?.lastChatAt) {
          const hoursSinceLastChat = (now.getTime() - new Date(currentMood.lastChatAt).getTime()) / 3600000;
          if (hoursSinceLastChat > 48) scoreDelta -= 10;
          else if (hoursSinceLastChat > 24) scoreDelta -= 5;
        }

        // 更新分数（限制在 0-100 范围）
        moodScore = Math.max(0, Math.min(100, moodScore + scoreDelta));

        // 根据分数确定心情状态
        let mood: "excited" | "happy" | "content" | "neutral" | "lonely" | "sad";
        if (moodScore >= 90) mood = "excited";
        else if (moodScore >= 70) mood = "happy";
        else if (moodScore >= 50) mood = "content";
        else if (moodScore >= 30) mood = "neutral";
        else if (moodScore >= 15) mood = "lonely";
        else mood = "sad";

        const result = await upsertGirlfriendMood({
          userId: ctx.user.id,
          girlfriendId: input.girlfriendId,
          mood,
          moodScore,
          lastChatAt: now,
          totalMessages,
          todayMessages,
          lastMoodUpdate: now,
        });

        return result;
      }),
  }),

  // ============ Notifications ============
  notification: router({
    // 获取通知列表
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserNotifications(ctx.user.id);
    }),

    // 获取未读通知数量
    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return await getUnreadNotificationCount(ctx.user.id);
    }),

    // 标记单条通知为已读
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await markNotificationRead(input.id, ctx.user.id);
        return { success: true };
      }),

    // 标记所有通知为已读
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),

    // 检查并生成主动通知（前端定时调用）
    checkProactive: protectedProcedure.mutation(async ({ ctx }) => {
      const notification = await checkAndCreateProactiveNotification(ctx.user.id);
      return notification;
    }),
  }),

  // ============ TTS 语音生成 ============
  tts: router({
    // 生成语音
    generate: protectedProcedure
      .input(
        z.object({
          text: z.string().min(1).max(5000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const apiConfig = await getUserApiConfig(ctx.user.id);
        if (!apiConfig) {
          throw new Error("未配置 API");
        }

        const provider = apiConfig.ttsProvider || "browser";

        if (provider === "elevenlabs") {
          // Phase 1b-i: resolve key via KeyProvider (BYOK → operator).
          const elevenKey = await keyProvider.get(
            { userId: ctx.user.id },
            "elevenlabs"
          );
          if (!elevenKey || !apiConfig.elevenlabsVoiceId) {
            throw new Error(
              elevenKey
                ? "请先在 Settings 中选择 ElevenLabs 声音"
                : "ElevenLabs 密钥未配置（运营方未设置或您未提供 BYOK）"
            );
          }

          try {
            const response = await axios.post(
              `https://api.elevenlabs.io/v1/text-to-speech/${apiConfig.elevenlabsVoiceId}`,
              {
                text: input.text,
                model_id: "eleven_multilingual_v2",
              },
              {
                headers: {
                  "xi-api-key": elevenKey,
                  "Content-Type": "application/json",
                  Accept: "audio/mpeg",
                },
                responseType: "arraybuffer",
              }
            );

            // 上传音频到 S3
            const audioBuffer = Buffer.from(response.data);
            const fileKey = `tts-${ctx.user.id}-${nanoid()}.mp3`;
            const { url } = await storagePut(fileKey, audioBuffer, "audio/mpeg");

            return { audioUrl: url, provider: "elevenlabs" as const };
          } catch (error: any) {
            console.error("[TTS] ElevenLabs error:", error?.response?.status);
            throw new Error("ElevenLabs 语音生成失败");
          }
        } else if (provider === "fishaudio") {
          const fishKey = await keyProvider.get(
            { userId: ctx.user.id },
            "fish-audio"
          );
          if (!fishKey || !apiConfig.fishAudioModelId) {
            throw new Error(
              fishKey
                ? "请先在 Settings 中选择 Fish Audio 声音模型"
                : "Fish Audio 密钥未配置（运营方未设置或您未提供 BYOK）"
            );
          }

          try {
            const response = await axios.post(
              "https://api.fish.audio/v1/tts",
              {
                text: input.text,
                reference_id: apiConfig.fishAudioModelId,
                format: "mp3",
              },
              {
                headers: {
                  Authorization: `Bearer ${fishKey}`,
                  "Content-Type": "application/json",
                  model: "s1",
                },
                responseType: "arraybuffer",
              }
            );

            // 上传音频到 S3
            const audioBuffer = Buffer.from(response.data);
            const fileKey = `tts-${ctx.user.id}-${nanoid()}.mp3`;
            const { url } = await storagePut(fileKey, audioBuffer, "audio/mpeg");

            return { audioUrl: url, provider: "fishaudio" as const };
          } catch (error: any) {
            console.error("[TTS] Fish Audio error:", error?.response?.status);
            throw new Error("Fish Audio 语音生成失败");
          }
        } else {
          // browser 模式，前端处理
          throw new Error("浏览器语音模式无需后端处理");
        }
      }),
  }),

  // ========== 语音转写 ==========
  voice: router({
    transcribe: protectedProcedure
      .input(
        z.object({
          audioBase64: z.string().min(1, "音频数据不能为空"),
          mimeType: z.string().default("audio/webm"),
          language: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // 1. Base64 解码
        const audioBuffer = Buffer.from(input.audioBase64, "base64");

        // 2. 文件大小校验（16MB 限制）
        const sizeMB = audioBuffer.length / (1024 * 1024);
        if (sizeMB > 16) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `音频文件过大（${sizeMB.toFixed(1)}MB），最大支持 16MB`,
          });
        }

        // 3. 上传到 S3
        const ext = input.mimeType.includes("webm")
          ? "webm"
          : input.mimeType.includes("mp4")
          ? "m4a"
          : input.mimeType.includes("ogg")
          ? "ogg"
          : "audio";
        const fileKey = `voice-messages/${ctx.user.id}/${Date.now()}-${nanoid(8)}.${ext}`;
        const { url: audioUrl } = await storagePut(
          fileKey,
          audioBuffer,
          input.mimeType
        );

        // 4. 获取用户的语音转写配置
        const apiConfig = await getUserApiConfig(ctx.user.id);
        const whisperProvider = apiConfig?.whisperProvider || "manus";
        // Phase 1b-i: OpenAI Whisper key now resolved via KeyProvider.
        const whisperApiKey = await keyProvider.get(
          { userId: ctx.user.id },
          "openai"
        );

        // 5. 根据配置选择 API
        let result;
        if (whisperProvider === "openai") {
          if (!whisperApiKey) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "请先在设置中配置 OpenAI API Key",
            });
          }
          result = await transcribeWithOpenAI(
            {
              audioUrl,
              language: input.language,
              prompt: "这是一段与 AI 女友的日常对话语音消息",
            },
            whisperApiKey
          );
        } else {
          // 默认使用 Manus 内置服务
          result = await transcribeAudio({
            audioUrl,
            language: input.language,
            prompt: "这是一段与 AI 女友的日常对话语音消息",
          });
        }

        // 6. 错误处理
        if ("error" in result) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: (result as any).error,
          });
        }

        // 7. 返回转写结果
        return {
          text: (result as any).text?.trim() || "",
          language: (result as any).language || "unknown",
          duration: (result as any).duration || 0,
        };
      }),
  }),
});
export type AppRouter = typeof appRouter;
