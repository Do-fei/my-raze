# Raze Live2D 建模委托清单（nizima）

功能已用官方示例 Hiyori 打通。正式看板娘按本清单出 **Cubism 4/5 嵌入包**，替换 `client/public/live2d/official/` 即可，不必改舞台逻辑。

参考价（仅绑定、不含原画，nizima 常见区间）：**5 万–20 万日元**。含 12 套表情/动作分层会靠上沿。合同必须写：**可嵌入自有网页 App、商用、交付 moc3、人设版权或永久使用权**。不要买「仅 nizima LIVE」成品。

## 人设（不要改）

紫长发、紫瞳（可带星光）、粉猫耳连帽卫衣、帽上小爱心、娇小少女，**不要 OL**。参考图：

| 文件 | 用途 |
|---|---|
| `docs/live2d/listen.jpg` | 倾听 |
| `docs/live2d/interact.jpg` | 比心 |
| `docs/live2d/spoiled.jpg` | 撒娇 |
| `docs/live2d/angry.jpg` | 生气 / 抱胸 |
| `docs/live2d/cry.jpg` | 哭鼻子 |

官网 `raze-mascot.jpg` 可作主视觉。这些图是**成图参考**，不能当工程 PSD。必须另画一张**正面中性站姿**（双手不挡身体），被挡住的胸口、后脑、口腔要补画。

## 12 套材料库

画师按套交付分层 PSD 或等价拆件，再绑进同一模型。

| # | 材料 | 舞台对应 | 说明 |
|---|---|---|---|
| 01 | 中性待机 | `Idle` / `neutral` | 主工程。半身至大腿，正面 A 姿 |
| 02 | 倾听 | `listening` + `Listen` | 侧耳或托脸，见 listen.jpg |
| 03 | 思考 | `thinking` | 目光微飘、嘴放松 |
| 04 | 说话 / 开心 | `speaking` / `happy` | 口型可动，笑眼 |
| 05 | 害羞 | `shy` + `Shy` | 袖子捂脸、歪头，见 spoiled.jpg |
| 06 | 比心 / 撒娇 | `flirty` + `Heart` | 双手比心，见 interact.jpg |
| 07 | 生气 / 叉腰 | `angry` + `Akimbo` | 叉腰或抱胸，见 angry.jpg |
| 08 | 哭鼻子 | `sad` + `Cry` | 眼泪、擦眼，见 cry.jpg |
| 09 | 跳脚 | `tantrum` + `Jump` | 跺脚或小跳 |
| 10 | 眨眼拆件 | `ParamEyeLOpen` / `R` | 眼白、瞳、高光、上下眼皮分开 |
| 11 | 口型拆件 | `ParamMouthOpenY` | 闭嘴 / 半开 / 张开 + 牙舌 |
| 12 | 点击身体 | `TapBody` | 点身体时的短互动 |

## 必须交付的运行时文件

```
Raze.model3.json
Raze.moc3
textures/*.png          （建议 2048，可多张）
Raze.physics3.json
expressions/*.exp3.json
motions/*.motion3.json
```

表情 ID：`neutral` `listening` `happy` `shy` `flirty` `angry` `sad` `tantrum`  
动作组：`Idle` `TapBody` `Listen` `Heart` `Akimbo` `Jump` `Shy` `Cry`  
参数：`ParamMouthOpenY`、眨眼、`ParamEyeBallX/Y`、`ParamAngleX/Y/Z`、`ParamBodyAngleX/Y/Z`、头发物理  
点击区：`Head` `Face` `Body`

Cubism Editor **5 正式版**导出。不要加密。不要只给预览视频。

## 接入（我方）

1. 文件放入 `client/public/live2d/official/`
2. 改 `shared/live2d.ts` 的 `OFFICIAL_LIVE2D_MODEL`
3. 按钮改播对应 motion / exp，去掉 Hiyori 参数拧脸
4. 口型仍走 `ParamMouthOpenY`

## 授权提醒

My Raze 只内置官方角色，**禁止用户导入模型**（Cubism 免费出版许可：不可做 Expandable Application）。
