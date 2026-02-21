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
