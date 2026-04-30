import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import {
  Loader2,
  Send,
  ArrowLeft,
  Image as ImageIcon,
  Settings,
  Heart,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Camera,
  Mic,
  Keyboard,
} from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { VoiceRecordButton } from "@/components/VoiceRecordButton";
import { LevelUpAnimation } from "@/components/LevelUpAnimation";
import { IntimacyPanel } from "@/components/IntimacyPanel";
import { getLevelInfo, getLevelProgress, getLevelGradient } from "../../../shared/intimacy";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

// TTS 语音播放 Hook - 支持浏览器内置和 API 两种模式，支持播放速度控制
const SPEED_OPTIONS = [
  { value: 0.5, label: "0.5x" },
  { value: 0.75, label: "0.75x" },
  { value: 1, label: "1x" },
  { value: 1.25, label: "1.25x" },
  { value: 1.5, label: "1.5x" },
  { value: 2, label: "2x" },
];

function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoPlay, setAutoPlay] = useState(() => {
    return localStorage.getItem("tts-autoplay") === "true";
  });
  const [playbackSpeed, setPlaybackSpeed] = useState(() => {
    const saved = localStorage.getItem("tts-speed");
    return saved ? parseFloat(saved) : 1;
  });
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 获取用户的 TTS 配置
  const { data: apiConfig } = trpc.apiConfig.get.useQuery();
  const ttsGenerate = trpc.tts.generate.useMutation();

  // Phase 1b-i: apiConfig.get now returns { preferences, keys }.
  const ttsProvider = apiConfig?.preferences?.ttsProvider || "browser";

  // 更新播放速度
  const updateSpeed = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    localStorage.setItem("tts-speed", String(speed));
    // 如果当前正在播放，实时更新速度
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
    if (utteranceRef.current && "speechSynthesis" in window) {
      // 浏览器语音不支持实时更新 rate，下次播放生效
    }
  }, []);

  // 浏览器内置语音
  const speakBrowser = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) {
      toast.error("当前浏览器不支持语音功能");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = playbackSpeed * 0.95; // 基础速度 0.95 * 用户选择的倍速
    utterance.pitch = 1.2;
    utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const zhFemaleVoice = voices.find(
      (v) =>
        v.lang.startsWith("zh") &&
        (v.name.toLowerCase().includes("female") ||
          v.name.includes("Xiaoxiao") ||
          v.name.includes("Xiaoyi") ||
          v.name.includes("女"))
    );
    const zhVoice = zhFemaleVoice || voices.find((v) => v.lang.startsWith("zh"));
    if (zhVoice) utterance.voice = zhVoice;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [playbackSpeed]);

  // API 语音（ElevenLabs / Fish Audio）
  const speakApi = useCallback(
    (text: string) => {
      setIsSpeaking(true);
      ttsGenerate.mutate(
        { text },
        {
          onSuccess: (data) => {
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current = null;
            }
            const audio = new Audio(data.audioUrl);
            audio.playbackRate = playbackSpeed;
            audioRef.current = audio;
            audio.onended = () => setIsSpeaking(false);
            audio.onerror = () => {
              setIsSpeaking(false);
              toast.error("语音播放失败");
            };
            audio.play().catch(() => {
              setIsSpeaking(false);
            });
          },
          onError: (error) => {
            setIsSpeaking(false);
            toast.error(`语音生成失败：${error.message}`);
          },
        }
      );
    },
    [ttsGenerate, playbackSpeed]
  );

  const speak = useCallback(
    (text: string) => {
      if (ttsProvider === "browser") {
        speakBrowser(text);
      } else {
        speakApi(text);
      }
    },
    [ttsProvider, speakBrowser, speakApi]
  );

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const toggleAutoPlay = useCallback(() => {
    setAutoPlay((prev) => {
      const next = !prev;
      localStorage.setItem("tts-autoplay", String(next));
      return next;
    });
  }, []);

  return { speak, stop, isSpeaking, autoPlay, toggleAutoPlay, ttsProvider, playbackSpeed, updateSpeed };
}

