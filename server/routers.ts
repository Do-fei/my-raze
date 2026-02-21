import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  createGirlfriend,
  getActiveGirlfriend,
  getUserGirlfriends,
  updateGirlfriend,
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
} from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import { invokeLLM } from "./_core/llm";
import { buildSmartPrompt } from "./promptTemplates";
import axios from "axios";

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
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateGirlfriend(id, ctx.user.id, data);
        return { success: true };
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

        // 4. 构建系统提示词
        const systemPrompt = `你是${girlfriend.name}，一个虚拟女友。

性格特征：
${girlfriend.personality}

外貌特征：
${girlfriend.appearance}

${girlfriend.interests ? `兴趣爱好：\n${girlfriend.interests}` : ""}

请以${girlfriend.name}的身份与用户对话，保持角色的一致性。你的回复应该自然、友好、充满情感。`;

        // 5. 构建消息历史
        const messages = [
          { role: "system" as const, content: systemPrompt },
          ...recentMessages.map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
        ];

        // 6. 获取用户的 API 配置
        const apiConfig = await getUserApiConfig(ctx.user.id);

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
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await upsertApiConfig({
          userId: ctx.user.id,
          falApiKey: input.falApiKey,
          llmApiKey: input.llmApiKey,
          llmApiUrl: input.llmApiKey ? "https://openrouter.ai/api/v1/chat/completions" : undefined,
          llmModel: input.llmModel,
        });
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
  }),
});

export type AppRouter = typeof appRouter;
