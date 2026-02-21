import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Save, Volume2, Sun, Moon, Search, Check, ExternalLink, Zap } from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

type ModelInfo = {
  id: string;
  name: string;
  contextLength: number;
  pricing: { prompt: string; completion: string };
  provider: string;
};

export default function Settings() {
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [falApiKey, setFalApiKey] = useState("");
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [showModelList, setShowModelList] = useState(false);
  const [ttsAutoPlay, setTtsAutoPlay] = useState(() => {
    return localStorage.getItem("tts-autoplay") === "true";
  });

  // 加载已有配置
  const { data: apiConfig, isLoading } = trpc.apiConfig.get.useQuery();

  // 当用户输入 OpenRouter Key 后自动查询模型列表
  const { data: modelsData, isLoading: modelsLoading, error: modelsError } = trpc.apiConfig.fetchModels.useQuery(
    { apiKey: openRouterKey },
    { enabled: openRouterKey.length > 10, retry: false }
  );

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
      setOpenRouterKey(apiConfig.llmApiKey || "");
      setSelectedModel(apiConfig.llmModel || "");
    }
  }, [apiConfig]);

  // 过滤模型列表
  const filteredModels = useMemo(() => {
    if (!modelsData?.models) return [];
    const search = modelSearch.toLowerCase().trim();
    if (!search) return modelsData.models;
    return modelsData.models.filter(
      (m: ModelInfo) =>
        m.name.toLowerCase().includes(search) ||
        m.id.toLowerCase().includes(search) ||
        m.provider.toLowerCase().includes(search)
    );
  }, [modelsData?.models, modelSearch]);

  // 按 provider 分组
  const groupedModels = useMemo(() => {
    const groups: Record<string, ModelInfo[]> = {};
    for (const model of filteredModels) {
      const provider = model.provider;
      if (!groups[provider]) groups[provider] = [];
      groups[provider].push(model);
    }
    // 按 provider 名称排序
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredModels]);

  const handleSave = () => {
    upsertApiConfig.mutate({
      falApiKey: falApiKey || undefined,
      llmApiKey: openRouterKey || undefined,
      llmModel: selectedModel || undefined,
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

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    setShowModelList(false);
    toast.success(`已选择模型：${modelId}`);
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (num === 0) return "免费";
    if (num < 0.000001) return `$${num.toExponential(1)}`;
    return `$${num.toFixed(6)}`;
  };

  const selectedModelInfo = useMemo(() => {
    if (!modelsData?.models || !selectedModel) return null;
    return modelsData.models.find((m: ModelInfo) => m.id === selectedModel);
  }, [modelsData?.models, selectedModel]);

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

            {/* OpenRouter LLM 配置 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  OpenRouter LLM 配置
                </CardTitle>
                <CardDescription>
                  通过 OpenRouter 接入数百种 AI 模型（GPT-4o、Claude、Gemini、Grok 等）。获取 API Key：
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline ml-1 inline-flex items-center gap-1"
                  >
                    openrouter.ai/keys <ExternalLink className="w-3 h-3" />
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* API Key 输入 */}
                <div className="space-y-2">
                  <Label htmlFor="openRouterKey">OpenRouter API Key</Label>
                  <Input
                    id="openRouterKey"
                    type="password"
                    placeholder="sk-or-v1-xxxxxxxxxxxx"
                    value={openRouterKey}
                    onChange={(e) => setOpenRouterKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    如果不填写，将使用内置的免费 LLM API（Gemini 2.5 Flash）
                  </p>
                </div>

                {/* 模型加载状态 */}
                {openRouterKey.length > 10 && modelsLoading && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">正在加载可用模型列表...</span>
                  </div>
                )}

                {/* API Key 错误 */}
                {modelsError && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                    {modelsError.message}
                  </div>
                )}

                {/* 已选择的模型 */}
                {selectedModel && (
                  <div className="p-3 rounded-lg border bg-primary/5 border-primary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-primary" />
                          <span className="font-medium text-sm">当前模型</span>
                        </div>
                        <p className="text-sm mt-1 font-mono">{selectedModel}</p>
                        {selectedModelInfo && (
                          <p className="text-xs text-muted-foreground mt-1">
                            上下文：{(selectedModelInfo.contextLength / 1000).toFixed(0)}K tokens | 
                            输入：{formatPrice(selectedModelInfo.pricing.prompt)}/token | 
                            输出：{formatPrice(selectedModelInfo.pricing.completion)}/token
                          </p>
                        )}
                      </div>
                      {modelsData && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowModelList(!showModelList)}
                        >
                          更换模型
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* 模型列表 */}
                {modelsData && !modelsLoading && (showModelList || !selectedModel) && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>选择模型（共 {modelsData.total} 个可用）</Label>
                      {selectedModel && (
                        <Button variant="ghost" size="sm" onClick={() => setShowModelList(false)}>
                          收起
                        </Button>
                      )}
                    </div>

                    {/* 搜索框 */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="搜索模型名称、ID 或提供商..."
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    {/* 模型列表（按 provider 分组） */}
                    <div className="max-h-80 overflow-y-auto rounded-lg border divide-y">
                      {groupedModels.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          没有找到匹配的模型
                        </div>
                      ) : (
                        groupedModels.map(([provider, models]) => (
                          <div key={provider}>
                            <div className="px-3 py-2 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase sticky top-0">
                              {provider} ({models.length})
                            </div>
                            {models.map((model: ModelInfo) => (
                              <button
                                key={model.id}
                                className={`w-full text-left px-3 py-2.5 hover:bg-accent/50 transition-colors flex items-center justify-between gap-2 ${
                                  selectedModel === model.id ? "bg-primary/10 border-l-2 border-primary" : ""
                                }`}
                                onClick={() => handleSelectModel(model.id)}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium truncate">{model.name}</span>
                                    {selectedModel === model.id && (
                                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground font-mono truncate">
                                    {model.id}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs text-muted-foreground">
                                    {(model.contextLength / 1000).toFixed(0)}K
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatPrice(model.pricing.prompt)}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
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
                  <strong>3. OpenRouter API Key：</strong>可选，如果不填写将使用内置 API
                </p>
                <p>
                  <strong>4. 模型选择建议：</strong>
                </p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li>性价比之选：openai/gpt-4o-mini（便宜且快速）</li>
                  <li>角色扮演推荐：anthropic/claude-3.5-sonnet（更自然的对话）</li>
                  <li>免费模型：google/gemini-2.0-flash-exp:free</li>
                  <li>中文优化：deepseek/deepseek-chat</li>
                </ul>
                <p>
                  <strong>5. 成本估算：</strong>
                </p>
                <ul className="list-disc list-inside pl-4 space-y-1">
                  <li>语音：免费</li>
                  <li>图片生成：约 $0.022/张</li>
                  <li>对话（取决于模型）：$0.01-0.50/天</li>
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
