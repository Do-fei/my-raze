import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
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
} from "./db";
import { DEFAULT_GIRLFRIEND } from "../shared/defaultGirlfriend";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { invokeLLM } from "./_core/llm";
import { buildSmartPrompt } from "./promptTemplates";
import axios from "axios";
import { transcribeAudio } from "./_core/voiceTranscription";

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
        // 1. 保存用户消息
        const userMessage = await createMessage({
          conversationId: input.conversationId,
          role: "user",
          content: input.content,
        });

        // 2. 获取对话上下文
        const conversation = await getConversation(input.conversationId, ctx.user.id);
        if (!conversation) {
          throw new Error("Conversation not found");
        }

        const girlfriend = await getActiveGirlfriend(ctx.user.id);
        if (!girlfriend) {
          throw new Error("No active girlfriend found");
        }

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
        let aiResponse: string;
        try {
          if (apiConfig?.llmApiKey) {
            // 使用 OpenRouter API
            const openRouterUrl = "https://openrouter.ai/api/v1/chat/completions";
            const response = await axios.post(
              openRouterUrl,
              {
                model: apiConfig.llmModel || "openai/gpt-4o-mini",
                messages,
              },
              {
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${apiConfig.llmApiKey}`,
                },
              }
            );
            const messageContent = response.data.choices[0].message.content;
            aiResponse = typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent);
          } else {
            // 使用内置的 LLM API
            const response = await invokeLLM({ messages });
            const messageContent = response.choices[0].message.content;
            aiResponse = typeof messageContent === 'string' ? messageContent : (
              messageContent ? JSON.stringify(messageContent) : "抱歉，我现在有点累了，稍后再聊吧~"
            );
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
        // 1. 获取女友配置
        const girlfriend = await getActiveGirlfriend(ctx.user.id);
        if (!girlfriend) {
          throw new Error("No active girlfriend found");
        }

        // 2. 获取 API 配置
        const apiConfig = await getUserApiConfig(ctx.user.id);
        if (!apiConfig?.falApiKey) {
          throw new Error("fal.ai API key not configured");
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
                Authorization: `Key ${apiConfig.falApiKey}`,
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
  apiConfig: router({
    // 获取 API 配置
    get: protectedProcedure.query(async ({ ctx }) => {
      return await getUserApiConfig(ctx.user.id);
    }),

    // 更新 API 配置
    upsert: protectedProcedure
      .input(
        z.object({
          falApiKey: z.string().optional(),
          llmApiKey: z.string().optional(),
          llmModel: z.string().optional(),
          ttsProvider: z.enum(["browser", "elevenlabs", "fishaudio"]).optional(),
          elevenlabsApiKey: z.string().optional(),
          elevenlabsVoiceId: z.string().optional(),
          elevenlabsVoiceName: z.string().optional(),
          fishAudioApiKey: z.string().optional(),
          fishAudioModelId: z.string().optional(),
          fishAudioModelName: z.string().optional(),
          globalPrompt: z.string().max(500).nullable().optional(),
          replyLanguage: z.string().max(50).nullable().optional(),
          replyLengthLimit: z.string().max(50).nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await upsertApiConfig({
          userId: ctx.user.id,
          falApiKey: input.falApiKey,
          llmApiKey: input.llmApiKey,
          llmApiUrl: input.llmApiKey ? "https://openrouter.ai/api/v1/chat/completions" : undefined,
          llmModel: input.llmModel,
          ttsProvider: input.ttsProvider,
          elevenlabsApiKey: input.elevenlabsApiKey,
          elevenlabsVoiceId: input.elevenlabsVoiceId,
          elevenlabsVoiceName: input.elevenlabsVoiceName,
          fishAudioApiKey: input.fishAudioApiKey,
          fishAudioModelId: input.fishAudioModelId,
          fishAudioModelName: input.fishAudioModelName,
          globalPrompt: input.globalPrompt,
          replyLanguage: input.replyLanguage,
          replyLengthLimit: input.replyLengthLimit,
        });
      }),

    // 查询 ElevenLabs 声音列表
    fetchElevenLabsVoices: protectedProcedure
      .input(z.object({ apiKey: z.string().min(1) }))
      .query(async ({ input }) => {
        try {
          const response = await axios.get("https://api.elevenlabs.io/v1/voices", {
            headers: {
              "xi-api-key": input.apiKey,
            },
          });

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
          console.error("[ElevenLabs] Failed to fetch voices:", error?.response?.status);
          if (error?.response?.status === 401) {
            throw new Error("ElevenLabs API Key 无效，请检查后重试");
          }
          throw new Error("获取声音列表失败，请稍后重试");
        }
      }),

    // 查询 Fish Audio 声音模型列表
    fetchFishAudioModels: protectedProcedure
      .input(z.object({ apiKey: z.string().min(1), search: z.string().optional() }))
      .query(async ({ input }) => {
        try {
          const params: any = { page_size: 100, page_number: 1 };
          if (input.search) params.title = input.search;

          const response = await axios.get("https://api.fish.audio/model", {
            headers: {
              Authorization: `Bearer ${input.apiKey}`,
            },
            params,
          });

          const models = response.data.items.map((m: any) => ({
            id: m._id,
            name: m.title || m._id,
            description: m.description || "",
            tags: m.tags || [],
          }));

          return { models, total: response.data.total || models.length };
        } catch (error: any) {
          console.error("[FishAudio] Failed to fetch models:", error?.response?.status);
          if (error?.response?.status === 401 || error?.response?.status === 403) {
            throw new Error("Fish Audio API Key 无效，请检查后重试");
          }
          throw new Error("获取声音模型列表失败，请稍后重试");
        }
      }),

    // 查询 OpenRouter 可用模型列表
    fetchModels: protectedProcedure
      .input(z.object({ apiKey: z.string().min(1) }))
      .query(async ({ input }) => {
        try {
          const response = await axios.get("https://openrouter.ai/api/v1/models", {
            headers: {
              Authorization: `Bearer ${input.apiKey}`,
            },
          });

          const models = response.data.data
            .filter((m: any) => {
              // 只保留支持文本对话的模型
              const arch = m.architecture;
              if (!arch) return true;
              const inputMods = arch.input_modalities || [];
              const outputMods = arch.output_modalities || [];
              return inputMods.includes("text") && outputMods.includes("text");
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
          console.error("[OpenRouter] Failed to fetch models:", error?.response?.status);
          if (error?.response?.status === 401) {
            throw new Error("API Key 无效，请检查后重试");
          }
          throw new Error("获取模型列表失败，请稍后重试");
        }
      }),

    // 查询 OpenRouter 余额
    fetchOpenRouterCredits: protectedProcedure
      .input(z.object({ apiKey: z.string().min(1) }))
      .query(async ({ input }) => {
        try {
          const response = await axios.get("https://openrouter.ai/api/v1/credits", {
            headers: {
              Authorization: `Bearer ${input.apiKey}`,
            },
          });
          const data = response.data.data;
          return {
            totalCredits: data.total_credits || 0,
            totalUsage: data.total_usage || 0,
            remaining: (data.total_credits || 0) - (data.total_usage || 0),
          };
        } catch (error: any) {
          console.error("[OpenRouter] Failed to fetch credits:", error?.response?.status);
          if (error?.response?.status === 401 || error?.response?.status === 403) {
            throw new Error("无法查询余额，API Key 可能不支持余额查询");
          }
          throw new Error("查询 OpenRouter 余额失败");
        }
      }),

    // 查询 ElevenLabs 订阅信息
    fetchElevenLabsUsage: protectedProcedure
      .input(z.object({ apiKey: z.string().min(1) }))
      .query(async ({ input }) => {
        try {
          const response = await axios.get("https://api.elevenlabs.io/v1/user/subscription", {
            headers: {
              "xi-api-key": input.apiKey,
            },
          });
          const data = response.data;
          return {
            tier: data.tier || "free",
            characterCount: data.character_count || 0,
            characterLimit: data.character_limit || 0,
            remaining: (data.character_limit || 0) - (data.character_count || 0),
            status: data.status || "unknown",
          };
        } catch (error: any) {
          console.error("[ElevenLabs] Failed to fetch usage:", error?.response?.status);
          if (error?.response?.status === 401) {
            throw new Error("API Key 无效，无法查询用量");
          }
          throw new Error("查询 ElevenLabs 用量失败");
        }
      }),

    // 查询 Fish Audio 余额
    fetchFishAudioCredits: protectedProcedure
      .input(z.object({ apiKey: z.string().min(1) }))
      .query(async ({ input }) => {
        try {
          const response = await axios.get("https://api.fish.audio/wallet/self/api-credit", {
            headers: {
              Authorization: `Bearer ${input.apiKey}`,
            },
          });
          const data = response.data;
          return {
            credit: parseFloat(data.credit) || 0,
            hasFreeCredit: data.has_free_credit || false,
          };
        } catch (error: any) {
          console.error("[FishAudio] Failed to fetch credits:", error?.response?.status);
          if (error?.response?.status === 401 || error?.response?.status === 403) {
            throw new Error("API Key 无效，无法查询余额");
          }
          throw new Error("查询 Fish Audio 余额失败");
        }
      }),
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
          if (!apiConfig.elevenlabsApiKey || !apiConfig.elevenlabsVoiceId) {
            throw new Error("请先配置 ElevenLabs API Key 并选择声音");
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
                  "xi-api-key": apiConfig.elevenlabsApiKey,
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
          if (!apiConfig.fishAudioApiKey || !apiConfig.fishAudioModelId) {
            throw new Error("请先配置 Fish Audio API Key 并选择声音模型");
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
                  Authorization: `Bearer ${apiConfig.fishAudioApiKey}`,
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

        // 4. 调用 Whisper 转写
        const result = await transcribeAudio({
          audioUrl,
          language: input.language,
          prompt: "这是一段与 AI 女友的日常对话语音消息",
        });

        // 5. 错误处理
        if ("error" in result) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: (result as any).error,
          });
        }

        // 6. 返回转写结果
        return {
          text: (result as any).text?.trim() || "",
          language: (result as any).language || "unknown",
          duration: (result as any).duration || 0,
        };
      }),
  }),
});
export type AppRouter = typeof appRouter;
