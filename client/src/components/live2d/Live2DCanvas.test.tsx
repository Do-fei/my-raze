// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { Live2DCanvas, type Live2DHandle } from "./Live2DCanvas";
const state = vi.hoisted(() => ({ listeners: new Map<string, () => void>(), params: new Map<string, number>(), y: 0, stops: vi.fn() }));
vi.mock("@/lib/cubism-core", () => ({ ensureCubismCore: async () => {} }));
vi.mock("pixi.js", () => ({ extensions: { add: vi.fn() }, Application: class {
  canvas = document.createElement("canvas"); screen = { width: 300, height: 600 }; stage = { addChild: vi.fn() };
  init = async () => {}; destroy = vi.fn();
} }));
vi.mock("untitled-pixi-live2d-engine/cubism", () => ({ Live2DPlugin: {}, Live2DModel: { from: async () => ({
  anchor: { set: vi.fn() }, scale: { set: vi.fn() }, position: { x: 150, set: (_x: number, y: number) => { state.y = y; } },
  internalModel: { originalWidth: 1000, originalHeight: 2000,
    coreModel: { setParameterValueById: (id: string, value: number) => state.params.set(id, value), setPartOpacityById: vi.fn() },
    on: (event: string, fn: () => void) => state.listeners.set(event, fn),
    off: (event: string) => state.listeners.delete(event),
    motionManager: { stopAllMotions: state.stops },
  }, on: vi.fn(), motion: async () => true, destroy: vi.fn(), focus: vi.fn(), tap: vi.fn(),
}) } }));
it("applies expression and mouth after engine animation, retriggers same-emotion replies and cleans up", async () => {
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("React", React);
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const root = createRoot(document.createElement("div"));
  let handle: Live2DHandle;
  const ready = (value: Live2DHandle) => { handle = value; };
  await act(async () => root.render(<Live2DCanvas emotion="happy" phase="speaking" onReady={ready} />));
  expect(state.listeners.has("beforeModelUpdate")).toBe(true);
  handle!.setMouth(0.8);
  state.params.set("ParamMouthOpenY", 0); // Simulate engine motion overwriting the prior frame.
  state.listeners.get("beforeModelUpdate")!();
  expect(state.params.get("ParamMouthOpenY")).toBe(0.8);
  expect(state.params.get("ParamMouthForm")).toBe(0.7);
  await act(async () => root.render(<Live2DCanvas emotion="happy" phase="idle" replySequence={1} onReady={ready} />));
  const firstStops = state.stops.mock.calls.length;
  await act(async () => root.render(<Live2DCanvas emotion="happy" phase="idle" replySequence={2} onReady={ready} />));
  expect(state.stops.mock.calls.length).toBeGreaterThan(firstStops);
  await act(async () => root.unmount());
  expect(state.listeners.size).toBe(0);
  vi.unstubAllGlobals();
});
