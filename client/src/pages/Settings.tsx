import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Save, Volume2, Sun, Moon } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [falApiKey, setFalApiKey] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmApiUrl, setLlmApiUrl] = useState("https://api.x.ai/v1/chat/completions");
  const [llmModel, setLlmModel] = useState("grok-2-1212");
  const [ttsAutoPlay, setTtsAutoPlay] = useState(() => {
    return localStorage.getItem("tts-autoplay") === "true";
  });

  const { data: apiConfig, isLoading } = trpc.apiConfig.get.useQuery();
  const upsertApiConfig = trpc.apiConfig.upsert.useMutation({
    onSuccess: () => {
      toast.success("API 配置保存成功");
    },
    onError: (error) => {
      toast.error(`保存失败：${error.message}`);
    },
  });

  useEffect(() => {
    if (apiConfig) {
      setFalApiKey(apiConfig.falApiKey || "");
      setLlmApiKey(apiConfig.llmApiKey || "");
      setLlmApiUrl(apiConfig.llmApiUrl || "https://api.x.ai/v1/chat/completions");
      setLlmModel(apiConfig.llmModel || "grok-2-1212");
    }
  }, [apiConfig]);

  const handleSave = () => {
    upsertApiConfig.mutate({
      falApiKey: falApiKey || undefined,
      llmApiKey: llmApiKey || undefined,
      llmApiUrl: llmApiUrl || undefined,
      llmModel: llmModel || undefined,
    });
  };

  const handleTtsToggle = useCallback((checked: boolean) => {
    setTtsAutoPlay(checked);
    localStorage.setItem("tts-autoplay", String(checked));
    toast.success(checked ? "已开启自动语音" : "已关闭自动语音");
  }, []);

  const handleTestVoice = useCallback(() => {
    if (!("speechSynthesis" in window)) {
      toast.error("当前浏览器不支持语音功能");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("你好呀，我是你的虚拟女友，很高兴认识你~");
    utterance.lang = "zh-CN";
    utterance.rate = 0.95;
    utterance.pitch = 1.2;
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(
      (v) =>
        v.lang.startsWith("zh") &&
        (v.name.toLowerCase().includes("female") ||
          v.name.includes("Xiaoxiao") ||
          v.name.includes("女"))
    ) || voices.find((v) => v.lang.startsWith("zh"));
    if (zhVoice) utterance.voice = zhVoice;
    window.speechSynthesis.speak(utterance);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航栏 */}
      <header className="flex items-center gap-3 px-4 py-3 border-b bg-card sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold flex-1">设置</h1>
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </Button>
      </header>

      {/* 设置内容 */}
      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* 语音设置 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-primary" />
                  语音设置
                </CardTitle>
                <CardDescription>
                  使用浏览器内置语音合成，让 AI 女友可以"说话"（免费，无需 API Key）
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>自动语音播放</Label>
                    <p className="text-xs text-muted-foreground">
                      开启后，AI 女友的每条回复都会自动朗读
                    </p>
                  </div>
                  <Switch checked={ttsAutoPlay} onCheckedChange={handleTtsToggle} />
                </div>
                <Button variant="outline" size="sm" onClick={handleTestVoice}>
                  <Volume2 className="w-4 h-4 mr-2" />
                  测试语音效果
                </Button>
                <p className="text-xs text-muted-foreground">
                  语音质量取决于浏览器和操作系统。推荐使用 Chrome/Edge 获得最佳效果。
                  你也可以在聊天中点击每条消息旁的喇叭图标手动播放。
                </p>
              </CardContent>
            </Card>

            {/* 主题设置 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {theme === "light" ? (
                    <Sun className="w-5 h-5 text-primary" />
                  ) : (
                    <Moon className="w-5 h-5 text-primary" />
                  )}
                  主题设置
                </CardTitle>
                <CardDescription>切换亮色/暗色主题</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>暗黑模式</Label>
                    <p className="text-xs text-muted-foreground">
                      {theme === "dark" ? "当前为暗黑模式" : "当前为亮色模式"}
                    </p>
                  </div>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={() => toggleTheme?.()}
                  />
                </div>
              </CardContent>
            </Card>

            {/* fal.ai API 配置 */}
            <Card>
              <CardHeader>
                <CardTitle>fal.ai API 配置</CardTitle>
                <CardDescription>
                  用于生成自拍照片。获取 API Key：
                  <a
                    href="https://fal.ai/dashboard/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline ml-1"
                  >
                    fal.ai/dashboard/keys
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="falApiKey">fal.ai API Key</Label>
                  <Input
                    id="falApiKey"
                    type="password"
                    placeholder="输入你的 fal.ai API Key"
                    value={falApiKey}
                    onChange={(e) => setFalApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">成本约 $0.022/张图片</p>
                </div>
              </CardContent>
            </Card>

            {/* LLM API 配置 */}
            <Card>
              <CardHeader>
                <CardTitle>LLM API 配置</CardTitle>
                <CardDescription>
                  用于智能对话。推荐使用 XAI Grok。获取 API Key：
                  <a
                    href="https://console.x.ai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline ml-1"
                  >
                    console.x.ai
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="llmApiKey">LLM API Key</Label>
                  <Input
                    id="llmApiKey"
                    type="password"
                    placeholder="输入你的 LLM API Key"
                    value={llmApiKey}
                    onChange={(e) => setLlmApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    如果不填写，将使用内置的 LLM API
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="llmApiUrl">API URL</Label>
                  <Input
                    id="llmApiUrl"
                    placeholder="https://api.x.ai/v1/chat/completions"
                    value={llmApiUrl}
                    onChange={(e) => setLlmApiUrl(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="llmModel">模型名称</Label>
                  <Input
                    id="llmModel"
                    placeholder="grok-2-1212"
                    value={llmModel}
                    onChange={(e) => setLlmModel(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    推荐：grok-2-1212（速度快，成本低）
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 保存按钮 */}
            <Button className="w-full" onClick={handleSave} disabled={upsertApiConfig.isPending}>
              {upsertApiConfig.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存 API 配置
                </>
              )}
            </Button>

            {/* 使用说明 */}
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">使用说明</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>1. 语音功能：</strong>免费，使用浏览器内置语音合成，无需额外配置
                </p>
                <p>
                  <strong>2. fal.ai API Key：</strong>必填（用于生成自拍照片）
                </p>
                <p>
                  <strong>3. LLM API Key：</strong>可选，如果不填写将使用内置 API
                </p>
                <p>
                  <strong>4. 成本估算：</strong>
                </p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li>语音：免费</li>
                  <li>图片生成：约 $0.022/张</li>
                  <li>对话（Grok）：约 $0.05-0.10/天</li>
                  <li>月度总成本：约 $20-25</li>
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
