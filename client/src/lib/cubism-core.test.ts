// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { ensureCubismCore } from "./cubism-core";
import { CUBISM_CORE_CDN, CUBISM_CORE_LOCAL } from "@shared/live2d";

const script = () => document.querySelector<HTMLScriptElement>("script[data-cubism-core]")!;
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
afterEach(() => {
  document.head.innerHTML = "";
  delete window.Live2DCubismCore;
  vi.useRealTimers();
});

it("shares an in-flight request and falls back to CDN", async () => {
  const first = ensureCubismCore();
  const second = ensureCubismCore();
  expect(document.querySelectorAll("script")).toHaveLength(1);
  expect(script().getAttribute("src")).toBe(CUBISM_CORE_LOCAL);
  script().dispatchEvent(new Event("error"));
  await flush();
  expect(script().src).toBe(CUBISM_CORE_CDN);
  expect(document.querySelectorAll("script")).toHaveLength(1);
  window.Live2DCubismCore = {};
  script().dispatchEvent(new Event("load"));
  await Promise.all([first, second]);
});

it("retries after both sources fail instead of waiting on an old script", async () => {
  const first = ensureCubismCore();
  const failed = expect(first).rejects.toThrow("Failed to load");
  script().dispatchEvent(new Event("error"));
  await flush();
  script().dispatchEvent(new Event("error"));
  await failed;
  expect(script()).toBeNull();
  const retry = ensureCubismCore();
  expect(script().getAttribute("src")).toBe(CUBISM_CORE_LOCAL);
  window.Live2DCubismCore = {};
  script().dispatchEvent(new Event("load"));
  await retry;
});

it("falls back if a script loads without defining Core", async () => {
  const pending = ensureCubismCore();
  script().dispatchEvent(new Event("load"));
  await flush();
  expect(script().src).toBe(CUBISM_CORE_CDN);
  window.Live2DCubismCore = {};
  script().dispatchEvent(new Event("load"));
  await pending;
});

it("bounds stalled requests so the stage can reach portrait fallback", async () => {
  vi.useFakeTimers();
  const pending = ensureCubismCore();
  const failed = expect(pending).rejects.toThrow("Timed out");
  await vi.advanceTimersByTimeAsync(30_000);
  await failed;
  expect(script()).toBeNull();
});
