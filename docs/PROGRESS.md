# 开工后工作说明与下一步计划

记录本次 Cloud Agent 接手以后实际落地的内容，以及接下来按什么顺序做。日期：2026-09-04。

产品源码仓库是 [Do-fei/my-raze](https://github.com/Do-fei/my-raze)。独立官网**没有**并进本仓库；源码已部署到 EdgeOne / Railway，接到你自己的 GitHub 需要你新建空仓（建议名 `my-raze-official-site`）或在本次会话点 Create repo。

---

## 线上地址

| 用途 | 地址 | 说明 |
|---|---|---|
| 产品测试应用 | https://my-raze-app-production.up.railway.app | Railway 服务 `my-raze-app`，跑 `feat/m5-live2d` |
| 官网 · 中国站 | https://my-raze-official-site-upciljue.edgeone.cool | 腾讯云 EdgeOne Pages |
| 官网 · 海外备份 | https://my-raze-official-site-production.up.railway.app | 与产品应用同属一个 Railway 项目 |
| Live2D PR | https://github.com/Do-fei/my-raze/pull/48 | 开着，等你看过聊天页再合并 |

测试登录用邮箱 magic-link。预览环境 `EMAIL_PROVIDER=stdout`，链接在 Railway 日志里，不会真发邮件。聊天需要 OpenRouter：服务端尚未配置 `OPERATOR_OPENROUTER_KEY`，请在设置里自己填。

---

## 一、独立官网（另仓）

做了一套日漫二次元视觉的产品官网，没有塞进 `my-raze`。

- 技术：Next.js 16、React 19、TypeScript、Tailwind CSS 4
- 内容：四位角色人设、长期记忆 / 自拍 / 语音 / 亲密度介绍、产品界面 GIF、Live2D 概念区（视线跟随 + 五种情绪切换 + 概念视频）
- 看板娘概念资产：`raze-mascot.jpg`、倾听 / 比心 / 撒娇 / 生气 / 哭，以及 `live2d-concept.mp4`
- 桌面和手机都能看

这些图是**压扁的概念成图**，不能当 Cubism 工程 PSD。正式模型必须另画正面中性站姿分层稿。

---

## 二、M5 Live2D 看板娘（本仓库 `feat/m5-live2d`）

相对 `main`（`a51eb79`）的 7 个提交：

| Commit | 做什么 |
|---|---|
| `3fea7ab` | 聊天舞台、情绪表情、口型同步 |
| `7cf5995` | 允许 `EMAIL_PROVIDER=stdout`，方便 Railway 预览登录 |
| `1e01cd4` | 生产镜像懒加载 Vite，避免 `Cannot find package 'vite'` |
| `ceede8b` | 用未缩放 canvas + `originalWidth/Height` 适配，模型不再挤在角落 |
| `82b1b7e` | 示例模型可点：生气 / 害羞 / 撒娇 / 哭鼻子 / 发脾气 |
| `91c2401` | 加大动作：叉腰、比心、跳起来 |
| `2a3d074` | 委托清单 + `useAvatarController` 钩子 |

### 已经能用的能力

- 只给官方角色 Raze 显示 Live2D（`referenceImageKey` 以 `default-raze-` 开头，或默认名且无自定义图）
- **禁止用户导入模型**（Cubism 免费出版许可不允许 Expandable Application）
- 视线跟随、点击、idle / listening / thinking / speaking
- 回复里的 `[[emotion:]]` 由服务端剥离，返回 `emotion` 驱动表情；没标签时按文案推断
- API 语音按 RMS 张嘴；浏览器 TTS 用模拟口型
- 设置页「启用 Live2D」；`prefers-reduced-motion` / 无 WebGL 降级为静态立绘
- 底部按钮 + 点模型：叉腰生气 / 害羞 / 比心 / 哭鼻子 / 跳起来（玩法表情覆盖约 6 秒；倾听态仍强制 listening）
- 「骚叫」做成撒娇 / 比心，没有叫声素材

### 技术选型

- PixiJS 8 + `untitled-pixi-live2d-engine` + `@pixi/sound`
- 占位模型：Live2D 官方 **Hiyori**，放在 `client/public/live2d/official/`
- Cubism Core **不入库**，走官方 CDN 或 `pnpm live2d:core` / Docker wget
- Hiyori **没有 .exp3**。现在的大动作是参数预设 + Arm A/B + PIXI 跳跃。正式模型到了，按钮改播真 motion / exp 即可
- 缩放必须用 `internalModel.originalWidth/Height` + `computeLive2DLayout`，不能用 PIXI 已经缩过的宽高

关键文件：

- `shared/live2d.ts`、`shared/live2d.test.ts`（25 个单测）
- `client/src/components/live2d/Live2DCanvas.tsx`、`Live2DStage.tsx`、`useAvatarController.ts`
- `client/src/hooks/useLipSync.ts`、`useLive2DPreference.ts`
- `client/src/lib/cubism-core.ts`
- `client/src/pages/Chat.tsx`、`Settings.tsx`
- `docs/live2d/SPIKE.md`、`docs/live2d/commission-brief.md`

### 验证过的

- `pnpm exec tsc --noEmit` 通过
- `shared/live2d.test.ts` 25 测通过
- `pnpm build` 通过，`Live2DCanvas` 已拆成独立 chunk
- 本环境没有 Docker daemon，没有在本地跑镜像

---

## 三、看板娘建模结论（已对齐）

正式形象必须是 **Live2D Cubism**。换 `client/public/live2d/official/` 就能接上，舞台逻辑不用重写。

| 方案 | 结论 |
|---|---|
| Tripo3D 等图生 3D | **不适合**当虚拟女友看板娘。出的是 GLB/FBX，不是 moc3 |
| 官网 JPG / 概念视频 | 只能当人设参考，不能进 Cubism |
| AI 一键出可上线 moc3 | 目前做不到。See-through 一类工具最多帮切层 |
| 正确路径 | 画师用 PS / CSP 画分层 PSD + **Cubism Editor 5** 绑定 |

人设不要改：紫发紫瞳、粉猫耳帽、娇小少女，不要 OL。18+ 产品建议默认装全年龄。

画师工具：Cubism Editor 5（FREE / PRO 试用 42 天 / PRO indie）。编辑器只有 Windows 10/11 与 macOS，没有 Linux。中国店：https://store.live2d.com/cn/

委托规格、12 套材料库、必须交付的运行时文件见 [`commission-brief.md`](./live2d/commission-brief.md)。参考价（仅绑定、不含原画，nizima 常见区间）约 5 万–20 万日元；合同必须写可嵌入自有网页 App、商用、交付 moc3、人设版权或永久使用权。不要买「仅 nizima LIVE」成品。

---

## 四、下一步计划

按依赖排序，不按日历估工期。

### 现在就能做（你这边）

1. **看 PR #48 的聊天页**，确认 Live2D 舞台、按钮表情、口型可以接受，再决定要不要合并进 `main`。我不会擅自合并。
2. **按 [`commission-brief.md`](./live2d/commission-brief.md) 去 nizima 委托正式看板娘**。把 `docs/live2d/*.jpg` 和官网 `raze-mascot.jpg` 一并给画师。必须另要一张正面中性站姿（双手不挡身体）。
3. **（可选）给 Railway 测试应用配 `OPERATOR_OPENROUTER_KEY`**，这样不用在设置里每次填 Key 也能聊。不配也能用，自己在设置里填即可。
4. **（可选）把官网绑到已备案域名**。EdgeOne 默认域名在个别网络会受限。

### 正式模型到货后（我这边）

1. 把 moc3 / 贴图 / physics / expressions / motions 放进 `client/public/live2d/official/`
2. 改 `shared/live2d.ts` 的 `OFFICIAL_LIVE2D_MODEL`
3. 按钮和点击改播真动作：`Idle` `Listen` `Heart` `Akimbo` `Jump` `Shy` `Cry`，去掉 Hiyori 参数拧脸
4. 口型继续走 `ParamMouthOpenY`
5. 重新部署 Railway 测试应用，更新演示 GIF

### 更后面（不在本次范围）

- **M6 记忆 2.0**：更深的长期记忆检索与主动关怀，和看板娘舞台是两条线
- 官网概念区以后可以改成嵌同一套正式 moc3，现在仍用概念图 + 视频即可
- 订阅 / 邮件生产通道（Resend 或 SMTP）等你准备对外再开

### 明确不做

- 不把官网并进 `my-raze`
- 不开放用户导入 Live2D 模型
- 不用 Tripo3D / 图生 3D 当看板娘正片
- 不在仓库里提交 Cubism Core 或任何 API Key

---

## 2026-09-05 本地接手：M5 边界修复

产品仓库已接到本地，仍在 `feat/m5-live2d`，PR #48 等待用户验收后决定是否合并。

- 移动端收起舞台后，切到桌面断点（1024px）会自动恢复舞台，避免展开按钮隐藏后留下空侧栏。
- Cubism Core 加载复用进行中的请求；失败或未定义 Core 时清理脚本，允许下次进入重试。每个来源最多等待 15 秒，本地失败后尝试官方 CDN，最终失败走原有静态降级。
- 浏览器语音在 `onstart` 开始驱动口型，在结束、错误、手动停止和页面卸载时停止。超过 20 秒的朗读持续驱动口型；已取消的旧朗读事件不会干扰新朗读。
- 新增加载失败/重试/并发/超时、跨断点折叠、长句口型及语音事件回归测试；保留原有 25 项 Live2D 映射测试。

验收时请检查：手机收起后放大窗口能恢复舞台；断网加载失败后恢复网络重新进入能重试；短句、长句、连续切换和停止朗读均按实际声音启停口型。

本次不涉及模型替换、数据库、线上变量、部署或 PR 合并。真实浏览器画面、设备语音及带数据库的完整聊天链路仍需验收；自动化模拟测试不代表这些项目已通过。


### 2026-09-05 OpenRouter 认证和聊天错误修复

- OpenRouter 新 Key 保存前调用 `GET /api/v1/key` 认证；模型目录不再用作认证证明。
- 设置页提供已保存 Key 的只读认证按钮，不回传 Key 或账户详情，不生成内容。
- Key 保存失败保留输入，不提示配置全部保存成功；空输入保留现有 Key。
- 聊天上游失败返回明确错误，不写入固定道歉回复；日志只输出状态码，失败后刷新消息。
- 本地认证回归与已有 Live2D 回归共 39 项通过，TypeScript 检查通过。部署验收结果另记本地报告。


### 2026-09-05 DeepSeek 官方直连

- 设置增加服务商选择和独立 DeepSeek Key；旧配置默认 OpenRouter。
- 复用 llmApiUrl 记录固定官方地址，不接受任意 URL，无数据库迁移。
- DeepSeek Key 加密保存，保存前 GET /user/balance 认证，提供只读重验按钮。
- 默认 deepseek-v4-flash，非思考模式，单次最多 1024 输出 token；可选官方 Pro。
- 聊天与记忆提取均按所选服务商路由，不串用 Key。商业计费模式 DeepSeek 要求 BYOK；自托管支持 OPERATOR_DEEPSEEK_KEY。
- 68 项针对性测试、类型检查、构建通过；真实 DeepSeek 认证和生成需用户保存 Key 后验收。

### 2026-09-05 回复长度与 Live2D 回复反应修复（待部署验收）

- 当前用户的一句话/简短要求追加为本轮优先风格约束，不再只依赖全局默认长度；未强行截断答案，效果需实测。
- 从独立 Pixi ticker 写参数改为引擎 beforeModelUpdate 事件。已核对引擎实际顺序：动作/表情/眨眼/物理 → beforeModelUpdate → core.update → loadParameters，避免写入时序被覆盖。
- 每条回复递增 replySequence，相同情绪连续回复也触发轻微回应动作，并清除此前手动表情覆盖。
- 新增渲染周期回归，覆盖口型/表情在绘制前写入、同情绪重新触发和卸载清理；相关 38 项测试通过，TypeScript 检查通过。
- 尚未部署或完成真实画面验收，按用户逐步批准要求等待下一步。

### 2026-09-05 Live2D 角色大小调节（待部署验收）

- 角色区域增加 80%–250% 大小滑块与恢复默认按钮，保存在当前浏览器 localStorage；存储不可用时仍可临时调节。
- 缩放沿脚底居中锚点放大，按可用高度限制，窗口改变时重新计算，不重复累乘、不重新加载模型。
- 增加窄侧栏放大与缩小窗口后高度约束回归；相关 30 项测试通过，类型检查通过。
- 尚未上线或在用户带鱼屏视觉验收，等待用户批准与前一批修复共同部署。

### 2026-09-05 第二轮验收及收尾修复

- 前批修复已部署至 Railway（6e276c7）；线上点击比心已确认真实双臂抬起，大小调为200%且刷新保留。
- 本轮通过浏览器模拟3440×1440，确认200%人物全身、顶部大小控件、底部动作按钮和聊天输入框可见；已恢复浏览器原尺寸。此为模拟视口验收，非用户实体显示器测量。
- 一句话真实回复仍分成三句，新增保存前普通中文标点连接，保留全部文字；代码、引文、列表与链接保留原样。此措施不承诺严格字数上限。
- 发现停止语音后嘴部缺少默认复位，新增ParamMouthOpenY默认0及停止后渲染回归。线上播放状态正常，但本轮截图未足以证明连续口型同步；新复位修复仍需部署后验证。
- 本轮33项针对性测试、TypeScript检查、前后端构建通过；保持既有分析环境变量与大包构建警告。
- 新增标点整理与闭嘴复位目前只在本地，等待用户批准推送、部署和最终真人页面验收；PR未合并。
