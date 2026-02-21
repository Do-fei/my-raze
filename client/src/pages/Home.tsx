import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  Heart,
  MessageCircle,
  Image,
  Settings,
  Loader2,
  Plus,
  Sun,
  Moon,
  Sparkles,
  Edit,
  Clock,
  Menu,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [historyOpen, setHistoryOpen] = useState(false);
  const defaultCreatedRef = useRef(false);

  const { data: girlfriends, isLoading: girlfriendsLoading, refetch } = trpc.girlfriend.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // 历史对话列表
  const { data: conversationsWithDetails } = trpc.conversation.listWithDetails.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // 确保默认女友存在
  const ensureDefault = trpc.girlfriend.ensureDefault.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  // 登录后自动创建默认女友
  useEffect(() => {
    if (isAuthenticated && girlfriends && girlfriends.length === 0 && !defaultCreatedRef.current) {
      defaultCreatedRef.current = true;
      ensureDefault.mutate();
    }
  }, [isAuthenticated, girlfriends]);

  const updateGirlfriend = trpc.girlfriend.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("已切换女友");
    },
  });

  const handleStartChat = (girlfriendId: number) => {
    updateGirlfriend.mutate(
      { id: girlfriendId, isActive: true },
      {
        onSuccess: () => {
          setLocation("/chat");
        },
      }
    );
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "刚刚";
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // 未登录 - 展示欢迎页
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-[oklch(0.16_0.02_330)] dark:via-[oklch(0.14_0.015_320)] dark:to-[oklch(0.16_0.02_300)]">
        {/* 主题切换按钮 */}
        <div className="absolute top-4 right-4">
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </Button>
        </div>

        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Heart className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground">AI Girlfriend</h1>
            <p className="text-lg text-muted-foreground">
              你的专属虚拟女友，随时陪伴聊天，分享生活点滴
            </p>
          </div>

          <div className="space-y-3">
            <Card className="text-left">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  智能对话
                </CardTitle>
                <CardDescription>基于先进的 AI 技术，提供自然流畅的对话体验</CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-left">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Image className="w-5 h-5 text-primary" />
                  场景化自拍
                </CardTitle>
                <CardDescription>根据对话内容自动生成相应场景的自拍照片</CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-left">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="w-5 h-5 text-primary" />
                  语音对话
                </CardTitle>
                <CardDescription>AI 女友可以用甜美的声音和你说话</CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-left">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="w-5 h-5 text-primary" />
                  个性化配置
                </CardTitle>
                <CardDescription>自定义性格、外貌和兴趣爱好，支持多个女友</CardDescription>
              </CardHeader>
            </Card>
          </div>

          <Button size="lg" className="w-full text-base" onClick={() => (window.location.href = getLoginUrl())}>
            <Heart className="w-5 h-5 mr-2" />
            立即开始
          </Button>
        </div>
      </div>
    );
  }

  // 已登录 - 女友列表
  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航栏 */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-card sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-primary" />
          <h1 className="text-lg font-bold">AI Girlfriend</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setHistoryOpen(true)}
            title="历史对话"
          >
            <Clock className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setLocation("/settings")}>
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* 欢迎信息 */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">你好，{user?.name || "朋友"} 👋</h2>
          <p className="text-muted-foreground">选择一位女友开始聊天吧</p>
        </div>

        {/* 女友列表 */}
        {girlfriendsLoading || ensureDefault.isPending ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !girlfriends || girlfriends.length === 0 ? (
          <Card className="border-dashed">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Plus className="w-8 h-8 text-primary" />
              </div>
              <CardTitle>创建你的第一位女友</CardTitle>
              <CardDescription>
                上传参考照片，设置性格特征和兴趣爱好
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => setLocation("/setup")}>
                <Plus className="w-4 h-4 mr-2" />
                开始创建
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {girlfriends.map((gf) => (
              <Card
                key={gf.id}
                className={`transition-all hover:shadow-md ${
                  gf.isActive ? "ring-2 ring-primary" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* 头像 */}
                    <Avatar className="w-16 h-16 flex-shrink-0">
                      <AvatarImage src={gf.referenceImageUrl} alt={gf.name} />
                      <AvatarFallback className="text-lg">{gf.name[0]}</AvatarFallback>
                    </Avatar>

                    {/* 信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg truncate">{gf.name}</h3>
                        {gf.isActive && (
                          <Badge variant="default" className="text-xs flex-shrink-0">
                            当前
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {gf.personality}
                      </p>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleStartChat(gf.id)}
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        聊天
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/setup/${gf.id}`)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        编辑
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 添加新女友按钮 */}
        {girlfriends && girlfriends.length > 0 && (
          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={() => setLocation("/setup")}
          >
            <Plus className="w-4 h-4 mr-2" />
            创建新女友
          </Button>
        )}

        {/* 快捷入口 */}
        {girlfriends && girlfriends.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <Card
              className="cursor-pointer hover:shadow-md transition-all"
              onClick={() => setLocation("/gallery")}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Image className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">自拍画廊</p>
                  <p className="text-xs text-muted-foreground">查看所有照片</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-all"
              onClick={() => setLocation("/settings")}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Settings className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">API 设置</p>
                  <p className="text-xs text-muted-foreground">配置 API Key</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* 历史对话侧边栏 */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="w-[320px] sm:max-w-[360px] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              历史对话
            </SheetTitle>
            <SheetDescription>
              点击快速切换到对应聊天
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)]">
            {!conversationsWithDetails || conversationsWithDetails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <MessageCircle className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">还没有对话记录</p>
                <p className="text-xs text-muted-foreground mt-1">选择一位女友开始聊天吧</p>
              </div>
            ) : (
              <div className="divide-y">
                {conversationsWithDetails.map((convo) => (
                  <button
                    key={convo.id}
                    className="w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors flex items-center gap-3"
                    onClick={() => {
                      setHistoryOpen(false);
                      setLocation(`/chat/${convo.id}`);
                    }}
                  >
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      {convo.girlfriendImage ? (
                        <AvatarImage src={convo.girlfriendImage} alt={convo.girlfriendName || ""} />
                      ) : null}
                      <AvatarFallback className="text-sm">
                        {convo.girlfriendName?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">
                          {convo.girlfriendName || convo.title || "对话"}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {convo.lastMessageAt
                            ? formatTime(convo.lastMessageAt)
                            : formatTime(convo.updatedAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {convo.lastMessage
                          ? convo.lastMessage === "[自拍照片]"
                            ? "📷 发送了一张照片"
                            : convo.lastMessage
                          : "暂无消息"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
