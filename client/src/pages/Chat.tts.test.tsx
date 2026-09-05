// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { useTTS } from "./Chat";

vi.mock("@/lib/trpc", () => ({ trpc: {
  apiConfig: { get: { useQuery: () => ({ data: { preferences: { ttsProvider: "browser" } } }) } },
  tts: { generate: { useMutation: () => ({ mutate: vi.fn() }) } },
} }));
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
let root: ReturnType<typeof createRoot>;
afterEach(() => {
  act(() => root?.unmount());
  vi.unstubAllGlobals();
  localStorage.clear();
});

it("starts on actual speech, stops on end/error, and ignores stale cancelled utterances", () => {
  const utterances: SpeechSynthesisUtterance[] = [];
  vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(public text: string) {} });
  vi.stubGlobal("speechSynthesis", {
    cancel: vi.fn(), getVoices: () => [],
    speak: (u: SpeechSynthesisUtterance) => utterances.push(u),
  });
  const onBrowserSpeak = vi.fn();
  const onStop = vi.fn();
  let tts: ReturnType<typeof useTTS>;
  function Probe() { tts = useTTS({ onBrowserSpeak, onStop }); return null; }
  root = createRoot(document.createElement("div"));
  act(() => root.render(<Probe />));
  act(() => tts.speak("第一句"));
  expect(onBrowserSpeak).not.toHaveBeenCalled();
  const fire = (u: SpeechSynthesisUtterance, event: "onstart" | "onend" | "onerror") => {
    act(() => (u[event] as Function)?.({}));
  };
  fire(utterances[0], "onstart");
  expect(onBrowserSpeak).toHaveBeenLastCalledWith("第一句", 1);
  expect(tts!.isSpeaking).toBe(true);
  act(() => tts.speak("第二句"));
  fire(utterances[1], "onstart");
  onStop.mockClear();
  fire(utterances[0], "onerror");
  expect(onStop).not.toHaveBeenCalled();
  expect(tts!.isSpeaking).toBe(true);
  fire(utterances[1], "onend");
  expect(onStop).toHaveBeenCalledOnce();
  expect(tts!.isSpeaking).toBe(false);
  act(() => tts.speak("错误"));
  fire(utterances[2], "onstart");
  fire(utterances[2], "onerror");
  expect(tts!.isSpeaking).toBe(false);
  expect(onStop).toHaveBeenCalledTimes(3);
  act(() => tts.speak("手动停止"));
  fire(utterances[3], "onstart");
  act(() => tts.stop());
  expect(tts!.isSpeaking).toBe(false);
  onBrowserSpeak.mockClear();
  fire(utterances[3], "onstart");
  expect(onBrowserSpeak).not.toHaveBeenCalled();
});
