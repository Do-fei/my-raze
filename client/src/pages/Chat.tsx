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
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

// TTS 语音播放 Hook
function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoPlay, setAutoPlay] = useState(() => {
    return localStorage.getItem("tts-autoplay") === "true";
  });
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) {
      toast.error("当前浏览器不支持语音功能");
      return;
    }

    // 停止当前播放
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 0.95;
    utterance.pitch = 1.2; // 稍微高一点的音调，更甜美
    utterance.volume = 1;

    // 尝试选择女性声音
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
    if (zhVoice) {
      utterance.voice = zhVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const toggleAutoPlay = useCallback(() => {
    setAutoPlay((prev) => {
      const next = !prev;
      localStorage.setItem("tts-autoplay", String(next));
      return next;
    });
  }, []);

  return { speak, stop, isSpeaking, autoPlay, toggleAutoPlay };
}

export default function Chat() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const conversationId = params.id ? parseInt(params.id) : null;
  const { theme, toggleTheme } = useTheme();
  const { speak, stop, isSpeaking, autoPlay, toggleAutoPlay } = useTTS();

  const [message, setMessage] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(
    conversationId
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: girlfriend } = trpc.girlfriend.getActive.useQuery();
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

  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: async (data) => {
      await refetchMessages();

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
    },
    onError: (error) => {
      toast.error(`生成自拍失败：${error.message}`);
    },
  });

  useEffect(() => {
    // 如果没有对话 ID，创建新对话
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

  // 预加载语音列表
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

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* 顶部导航栏 */}
      <header className="flex items-center gap-3 px-4 py-3 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <Avatar className="w-10 h-10">
          <AvatarImage src={girlfriend.referenceImageUrl} alt={girlfriend.name} />
          <AvatarFallback>{girlfriend.name[0]}</AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <h1 className="font-semibold">{girlfriend.name}</h1>
          <p className="text-xs text-muted-foreground">在线</p>
        </div>

        {/* 语音自动播放开关 */}
        <Button
          variant={autoPlay ? "default" : "ghost"}
          size="icon"
          onClick={toggleAutoPlay}
          title={autoPlay ? "关闭自动语音" : "开启自动语音"}
        >
          {autoPlay ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </Button>

        <Button variant="ghost" size="icon" onClick={() => setLocation("/gallery")}>
          <ImageIcon className="w-5 h-5" />
        </Button>

        <Button variant="ghost" size="icon" onClick={() => setLocation("/settings")}>
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                  <AvatarImage src={girlfriend.referenceImageUrl} alt={girlfriend.name} />
                  <AvatarFallback>{girlfriend.name[0]}</AvatarFallback>
                </Avatar>
              )}

              <div className="flex flex-col gap-1 max-w-[75%]">
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
                    className="self-start ml-1 text-muted-foreground hover:text-primary transition-colors"
                    title="播放语音"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
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
              <AvatarImage src={girlfriend.referenceImageUrl} alt={girlfriend.name} />
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
              <AvatarImage src={girlfriend.referenceImageUrl} alt={girlfriend.name} />
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
      <form onSubmit={handleSendMessage} className="flex items-center gap-2 p-4 border-t bg-card">
        <Input
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`和 ${girlfriend.name} 说点什么...`}
          disabled={sendMessage.isPending || generateSelfie.isPending}
          className="flex-1"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!message.trim() || sendMessage.isPending || generateSelfie.isPending}
        >
          {sendMessage.isPending || generateSelfie.isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </form>
    </div>
  );
}
