import {
  estimateSpeechDurationMs,
  simulatedMouthValue,
} from "@shared/live2d";
import { useCallback, useEffect, useRef } from "react";

type MouthTarget = { setMouth: (value: number) => void } | null;

/**
 * Drive ParamMouthOpenY from real audio (RMS) or a sine envelope for
 * browser speechSynthesis, which has no audio stream.
 */
export function useLipSync() {
  const targetRef = useRef<MouthTarget>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef(0);
  const ctxRef = useRef<AudioContext | null>(null);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    targetRef.current?.setMouth(0);
  }, []);

  useEffect(() => () => stop(), [stop]);

  const attach = useCallback((target: MouthTarget) => {
    targetRef.current = target;
  }, []);

  const runSimulated = useCallback((durationMs: number) => {
    cancelAnimationFrame(rafRef.current);
    const started = performance.now();
    const tick = () => {
      const elapsed = performance.now() - started;
      targetRef.current?.setMouth(simulatedMouthValue(elapsed, durationMs));
      if (elapsed < durationMs) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        targetRef.current?.setMouth(0);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const speakSimulated = useCallback(
    (text: string, speed: number) => {
      stop();
      runSimulated(estimateSpeechDurationMs(text, speed));
    },
    [runSimulated, stop]
  );

  /** Watch an Audio element that Chat/useTTS already plays — do not create a second player. */
  const watchAudio = useCallback(
    (audio: HTMLAudioElement) => {
      cancelAnimationFrame(rafRef.current);
      audioRef.current = audio;
      audio.crossOrigin = audio.crossOrigin || "anonymous";

      const fallback = () => {
        const durationMs = Number.isFinite(audio.duration) && audio.duration > 0
          ? (audio.duration * 1000) / (audio.playbackRate || 1)
          : 4000;
        runSimulated(durationMs);
      };

      const startAnalyser = () => {
        try {
          const ctx = ctxRef.current ?? new AudioContext();
          ctxRef.current = ctx;
          void ctx.resume();
          const source = ctx.createMediaElementSource(audio);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyser.connect(ctx.destination);
          const bins = new Uint8Array(analyser.frequencyBinCount);
          const tick = () => {
            analyser.getByteFrequencyData(bins);
            let sum = 0;
            const n = Math.min(24, bins.length);
            for (let i = 0; i < n; i++) sum += bins[i] * bins[i];
            const rms = Math.sqrt(sum / n) / 255;
            targetRef.current?.setMouth(Math.min(1, rms * 2.4));
            if (!audio.paused && !audio.ended) {
              rafRef.current = requestAnimationFrame(tick);
            } else {
              targetRef.current?.setMouth(0);
            }
          };
          rafRef.current = requestAnimationFrame(tick);
        } catch {
          fallback();
        }
      };

      audio.addEventListener("play", startAnalyser, { once: true });
      audio.addEventListener("ended", () => targetRef.current?.setMouth(0));
    },
    [runSimulated]
  );

  return { attach, watchAudio, speakSimulated, stop };
}
