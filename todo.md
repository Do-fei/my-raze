# AI Girlfriend 项目 TODO

## 数据库设计
- [x] 设计 girlfriends 表（存储女友配置信息）
- [x] 设计 conversations 表（存储对话会话）
- [x] 设计 messages 表（存储聊天消息）
- [x] 设计 selfies 表（存储生成的自拍照片）
- [x] 设计 api_configs 表（存储用户的 API Key 配置）

## 后端 API 实现
- [x] 实现女友配置的 CRUD API（创建、读取、更新、删除）
- [x] 实现参考图片上传到 S3 的 API
- [x] 实现对话会话管理 API
- [x] 实现发送消息和接收 AI 回复的 API
- [x] 实现智能判断何时生成自拍的逻辑
- [x] 实现调用 fal.ai API 生成自拍的功能
- [x] 实现自拍照片管理 API（列表、删除）
- [x] 实现 API Key 配置管理
- [x] 实现对话历史记录查询

## 前端界面开发
- [x] 设计并实现主页导航
- [x] 实现女友配置页面（性格设置、参考图片上传）
- [x] 实现聊天界面（消息列表、输入框、发送按钮）
- [x] 实现消息气泡组件（文本消息、图片消息）
- [x] 实现自拍照片画廊页面
- [x] 实现 API Key 配置页面
- [x] 实现加载状态和错误处理

## 核心功能集成
- [x] 集成 LLM API 实现智能对话
- [x] 集成 fal.ai API 实现自拍生成
- [x] 实现自拍模式自动选择逻辑（Mirror/Direct）
- [x] 实现对话上下文管理
- [x] 实现图片生成提示词构建逻辑

## 测试和优化
- [x] 编写后端单元测试
- [x] 测试图片上传和生成流程
- [x] 测试对话连续性
- [x] 优化加载性能
- [x] 完善错误提示

## 文档和交付
- [x] 编写使用说明文档
- [x] 准备演示数据
- [ ] 创建项目检查点

## 高优先级新功能（v1.1）
- [x] 语音对话（TTS）- 让 AI 女友可以说话
  - [x] 使用浏览器内置 Web Speech API（免费）
  - [x] 前端添加语音播放按钮和控件
  - [x] 支持自动播放和手动播放切换
  - [x] 设置页面添加语音测试按钮
- [x] 多女友支持 - 创建和切换多个女友
  - [x] 后端已支持多女友列表查询
  - [x] 首页显示女友列表卡片
  - [x] 支持点击聊天自动激活并跳转
  - [x] 支持编辑已有女友配置
- [x] 暗黑模式 - 支持夜间主题
  - [x] 更新 index.css 添加浪漫粉色暗黑主题
  - [x] 启用 ThemeProvider 的 switchable 功能
  - [x] 所有页面添加主题切换按钮
  - [x] 设置页面添加主题切换开关

## OpenRouter 适配（v1.2）
- [x] 后端：新增 OpenRouter 模型列表查询 API
- [x] 后端：修改对话逻辑适配 OpenRouter API 格式
- [x] 数据库：api_configs 表注释更新为 OpenRouter
- [x] 前端：设置页面 LLM 区域改为 OpenRouter 专属配置
- [x] 前端：输入 API Key 后自动加载可用模型列表
- [x] 前端：模型列表支持搜索、分组和选择
- [x] 测试：编写 OpenRouter 相关单元测试（24 个测试全部通过）

## 手动触发自拍按钮（v1.3）
- [x] 在聊天输入框旁添加“拍照”按钮（Camera 图标）
- [x] 点击后触发自拍生成流程（支持输入框场景描述或默认随意自拍）
- [x] 添加生成中的加载状态提示（旋转动画 + toast）

## 语音双选方案（v1.4）
- [x] 研究 ElevenLabs API（声音列表、TTS 生成）
- [x] 研究 Fish Audio API（声音列表、TTS 生成）
- [x] 数据库：apiConfigs 表添加语音配置字段（ttsProvider, elevenlabsApiKey, elevenlabsVoiceId, fishAudioApiKey, fishAudioModelId 等）
- [x] 后端：新增 ElevenLabs 声音列表查询 API
- [x] 后端：新增 Fish Audio 声音列表查询 API
- [x] 后端：新增 TTS 生成 API（根据 provider 选择 ElevenLabs 或 Fish Audio）
- [x] 前端：设置页面语音区域改为三种模式选择（免费/ElevenLabs/Fish Audio）
- [x] 前端：ElevenLabs 填 Key 后自动加载声音列表（含分类和试听）
- [x] 前端：Fish Audio 填 Key 后自动加载声音列表（含搜索和标签）
- [x] 前端：聊天页面语音播放逻辑适配三种模式（浏览器内置/ElevenLabs/Fish Audio）
- [x] 测试：编写语音功能相关单元测试（39 个测试全部通过）

