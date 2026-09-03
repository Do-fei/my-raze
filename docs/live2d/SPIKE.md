# M5.1 Spike：渲染库与 Cubism 5

结论：采用 **PixiJS 8 + `untitled-pixi-live2d-engine`（pixi-live2d-display 系 Cubism 5 fork）**。

| 候选项 | 结果 |
|---|---|
| 原版 `pixi-live2d-display` | 停在 Pixi 6 / Cubism 4，不适配本仓库的 Pixi 8 |
| `untitled-pixi-live2d-engine` | 支持 Cubism 5、`model.speak`、`tap` / `focus`、hit 事件 |
| 自写 Cubism Web SDK 封装 | 工作量过大，M5 不采用 |

示例模型使用 Live2D 官方 **Hiyori**（`client/public/live2d/official/`）。Cubism Core 不入库，构建时 `wget` 或运行时走官方 CDN。Hiyori 无 `.exp3`，表情用参数预设；正式模型替换后接表情文件即可。
