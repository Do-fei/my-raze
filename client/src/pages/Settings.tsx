import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Settings() {
  const [, setLocation] = useLocation();
  const [falApiKey, setFalApiKey] = useState("");
  const [llmApiKey, setLlmApiKey] = useState("");
  const [llmApiUrl, setLlmApiUrl] = useState("https://api.x.ai/v1/chat/completions");
  const [llmModel, setLlmModel] = useState("grok-2-1212");

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

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航栏 */}
      <header className="flex items-center gap-3 px-4 py-3 border-b bg-card sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/chat")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">设置</h1>
      </header>

      {/* 设置内容 */}
      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
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
                  <p className="text-xs text-muted-foreground">
                    成本约 $0.022/张图片
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* LLM API 配置 */}
            <Card>
              <CardHeader>
                <CardTitle>LLM API 配置</CardTitle>
                <CardDescription>
                  用于智能对话。推荐使用 XAI Grok 4.1 Fast。获取 API Key：
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
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={upsertApiConfig.isPending}
            >
              {upsertApiConfig.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存配置
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
                  <strong>1. fal.ai API Key：</strong>必填，用于生成自拍照片
                </p>
                <p>
                  <strong>2. LLM API Key：</strong>可选，如果不填写将使用内置 API（可能有使用限制）
                </p>
                <p>
                  <strong>3. 成本估算：</strong>
                </p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li>图片生成：约 $0.022/张</li>
                  <li>对话（Grok）：约 $0.05-0.10/天（100 轮对话）</li>
                  <li>月度总成本：约 $20-25（每天 20 张自拍 + 100 轮对话）</li>
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
