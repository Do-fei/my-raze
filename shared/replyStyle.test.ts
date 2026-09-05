import { expect, it } from "vitest";
import { currentReplyStyle, normalizeReplyStyle } from "./replyStyle";
it("prioritizes a single sentence over generic brief style", () => {
  expect(currentReplyStyle("请用一句话简短鼓励我")).toContain("只写一个完整");
  expect(currentReplyStyle("请简短回答")).toContain("不超过两句");
  expect(currentReplyStyle("你好")).toBe("");
});

it("joins the real multi-sentence failure without dropping words", () => {
  expect(normalizeReplyStyle("只用一句话鼓励我", "蓝莓计划完成！你甜过书页，甜过今天。继续加油吧！"))
    .toBe("蓝莓计划完成，你甜过书页，甜过今天，继续加油吧！");
  expect(normalizeReplyStyle("一句话", "完成了！\n继续努力。" )).toBe("完成了，继续努力。");
});

it("preserves ordinary replies, quotations, code, lists and links", () => {
  for (const reply of ['她说“加油！”然后笑了。', '`x = 1`。完成！', '- 第一项。\n- 第二项。', '参考 https://example.com/?a=1。好的！']) {
    expect(normalizeReplyStyle("一句话", reply)).toBe(reply);
  }
  expect(normalizeReplyStyle("你好", "你好！再见。" )).toBe("你好！再见。");
});
