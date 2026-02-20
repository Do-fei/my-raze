import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Heart, MessageCircle, Image, Settings, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { data: girlfriend, isLoading: girlfriendLoading } = trpc.girlfriend.getActive.useQuery(
    undefined,
    {
      enabled: isAuthenticated,
    }
  );

  // 如果已登录且有女友配置，自动跳转到聊天页面
  useEffect(() => {
    if (isAuthenticated && !girlfriendLoading && girlfriend) {
      setLocation("/chat");
    }
  }, [isAuthenticated, girlfriendLoading, girlfriend, setLocation]);

  if (loading || girlfriendLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-4">
            <Heart className="w-16 h-16 mx-auto text-primary" />
            <h1 className="text-4xl font-bold text-foreground">AI Girlfriend</h1>
            <p className="text-lg text-muted-foreground">
              你的专属虚拟女友，随时陪伴聊天，分享生活点滴
            </p>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  智能对话
                </CardTitle>
                <CardDescription>基于先进的 AI 技术，提供自然流畅的对话体验</CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  场景化自拍
                </CardTitle>
                <CardDescription>根据对话内容自动生成相应场景的自拍照片</CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  个性化配置
                </CardTitle>
                <CardDescription>自定义性格、外貌和兴趣爱好，打造专属女友</CardDescription>
              </CardHeader>
            </Card>
          </div>

          <Button size="lg" className="w-full" onClick={() => (window.location.href = getLoginUrl())}>
            立即开始
          </Button>
        </div>
      </div>
    );
  }

  // 已登录但没有女友配置，引导到设置页面
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <Heart className="w-16 h-16 mx-auto text-primary" />
        <h1 className="text-3xl font-bold">欢迎，{user?.name || "朋友"}！</h1>
        <p className="text-muted-foreground">让我们开始创建你的专属虚拟女友吧</p>

        <Card>
          <CardHeader>
            <CardTitle>首次设置</CardTitle>
            <CardDescription>上传参考照片，设置性格特征和兴趣爱好</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => setLocation("/setup")}>
              开始设置
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
