import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";
import { Loader2, Send, ArrowLeft, Image as ImageIcon, Settings, Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function Chat() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const conversationId = params.id ? parseInt(params.id) : null;

  const [message, setMessage] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(
    conversationId
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: girlfriend } = trpc.girlfriend.getActive.useQuery();
  const { data: messages, refetch: refetchMessages } = trpc.conversation.getMessages.useQuery(
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
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !currentConversationId) return;

    sendMessage.mutate({
      conversationId: currentConversationId,
      content: message.trim(),
    });
  };

  if (!girlfriend) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/")}
        >
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

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/gallery")}
        >
          <ImageIcon className="w-5 h-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/settings")}
        >
          <Settings className="w-5 h-5" />
        </Button>
      </header>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Heart className="w-12 h-12 text-primary mb-4" />
            <p className="text-muted-foreground">开始和 {girlfriend.name} 聊天吧~</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              } animate-slide-in-${msg.role === "user" ? "right" : "left"}`}
            >
              {msg.role === "assistant" && (
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={girlfriend.referenceImageUrl} alt={girlfriend.name} />
                  <AvatarFallback>{girlfriend.name[0]}</AvatarFallback>
                </Avatar>
              )}

              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
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
                      className="rounded-lg max-w-full h-auto"
                    />
                    {msg.content && msg.content !== "[自拍照片]" && (
                      <p className="text-sm">{msg.content}</p>
                    )}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                )}
              </div>

              {msg.role === "user" && (
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarImage src={user?.email || undefined} alt={user?.name || "User"} />
                  <AvatarFallback>{user?.name?.[0] || "U"}</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))
        )}

        {sendMessage.isPending && (
          <div className="flex gap-3 animate-slide-in-left">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={girlfriend.referenceImageUrl} alt={girlfriend.name} />
              <AvatarFallback>{girlfriend.name[0]}</AvatarFallback>
            </Avatar>
            <div className="bg-muted rounded-2xl px-4 py-2">
              <div className="flex gap-1 animate-typing">
                <span className="w-2 h-2 bg-foreground/50 rounded-full"></span>
                <span className="w-2 h-2 bg-foreground/50 rounded-full"></span>
                <span className="w-2 h-2 bg-foreground/50 rounded-full"></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <form
        onSubmit={handleSendMessage}
        className="flex items-center gap-2 p-4 border-t bg-card"
      >
        <Input
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
