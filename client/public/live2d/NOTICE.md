# Live2D 素材说明

## 运行时（Cubism Core）

`runtime/live2dcubismcore.min.js` **不入库**。开发与部署时请运行：

```bash
bash scripts/fetch-cubism-core.sh
```

或让浏览器从官方 CDN 加载：
https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js

使用须同意 [Live2D Proprietary Software License](https://www.live2d.com/eula/live2d-proprietary-software-license-agreement_en.html)。

开发阶段免费。个人 / 年营收低于 1000 万日元的小规模主体正式发布可免出版许可费。
**禁止做成「用户可导入自己的 Live2D 模型」的可扩展应用**，否则免费豁免失效。My Raze 只内置官方角色模型。

## 示例模型（Hiyori）

`official/` 目录是 Live2D 官方 CubismWebSamples 中的 Hiyori 示例，用作开发占位。
正式看板娘模型到位后，只替换该目录并改 `shared/live2d.ts` 里的 `OFFICIAL_LIVE2D_MODEL` 路径即可。

请遵守 Live2D 示例数据使用条款：https://www.live2d.com/en/terms/live2d-sample-data-terms-of-use/
