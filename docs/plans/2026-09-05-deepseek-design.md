# DeepSeek 官方直连

用户已授权新增 DeepSeek 官方接入。设置页选择 OpenRouter 或 DeepSeek，分别加密保存 Key；DeepSeek 默认 Flash 非思考模式。聊天与记忆提取使用同一服务商，避免把 Key 发往错误服务。

兼容旧配置：复用已有 llmApiUrl 存储固定官方地址，API 仅接受服务商枚举并映射固定地址，不开放任意 URL；旧空值默认 OpenRouter。无数据库迁移。llmModel 属于当前所选服务商，切换时选默认模型。

DeepSeek Key 保存前调用官方 GET /user/balance，只验证认证，不回传账户数据、不生成内容。支持显式验证已保存 Key。DeepSeek 官方直连按 BYOK 使用；商业计费启用时须使用个人 Key，避免套用 OpenRouter 免费模型限制。自托管可使用 OPERATOR_DEEPSEEK_KEY。

测试覆盖服务商路由、认证失败、Key 隔离、记忆调用地址及旧配置兼容。真实 DeepSeek 生成验收需用户保存有效 Key 后进行。
