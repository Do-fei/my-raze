import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, Upload, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Setup() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [personality, setPersonality] = useState("");
  const [appearance, setAppearance] = useState("");
  const [interests, setInterests] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const createGirlfriend = trpc.girlfriend.create.useMutation({
    onSuccess: () => {
      toast.success("女友配置创建成功！");
      setLocation("/chat");
    },
    onError: (error) => {
      toast.error(`创建失败：${error.message}`);
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !personality || !appearance || !imageFile) {
      toast.error("请填写所有必填项并上传参考照片");
      return;
    }

    // 将图片转换为 Base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1]; // 移除 data:image/...;base64, 前缀
      createGirlfriend.mutate({
        name,
        personality,
        appearance,
        interests: interests || undefined,
        referenceImageBase64: base64,
        referenceImageMimeType: imageFile.type,
      });
    };
    reader.readAsDataURL(imageFile);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setLocation("/")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">创建你的专属女友</CardTitle>
            <CardDescription>
              上传参考照片并设置性格特征，打造独一无二的虚拟女友
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 参考照片上传 */}
              <div className="space-y-2">
                <Label htmlFor="image">参考照片 *</Label>
                <div className="flex flex-col items-center gap-4">
                  {imagePreview ? (
                    <div className="relative w-48 h-48 rounded-lg overflow-hidden border-2 border-border">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-2 right-2"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                      >
                        更换
                      </Button>
                    </div>
                  ) : (
                    <label
                      htmlFor="image"
                      className="w-48 h-48 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
                    >
                      <Upload className="w-12 h-12 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">点击上传照片</span>
                      <span className="text-xs text-muted-foreground mt-1">
                        支持 JPG、PNG 格式
                      </span>
                    </label>
                  )}
                  <Input
                    id="image"
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  建议上传清晰的正面照片，用于生成自拍照片
                </p>
              </div>

              {/* 名字 */}
              <div className="space-y-2">
                <Label htmlFor="name">名字 *</Label>
                <Input
                  id="name"
                  placeholder="例如：小雨"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* 性格特征 */}
              <div className="space-y-2">
                <Label htmlFor="personality">性格特征 *</Label>
                <Textarea
                  id="personality"
                  placeholder="例如：温柔体贴，善解人意，喜欢撒娇，偶尔会有点小任性..."
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  详细描述性格特征，这将影响 AI 的对话风格
                </p>
              </div>

              {/* 外貌描述 */}
              <div className="space-y-2">
                <Label htmlFor="appearance">外貌描述 *</Label>
                <Textarea
                  id="appearance"
                  placeholder="例如：长发飘逸，皮肤白皙，身材苗条，喜欢穿裙子..."
                  value={appearance}
                  onChange={(e) => setAppearance(e.target.value)}
                  rows={3}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  描述外貌特征，用于生成自拍照片
                </p>
              </div>

              {/* 兴趣爱好 */}
              <div className="space-y-2">
                <Label htmlFor="interests">兴趣爱好（可选）</Label>
                <Textarea
                  id="interests"
                  placeholder="例如：喜欢看电影、听音乐、旅行、美食..."
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  rows={2}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createGirlfriend.isPending}
              >
                {createGirlfriend.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  "创建女友"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