export default function Chat() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const conversationId = params.id ? parseInt(params.id) : null;
  const { theme, toggleTheme } = useTheme();
  const { speak, stop, isSpeaking, autoPlay, toggleAutoPlay, ttsProvider, playbackSpeed, updateSpeed } = useTTS();
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const [message, setMessage] = useState("");
  const [inputMode, setInputMode] = useState<"text" | "voice">(() => {
    return (localStorage.getItem("chat-input-mode") as "text" | "voice") || "text";
  });
  const [showIntimacyPanel, setShowIntimacyPanel] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpLevel, setLevelUpLevel] = useState(1);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(
    conversationId
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 语音录制
  const {
    isRecording, isTranscribing, setIsTranscribing,
    duration, isSupported: voiceSupported,
    startRecording, stopRecording, cancelRecording, setOnMaxDuration,
  } = useVoiceRecorder();
  const transcribeMutation = trpc.voice.transcribe.useMutation();
  const recordingDurationRef = useRef(0);

  // 同步录音时长到 ref
  useEffect(() => {
    recordingDurationRef.current = duration;
  }, [duration]);

  const { data: girlfriend } = trpc.girlfriend.getActive.useQuery();

  // 心情系统
  const girlfriendId = girlfriend?.id;
  const stableGirlfriendId = useMemo(() => girlfriendId, [girlfriendId]);
  const { data: moodData, refetch: refetchMood } = trpc.mood.get.useQuery(
    { girlfriendId: stableGirlfriendId! },
    { enabled: !!stableGirlfriendId }
  );
  const updateMood = trpc.mood.update.useMutation({
    onSuccess: () => refetchMood(),
  });
  const { data: chatMessages, refetch: refetchMessages } = trpc.conversation.getMessages.useQuery(
    { conversationId: currentConversationId! },
    { enabled: !!currentConversationId }
  );

  const createConversation = trpc.conversation.create.useMutation({
    onSuccess: (data) => {
      setCurrentConversationId(data.id);
      setLocation(`/chat/${data.id}`);
    },
  });

  // 亲密度经验值 mutation
  const addPoints = trpc.girlfriend.addPoints.useMutation({
    onSuccess: (data) => {
      if (data.leveledUp && data.intimacyLevel) {
        setLevelUpLevel(data.intimacyLevel);
        setShowLevelUp(true);
      }
    },
  });

  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: async (data) => {
      await refetchMessages();

      // 更新心情 - 用户消息
      if (girlfriend) {
        updateMood.mutate({
          girlfriendId: girlfriend.id,
          messageContent: message,
          isUserMessage: true,
        });
        // 更新心情 - AI 回复
        if (data.assistantMessage?.content) {
          updateMood.mutate({
            girlfriendId: girlfriend.id,
            messageContent: data.assistantMessage.content,
            isUserMessage: false,
          });
        }

        // 触发亲密度经验值增加
        addPoints.mutate({
          girlfriendId: girlfriend.id,
          reason: "text_message",
          messageLength: message.trim().length,
        });
      }

      // 如果开启了自动语音播放，朗读 AI 回复
      if (autoPlay && data.assistantMessage?.content) {
        const content = data.assistantMessage.content;
        if (content !== "[自拍照片]") {
          speak(content);
        }
      }

      // 如果需要生成自拍
      if (data.shouldGenerateSelfie) {
        toast.info("正在生成自拍照片...");
        generateSelfie.mutate({
          conversationId: currentConversationId!,
          userContext: message,
        });
      }

      setMessage("");
      scrollToBottom();
    },
    onError: (error) => {
      toast.error(`发送失败：${error.message}`);
    },
  });

  const generateSelfie = trpc.selfie.generate.useMutation({
    onSuccess: async () => {
      await refetchMessages();
      toast.success("自拍照片生成成功！");
      scrollToBottom();
      // 触发自拍亲密度经验值
      if (girlfriend) {
        addPoints.mutate({
          girlfriendId: girlfriend.id,
          reason: "selfie",
        });
      }
    },
    onError: (error) => {
      toast.error(`生成自拍失败：${error.message}`);
    },
  });

  useEffect(() => {
    if (!currentConversationId && girlfriend) {
      createConversation.mutate({
        girlfriendId: girlfriend.id,
        title: `与 ${girlfriend.name} 的对话`,
      });
    }
  }, [currentConversationId, girlfriend]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // 预加载浏览器语音列表
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentConversationId) return;

    sendMessage.mutate({
      conversationId: currentConversationId,
      content: message.trim(),
    });
  };

  const handleSpeakMessage = (text: string) => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text);
    }
  };

  const handleManualSelfie = () => {
    if (!currentConversationId) return;
    toast.info("正在生成自拍照片...");
    generateSelfie.mutate({
      conversationId: currentConversationId,
      userContext: message.trim() || "a casual selfie, looking cute and happy",
    });
  };

  // 语音/文字模式切换
  const switchInputMode = useCallback((mode: "text" | "voice") => {
    setInputMode(mode);
    localStorage.setItem("chat-input-mode", mode);
  }, []);

  // 处理录音完成
  const handleRecordingComplete = useCallback(async () => {
    const currentDuration = recordingDurationRef.current;
    const result = await stopRecording();
    if (!result || !currentConversationId) return;

    // 最短录音时长检查
    if (currentDuration < 1) {
      toast.info("录音时间太短，请重试");
      return;
    }

    setIsTranscribing(true);

    // Blob → Base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      if (!base64) {
        setIsTranscribing(false);
        toast.error("音频数据读取失败");
        return;
      }

      transcribeMutation.mutate(
        { audioBase64: base64, mimeType: result.mimeType },
        {
          onSuccess: (data) => {
            setIsTranscribing(false);
            if (data.text) {
              // 自动发送转写文字
              sendMessage.mutate({
                conversationId: currentConversationId!,
                content: data.text,
              });
              toast.success(`语音识别成功（${data.duration?.toFixed(1) || 0}秒）`);
              // 触发语音消息亲密度经验值
              if (girlfriend) {
                addPoints.mutate({
                  girlfriendId: girlfriend.id,
                  reason: "voice_message",
                  voiceDuration: recordingDurationRef.current,
                });
              }
            } else {
              toast.error("未识别到有效语音内容，请重试");
            }
          },
          onError: (error) => {
            setIsTranscribing(false);
            toast.error(`语音识别失败：${error.message}`);
          },
        }
      );
    };
    reader.onerror = () => {
      setIsTranscribing(false);
      toast.error("音频数据读取失败");
    };
    reader.readAsDataURL(result.blob);
  }, [stopRecording, currentConversationId, setIsTranscribing, transcribeMutation, sendMessage]);

  // 注册最大时长回调
  useEffect(() => {
    setOnMaxDuration(() => handleRecordingComplete);
  }, [setOnMaxDuration, handleRecordingComplete]);

  if (!girlfriend) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <Heart className="w-16 h-16 text-primary mb-4" />
        <h2 className="text-2xl font-bold mb-2">还没有女友配置</h2>
        <p className="text-muted-foreground mb-4">请先创建你的专属女友</p>
        <Button onClick={() => setLocation("/setup")}>去设置</Button>
      </div>
    );
  }

  // 语音引擎标签
  const ttsLabel = ttsProvider === "elevenlabs" ? "ElevenLabs" : ttsProvider === "fishaudio" ? "Fish" : "";

  // 心情配置
  const MOOD_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
    excited: { emoji: "🥰", label: "超开心", color: "text-pink-500" },
    happy: { emoji: "😊", label: "开心", color: "text-green-500" },
    content: { emoji: "🙂", label: "满足", color: "text-blue-500" },
    neutral: { emoji: "😐", label: "平静", color: "text-yellow-500" },
    lonely: { emoji: "😢", label: "想你了", color: "text-purple-500" },
    sad: { emoji: "😭", label: "伤心", color: "text-red-500" },
  };
  const currentMoodInfo = moodData ? MOOD_CONFIG[moodData.mood] : null;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 顶部导航栏 */}
      <header className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 border-b bg-card" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
          <AvatarImage src={girlfriend.avatarUrl || girlfriend.referenceImageUrl} alt={girlfriend.name} />
          <AvatarFallback>{girlfriend.name[0]}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 sm:gap-2">
            <h1 className="font-semibold text-sm sm:text-base truncate">{girlfriend.name}</h1>
            {currentMoodInfo && (
              <span className="text-sm" title={`${currentMoodInfo.label} (${moodData!.moodScore}分)`}>
                {currentMoodInfo.emoji}
              </span>
            )}
            {/* 亲密度徽章 */}
            {(() => {
              const level = girlfriend.intimacyLevel || 1;
              const info = getLevelInfo(level);
              return (
                <button
                  className={`text-xs flex items-center gap-0.5 ${info.color} hover:opacity-80 transition-opacity`}
                  onClick={() => setShowIntimacyPanel(true)}
                  title={`亲密度: ${info.name} Lv.${level}`}
                >
                  <span>{info.emoji}</span>
                  <span className="font-medium">Lv.{level}</span>
                </button>
              );
            })()}
          </div>
          <p className="text-xs text-muted-foreground">
            {currentMoodInfo ? (
              <span className={currentMoodInfo.color}>{currentMoodInfo.label}</span>
            ) : (
              "在线"
            )}
            {ttsLabel ? ` · 语音: ${ttsLabel}` : ""}
          </p>
        </div>

        {/* 语音自动播放开关 */}
        <Button
          variant={autoPlay ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8 sm:h-10 sm:w-10"
          onClick={toggleAutoPlay}
          title={autoPlay ? "关闭自动语音" : "开启自动语音"}
        >
          {autoPlay ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />}
        </Button>

        {/* 播放速度控制 */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs font-mono px-1.5 sm:px-2 h-8"
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            title="语音播放速度"
          >
            {playbackSpeed}x
          </Button>
          {showSpeedMenu && (
            <div className="absolute right-0 top-full mt-1 bg-popover text-popover-foreground border rounded-lg shadow-lg z-50 py-1 min-w-[80px]">
              {SPEED_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors ${
                    playbackSpeed === opt.value ? "text-primary font-semibold bg-primary/5" : ""
                  }`}
                  onClick={() => {
                    updateSpeed(opt.value);
                    setShowSpeedMenu(false);
                    toast.success(`播放速度已设为 ${opt.label}`);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={toggleTheme}>
          {theme === "light" ? <Moon className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5" />}
        </Button>

        <Button variant="ghost" size="icon" className="hidden sm:inline-flex" onClick={() => setLocation("/gallery")}>
          <ImageIcon className="w-5 h-5" />
        </Button>

        <Button variant="ghost" size="icon" className="hidden sm:inline-flex" onClick={() => setLocation("/settings")}>
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        {!chatMessages || chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Heart className="w-12 h-12 text-primary mb-4" />
            <p className="text-muted-foreground">开始和 {girlfriend.name} 聊天吧~</p>
            <p className="text-xs text-muted-foreground mt-2">
              试试说"发张自拍"或"你在干嘛"来获取照片
            </p>
          </div>
        ) : (
          chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {msg.role === "assistant" && (
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={girlfriend.avatarUrl || girlfriend.referenceImageUrl} alt={girlfriend.name} />
                  <AvatarFallback>{girlfriend.name[0]}</AvatarFallback>
                </Avatar>
              )}

              <div className="flex flex-col gap-1 max-w-[80%] sm:max-w-[75%]">
                <div
                  className={`rounded-2xl px-4 py-2 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {msg.imageUrl ? (
                    <div className="space-y-2">
                      <img
                        src={msg.imageUrl}
                        alt="Selfie"
                        className="rounded-lg max-w-full h-auto cursor-pointer"
                        onClick={() => window.open(msg.imageUrl!, "_blank")}
                      />
                      {msg.content && msg.content !== "[自拍照片]" && (
                        <p className="text-sm">{msg.content}</p>
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                </div>

                {/* AI 消息的语音播放按钮 */}
                {msg.role === "assistant" && msg.content && msg.content !== "[自拍照片]" && (
                  <button
                    onClick={() => handleSpeakMessage(msg.content)}
                    className="self-start ml-1 text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                    title={`播放语音${ttsLabel ? ` (${ttsLabel})` : ""}`}
                  >
                    {isSpeaking ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>

              {msg.role === "user" && (
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback>{user?.name?.[0] || "U"}</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))
        )}

        {sendMessage.isPending && (
          <div className="flex gap-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={girlfriend.avatarUrl || girlfriend.referenceImageUrl} alt={girlfriend.name} />
              <AvatarFallback>{girlfriend.name[0]}</AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-2xl px-4 py-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            </div>
          </div>
        )}

        {generateSelfie.isPending && (
          <div className="flex gap-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={girlfriend.avatarUrl || girlfriend.referenceImageUrl} alt={girlfriend.name} />
              <AvatarFallback>{girlfriend.name[0]}</AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                正在拍照...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <form onSubmit={handleSendMessage} className="flex items-center gap-2 p-2 sm:p-4 border-t bg-card" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        {/* 拍照按钮 */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleManualSelfie}
          disabled={sendMessage.isPending || generateSelfie.isPending || isRecording || isTranscribing}
          title="让她拍一张自拍"
          className="shrink-0 text-primary hover:text-primary hover:bg-primary/10"
        >
          {generateSelfie.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Camera className="w-5 h-5" />
          )}
        </Button>

        {inputMode === "text" ? (
          <>
            {/* 文字输入模式 */}
            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`和 ${girlfriend.name} 说点什么...`}
              disabled={sendMessage.isPending || generateSelfie.isPending}
              className="flex-1"
            />
            {/* 语音切换按钮（输入框为空且浏览器支持时显示） */}
            {voiceSupported && !message.trim() ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => switchInputMode("voice")}
                disabled={sendMessage.isPending || generateSelfie.isPending}
                title="切换到语音输入"
                className="shrink-0 text-muted-foreground hover:text-primary"
              >
                <Mic className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!message.trim() || sendMessage.isPending || generateSelfie.isPending}
                className="shrink-0"
              >
                {sendMessage.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            )}
          </>
        ) : (
          <>
            {/* 语音输入模式 */}
            <VoiceRecordButton
              isRecording={isRecording}
              isTranscribing={isTranscribing}
              duration={duration}
              onStart={startRecording}
              onEnd={handleRecordingComplete}
              onCancel={cancelRecording}
              disabled={sendMessage.isPending || generateSelfie.isPending}
            />
            {/* 键盘切换按钮 */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => switchInputMode("text")}
              disabled={isRecording || isTranscribing}
              title="切换到文字输入"
              className="shrink-0 text-muted-foreground hover:text-primary"
            >
              <Keyboard className="w-5 h-5" />
            </Button>
          </>
        )}
      </form>

      {/* 亲密度详情面板 */}
      <IntimacyPanel
        open={showIntimacyPanel}
        onOpenChange={setShowIntimacyPanel}
        intimacyLevel={girlfriend.intimacyLevel || 1}
        intimacyPoints={girlfriend.intimacyPoints || 0}
        consecutiveDays={girlfriend.consecutiveDays || 0}
        girlfriendName={girlfriend.name}
      />

      {/* 升级动画 */}
      <LevelUpAnimation
        show={showLevelUp}
        newLevel={levelUpLevel}
        onClose={() => setShowLevelUp(false)}
      />
    </div>
  );
}
