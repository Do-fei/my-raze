import {
  resolveAvatarPhase,
  resolveExpression,
  type AvatarPhase,
  type CompanionMood,
  type MessageEmotion,
} from "@shared/live2d";
import { useMemo } from "react";

type Input = {
  isRecording?: boolean;
  isTranscribing?: boolean;
  isThinking?: boolean;
  isSpeaking?: boolean;
  mood?: CompanionMood | null;
  messageEmotion?: MessageEmotion | null;
  userOverride?: MessageEmotion | null;
};

export function useAvatarController(input: Input): {
  phase: AvatarPhase;
  emotion: MessageEmotion;
} {
  const {
    isRecording,
    isTranscribing,
    isThinking,
    isSpeaking,
    mood,
    messageEmotion,
    userOverride,
  } = input;

  return useMemo(() => {
    const phase = resolveAvatarPhase({
      isRecording,
      isTranscribing,
      isThinking,
      isSpeaking,
    });
    return {
      phase,
      emotion: resolveExpression({
        phase,
        mood,
        messageEmotion,
        userOverride,
      }),
    };
  }, [
    isRecording,
    isTranscribing,
    isThinking,
    isSpeaking,
    mood,
    messageEmotion,
    userOverride,
  ]);
}
