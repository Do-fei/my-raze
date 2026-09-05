// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { useLipSync } from "./useLipSync";
import { useStageCollapsed } from "./useStageCollapsed";

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
const roots: ReturnType<typeof createRoot>[] = [];
function mountHook<T>(hook: () => T) {
  let value: T;
  function Probe() { value = hook(); return null; }
  const root = createRoot(document.createElement("div"));
  roots.push(root);
  act(() => root.render(<Probe />));
  return { get current() { return value!; }, unmount: () => act(() => root.unmount()) };
}
afterEach(() => {
  roots.splice(0).forEach(root => act(() => root.unmount()));
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("reopens a collapsed mobile stage when the desktop breakpoint is crossed", () => {
  const media = new EventTarget() as MediaQueryList;
  Object.defineProperty(media, "matches", { value: false, writable: true });
  vi.stubGlobal("matchMedia", vi.fn(() => media));
  const hook = mountHook(useStageCollapsed);
  act(() => hook.current[1](true));
  expect(hook.current[0]).toBe(true);
  act(() => {
    Object.defineProperty(media, "matches", { value: true });
    media.dispatchEvent(new Event("change"));
  });
  expect(hook.current[0]).toBe(false);
});

it("keeps simulated speech moving after 20 seconds and closes on stop", () => {
  let now = 0;
  let nextId = 0;
  const callbacks = new Map<number, FrameRequestCallback>();
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    callbacks.set(++nextId, cb); return nextId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => callbacks.delete(id));
  const mouth = vi.fn();
  const hook = mountHook(useLipSync);
  hook.current.attach({ setMouth: mouth });
  hook.current.speakSimulated("长".repeat(300), 1);
  now = 25_000;
  const [id, cb] = Array.from(callbacks.entries())[0];
  callbacks.delete(id);
  cb(now);
  expect(mouth.mock.lastCall![0]).toBeGreaterThan(0);
  expect(callbacks.size).toBe(1);
  hook.current.stop();
  expect(mouth).toHaveBeenLastCalledWith(0);
  expect(callbacks.size).toBe(0);
  hook.current.speakSimulated("再说一句", 1);
  hook.unmount();
  expect(callbacks.size).toBe(0);
  expect(mouth).toHaveBeenLastCalledWith(0);
});