## v1.5 功能更新
- [x] 默认女友 Raze：用户登录后自动创建默认女友
- [x] 删除女友功能：编辑页底部增加带二次确认的删除按钮
- [x] 历史对话侧边栏：首页增加可滚动和快速切换的历史对话列表
- [x] 语音播放速度控制：聊天界面增加播放速度调节（0.5x ~ 2x）
- [x] 新功能单元测试：43 个测试全部通过

## v1.6 功能更新
- [x] 历史对话关键词搜索：侧边栏增加搜索框，支持按消息内容搜索对话
- [x] 女友心情系统：根据聊天内容和频率自动计算心情状态，首页和聊天页展示
- [x] 新功能单元测试：50 个测试全部通过

## v1.7 功能更新
- [x] 首页女友卡片增加删除按钮：聊天/编辑旁增加删除按钮，带 AlertDialog 二次确认

## v1.8 功能更新
- [x] 项目名称改为 My Raze：全局替换所有 AI Girlfriend 文字
- [x] 批量清理：增加多选删除功能，支持全选/取消全选
- [x] 删除保护：当前激活女友删除时显示额外警告提示
- [x] 回收站机制：软删除 + 7天自动清理 + 恢复/彻底删除
- [x] 新功能单元测试：56 个测试全部通过

## v1.9 功能更新
- [x] 退出登录按钮：首页顶栏增加退出登录功能，退出后回到欢迎页
- [x] 默认深色模式：ThemeProvider 默认主题改为 dark
- [x] 修复 bug：createDefaultGirlfriend 现在只检查未删除的女友，避免重复创建

## v2.0 提示词分层方案
- [x] 数据库：api_configs 表新增 globalPrompt / replyLanguage / replyLengthLimit 字段
- [x] 数据库：girlfriends 表新增 customPrompt 字段
- [x] 后端：全局提示词 CRUD API（读取/保存）
- [x] 后端：对话系统集成分层提示词拼接逻辑
- [x] 前端 Settings：新增“AI 行为设定”卡片（全局提示词 + 6个快捷模板 + 高级选项）
- [x] 前端 Setup：新增可折叠“高级提示词定制”区域 + 分层提示词预览面板
- [x] 单元测试：71 个测试全部通过

## v2.1 PWA 移动端适配
- [x] PWA Manifest：创建 manifest.json（名称、图标、主题色、standalone 启动模式）
- [x] Service Worker：实现离线缓存和资源预缓存策略
- [x] iOS 适配：apple-touch-icon、apple-mobile-web-app-capable、status-bar-style
- [x] Android 适配：theme-color、status bar 样式
- [x] 响应式首页：女友卡片、导航栏、侧边栏在小屏幕自适应
- [x] 响应式聊天页：输入框、消息气泡、顶栏在移动端优化
- [x] 响应式设置页：表单和卡片在小屏幕自适应
- [x] 响应式编辑页：图片上传和表单在移动端优化
- [x] 安全区域适配：处理 iPhone 刘海屏和底部安全区域
- [x] 触摸优化：按钮大小、间距适合手指操作，禁用双击缩放
- [x] viewport 配置：禁止缩放、viewport-fit=cover
- [x] 71 个单元测试全部通过

## v2.2 品牌Logo + 推送通知 + 手势操作
- [x] 品牌 Logo：生成二次元风格紫发猫耳少女 Logo，替换所有 PWA 图标和 favicon
- [x] 推送通知：通知数据库表 + 主动通知生成 + 铃铛组件 + 浏览器通知权限
- [x] 手势操作：左滑返回（带紫色指示器）+ 下拉刷新（带动画指示器）
- [x] 单元测试：76 个测试通过，1 个非确定性测试跳过

## v2.3 女友头像上传
- [x] 后端：图片上传 API（支持 JPG/PNG/GIF/WebP，限制 5MB，上传到 S3）
- [x] 前端 Setup：头像上传 UI（预览、格式/大小校验）
- [x] 前端 Home：女友卡片展示头像（替代绿色占位圆）
- [x] 前端 Chat：聊天页顶栏和消息气泡展示女友头像
- [x] 单元测试：头像上传 API 测试（85 个测试全部通过）

## v2.3.1 头像上传大小限制调整
- [x] 后端：uploadAvatar 大小限制从 5MB 调整为 10MB
- [x] 前端：Setup.tsx 大小限制从 5MB 调整为 10MB
- [x] 测试：更新 avatar.test.ts 中的大小校验测试（85 个测试全部通过）

## v2.4 OpenRouter 配置保存生效按钮
- [x] 确认 OpenRouter 配置流程：填 Key → 加载模型列表 → 选择模型
- [x] 添加"保存生效"按钮让用户确认选择已生效（85 个测试全部通过）

## v2.5 语音和 fal.ai 配置卡片独立保存生效按钮
- [x] 语音设置卡片：ElevenLabs/Fish Audio 选择声音后添加独立"保存生效"按钮
- [x] fal.ai 配置卡片：填写 Key 后添加独立"保存生效"按钮
- [x] 未保存变更时按钮高亮 + 黄色提示，保存后变为"配置已生效"灰色状态（85 个测试全部通过）
