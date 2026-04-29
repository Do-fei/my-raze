<div align="center">

<img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663213781898/ovIQZzKPGxczbcAQ.png" alt="My Raze Logo" width="200" />

# My Raze ✨

**你的 AI 虚拟女友 · 智能对话 · 场景自拍 · 语音互动**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![tRPC](https://img.shields.io/badge/tRPC-11-2596BE?logo=trpc&logoColor=white)](https://trpc.io/)
[![Drizzle](https://img.shields.io/badge/Drizzle_ORM-0.44-C5F74F?logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![Vitest](https://img.shields.io/badge/Tests-143_passed-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

> ## 🚧 重构进行中 · DO NOT DEPLOY
>
> 当前 `main` 分支属于 **v3.0 MVP**，正在向生产可用版本重构。
> **Phase 1（安全加固）合并完成之前，请勿将本仓库部署到任何公网环境。**
>
> 已知未修复的高危漏洞（按 issue 追踪，逐项关闭）：
>
> | 状态 | Issue | 漏洞 |
> | --- | --- | --- |
> | ✅ 已修 | [#6](https://github.com/Do-fei/my-raze/issues/6)  | `JWT_SECRET` 默认空导致任意会话伪造 |
> | ✅ 已修 | [#11](https://github.com/Do-fei/my-raze/issues/11) | 日志泄露 API key / 用户 PII |
> | ✅ 已修 | [#4](https://github.com/Do-fei/my-raze/issues/4)  | 跨用户写入对话消息 / 自拍 |
> | ⏳ 修复中 | [#8](https://github.com/Do-fei/my-raze/issues/8)  | tRPC mutation 无 CSRF 保护 |
> | ⏳ 修复中 | [#9](https://github.com/Do-fei/my-raze/issues/9)  | LLM 输出未消毒 → 存储型 XSS |
> | ⏳ Phase 1b | [#7](https://github.com/Do-fei/my-raze/issues/7)  | OAuth state 无 HMAC（随 OAuth 整体替换一起修） |
> | ⏳ Phase 1b | [#2](https://github.com/Do-fei/my-raze/issues/2), [#3](https://github.com/Do-fei/my-raze/issues/3) | 用户 API key 明文存储 + tRPC 路由裸传 |
> | ⏳ Phase 1c | [#5](https://github.com/Do-fei/my-raze/issues/5), [#10](https://github.com/Do-fei/my-raze/issues/10) | 无服务端限流 + 无订阅配额（运营成本可被刷爆） |
>
> 完整重构计划见 [`docs/REFACTORING.md`](docs/REFACTORING.md)；
> 全部 issue 见 [issue tracker](https://github.com/Do-fei/my-raze/issues)；
> 重大决策见 [`docs/adr/`](docs/adr/)。

---

## 简介

My Raze 是一个全栈 AI 虚拟女友 Web 应用，支持 PWA 安装到手机桌面。用户可以创建拥有独特人格的 AI 女友，与她进行智能文字/语音对话，让她根据聊天场景生成自拍照片，并通过亲密度系统建立深层情感连接。

项目采用 **TypeScript 全栈**开发，前后端共享类型定义，端到端类型安全。当前版本 **v3.0**，包含 22,000+ 行代码和 143 个自动化测试用例。

---

## 功能特性

### 核心功能

| 功能 | 说明 |
|------|------|
| **智能对话** | 基于 OpenRouter 接入 GPT-4o / Claude / Grok 等主流 LLM，支持流式输出 |
| **AI 自拍** | 根据对话场景自动或手动触发，通过 fal.ai 生成高质量场景化自拍照片 |
| **语音对话** | 支持三种 TTS 方案（浏览器内置 / ElevenLabs / Fish Audio）+ Whisper 语音转文字 |
| **多女友系统** | 创建多个拥有不同人格、外貌、兴趣的 AI 女友，自由切换 |
| **亲密度系统** | 10 级亲密度等级，通过对话/语音/自拍等互动积累经验值，解锁专属称呼和内容 |
| **心情系统** | AI 女友拥有动态心情状态，根据聊天频率和内容实时变化 |
| **推送通知** | AI 女友会主动发送早安/晚安/想你了等消息 |
| **自拍画廊** | 浏览和管理所有 AI 生成的自拍照片 |

### 个性化配置

| 功能 | 说明 |
|------|------|
| **提示词分层架构** | 系统基础 → 全局用户 → 个体女友 → 结构化字段，四层提示词精细控制 AI 行为 |
| **6 种快捷人格模板** | 温柔体贴 / 活泼可爱 / 知性优雅 / 傲娇女王 / 元气少女 / 神秘冷艳 |
| **自定义头像** | 上传自定义头像（支持 JPG/PNG/GIF/WebP，最大 10MB） |
| **回复语言/长度控制** | 自定义 AI 回复的语言和字数范围 |
| **模型自由选择** | 通过 OpenRouter 接入 500+ 模型，支持收藏常用模型 |

### 移动端适配

| 功能 | 说明 |
|------|------|
| **PWA 支持** | 可安装到手机桌面，支持离线缓存 |
| **响应式设计** | 全页面适配移动端，包括 iPhone 刘海屏和安全区域 |
| **手势操作** | 左滑返回 + 下拉刷新 |
| **触摸优化** | 按钮大小和间距适合手指操作 |

---

## 技术栈

```
前端                          后端                          基础设施
├── React 19                  ├── Express 4                 ├── MySQL (TiDB)
├── TypeScript 5.9            ├── tRPC 11                   ├── AWS S3
├── Tailwind CSS 4            ├── Drizzle ORM 0.44          ├── Manus OAuth
├── shadcn/ui + Radix UI      ├── SuperJSON                 ├── Vite 7
├── TanStack Query 5          ├── Zod 4                     ├── esbuild
├── Framer Motion             └── Node.js 22                ├── Vitest
├── Wouter 3                                                └── pnpm
└── Lucide React

外部 AI 服务
├── OpenRouter (LLM 对话 - GPT-4o / Claude / Grok 等)
├── fal.ai (AI 图片生成)
├── ElevenLabs (TTS 语音合成)
├── Fish Audio (TTS 语音合成 - 中文优化)
└── OpenAI Whisper (语音转文字)
```

---

## 项目结构

```
my-raze/
├── client/                    # 前端代码
│   ├── public/                # 静态资源（PWA 图标、manifest）
│   └── src/
│       ├── pages/             # 页面组件（7 个页面）
│       │   ├── Home.tsx       # 首页 - 女友卡片列表
│       │   ├── Chat.tsx       # 聊天 - 消息/语音/自拍
│       │   ├── Setup.tsx      # 创建/编辑女友
│       │   ├── Gallery.tsx    # 自拍画廊
│       │   ├── Settings.tsx   # API 配置/行为设定
│       │   └── ...
│       ├── components/        # 可复用组件（11 个）
│       │   ├── IntimacyPanel.tsx      # 亲密度面板
│       │   ├── LevelUpAnimation.tsx   # 升级动画
│       │   ├── VoiceRecordButton.tsx  # 语音录制按钮
│       │   ├── NotificationBell.tsx   # 通知铃铛
│       │   └── ui/            # shadcn/ui 基础组件
│       ├── hooks/             # 自定义 Hooks
│       ├── contexts/          # React Context
│       ├── lib/               # 工具函数
│       └── App.tsx            # 路由配置
├── server/                    # 后端代码
│   ├── routers.ts             # tRPC API 路由（30+ 端点）
│   ├── db.ts                  # 数据库操作函数
│   ├── promptTemplates.ts     # 提示词模板
│   ├── storage.ts             # S3 存储操作
│   ├── *.test.ts              # 测试文件（15 个）
│   └── _core/                 # 框架层（认证/LLM/TTS 等）
├── shared/                    # 前后端共享代码
│   ├── intimacy.ts            # 亲密度等级系统
│   └── defaultGirlfriend.ts   # 默认女友配置
├── drizzle/                   # 数据库 Schema
│   └── schema.ts              # 8 张表定义
├── package.json
├── vite.config.ts
├── tsconfig.json
└── vitest.config.ts
```

---

## 数据库设计

项目使用 MySQL (TiDB) 数据库，通过 Drizzle ORM 管理，共 8 张表：

| 表名 | 用途 | 核心字段 |
|------|------|----------|
| `users` | 用户账户 | openId, name, role |
| `girlfriends` | 女友配置 | personality, appearance, intimacyLevel, avatarUrl |
| `conversations` | 对话会话 | userId, girlfriendId, title |
| `messages` | 聊天消息 | role, content, imageUrl |
| `selfies` | AI 自拍照 | imageUrl, prompt, mode |
| `apiConfigs` | API 配置 | llmApiKey, ttsProvider, globalPrompt |
| `girlfriendMoods` | 心情追踪 | mood, moodScore, todayMessages |
| `notifications` | 推送通知 | title, content, type, isRead |

---

## 快速开始

### 环境要求

- Node.js 22+
- pnpm 10+
- MySQL 8+ 或 TiDB

### 安装

```bash
# 克隆仓库
git clone https://github.com/Do-fei/my-raze.git
cd my-raze

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入数据库连接和必要的密钥

# 推送数据库 Schema
pnpm db:push

# 启动开发服务器
pnpm dev
```

### 环境变量

| 变量名 | 说明 | 必填 |
|--------|------|------|
| `DATABASE_URL` | MySQL/TiDB 连接字符串 | 是 |
| `JWT_SECRET` | JWT 签名密钥 | 是 |
| `VITE_APP_ID` | OAuth 应用 ID | 是 |
| `OAUTH_SERVER_URL` | OAuth 服务端地址 | 是 |

> 用户的 API Key（OpenRouter、fal.ai、ElevenLabs、Fish Audio）在应用内的设置页面配置，无需写入环境变量。

### 构建部署

```bash
# 构建生产版本
pnpm build

# 启动生产服务
pnpm start
```

---

## 测试

项目使用 Vitest 编写自动化测试，当前共 **143 个测试用例**，覆盖核心业务逻辑：

```bash
# 运行全部测试
pnpm test
```

测试覆盖范围包括：亲密度计算、心情系统、提示词模板、API 配置验证、语音转写、头像上传、批量操作等。

---

## 版本历史

| 版本 | 主要更新 |
|------|----------|
| **v3.0** | 亲密度等级系统（10 级、经验值、升级动画、防刷分机制） |
| **v2.9** | 语音转写 API 配置（Manus 内置 / OpenAI 双方案） |
| **v2.8** | 语音消息输入（按住说话、波形动画、上滑取消） |
| **v2.7** | API 使用量监控（余额查询、用量统计、进度条） |
| **v2.6** | 设置页增强（API Key 验证、模型收藏） |
| **v2.5** | 独立保存生效按钮（语音/fal.ai 配置） |
| **v2.4** | OpenRouter 配置保存生效 |
| **v2.3** | 女友头像上传（S3 存储、格式校验） |
| **v2.2** | 品牌 Logo + 推送通知 + 手势操作 |
| **v2.1** | PWA 移动端适配（响应式、安全区域、触摸优化） |
| **v2.0** | 提示词分层架构（四层提示词 + 6 种快捷模板） |
| **v1.9** | 退出登录 + 默认深色模式 |
| **v1.8** | 品牌更名 My Raze + 批量清理 + 回收站 |
| **v1.7** | 首页女友卡片删除按钮 |
| **v1.6** | 历史对话搜索 + 女友心情系统 |
| **v1.5** | 默认女友 Raze + 删除功能 + 历史侧边栏 + 语速控制 |
| **v1.4** | 语音双选方案（ElevenLabs + Fish Audio） |
| **v1.3** | 手动触发自拍按钮 |
| **v1.2** | OpenRouter 适配（500+ 模型） |
| **v1.1** | 语音对话 + 多女友支持 + 暗黑模式 |
| **v1.0** | 初始版本（智能对话 + AI 自拍 + 基础配置） |

---

## 项目统计

| 指标 | 数值 |
|------|------|
| TypeScript 代码行数 | 22,244 |
| 总代码行数（含 CSS/JSON） | 29,660 |
| 数据库表 | 8 张 |
| 页面 | 7 个 |
| 自定义组件 | 11 个 |
| tRPC API 端点 | 30+ |
| 测试用例 | 143 个 |
| 测试文件 | 15 个 |
| 外部 AI 服务集成 | 5 个 |
| 版本迭代 | 20 次 |

---

## 路线图

- [ ] **v3.1** — 长期记忆系统（记忆提取、语义检索、上下文注入）
- [ ] **v3.2** — 动态用户画像 + 每日对话摘要
- [ ] **v3.3** — 心跳主动消息 + PWA Push Notification
- [ ] **v4.0** — 记忆与亲密度深度整合

---

## 许可证

本项目基于 [MIT License](LICENSE) 开源。

---

## 致谢

- [OpenRouter](https://openrouter.ai/) — LLM 模型聚合平台
- [fal.ai](https://fal.ai/) — AI 图片生成服务
- [ElevenLabs](https://elevenlabs.io/) — AI 语音合成
- [Fish Audio](https://fish.audio/) — 中文语音合成
- [shadcn/ui](https://ui.shadcn.com/) — 精美的 React 组件库
- [tRPC](https://trpc.io/) — 端到端类型安全的 API 框架
- [Drizzle ORM](https://orm.drizzle.team/) — 类型安全的 ORM
- [OpenClaw](https://github.com/nicepkg/openclaw) — 记忆系统架构参考

---

<div align="center">

**Built with Dawei & Love**

</div>
