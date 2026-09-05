import { expect, it } from "vitest";
import { currentReplyStyle } from "./replyStyle";
it("prioritizes a single sentence over generic brief style", () => {
  expect(currentReplyStyle("请用一句话简短鼓励我")).toContain("只写一个完整");
  expect(currentReplyStyle("请简短回答")).toContain("不超过两句");
  expect(currentReplyStyle("你好")).toBe("");
});
