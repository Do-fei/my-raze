import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, Upload, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function Setup() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const editId = params.id ? parseInt(params.id) : null;

  const [name, setName] = useState("");
  const [personality, setPersonality] = useState("");
  const [appearance, setAppearance] = useState("");
  const [interests, setInterests] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  // 获取女友列表用于编辑
  const { data: girlfriends } = trpc.girlfriend.list.useQuery(undefined, {
    enabled: !!editId,
  });

  // 编辑模式：加载已有数据
  useEffect(() => {
    if (editId && girlfriends) {
      const gf = girlfriends.find((g) => g.id === editId);
      if (gf) {
        setName(gf.name);
        setPersonality(gf.personality);
        setAppearance(gf.appearance);
        setInterests(gf.interests || "");
        setExistingImageUrl(gf.referenceImageUrl);
      }
    }
  }, [editId, girlfriends]);

  const createGirlfriend = trpc.girlfriend.create.useMutation({
    onSuccess: () => {
      toast.success("女友配置创建成功！");
      setLocation("/");
    },
    onError: (error) => {
      toast.error(`创建失败：${error.message}`);
    },
  });

  const updateGirlfriend = trpc.girlfriend.update.useMutation({
    onSuccess: () => {
      toast.success("女友配置更新成功！");
      setLocation("/");
    },
    onError: (error) => {
      toast.error(`更新失败：${error.message}`);
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

    if (!name || !personality || !appearance) {
      toast.error("请填写所有必填项");
      return;
    }

    if (editId) {
      // 编辑模式
      updateGirlfriend.mutate({
        id: editId,
        name,
        personality,
        appearance,
        interests: interests || undefined,
      });
    } else {
      // 创建模式
      if (!imageFile) {
        toast.error("请上传参考照片");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
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
    }
  };

  const isEditing = !!editId;
  const isPending = createGirlfriend.isPending || updateGirlfriend.isPending;
  const displayImage = imagePreview || existingImageUrl;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-[oklch(0.16_0.02_330)] dark:via-[oklch(0.14_0.015_320)] dark:to-[oklch(0.16_0.02_300)] p-4">
      <div className="max-w-2xl mx-auto py-8">
        <Button variant="ghost" className="mb-4" onClick={() => setLocation("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {isEditing ? "编辑女友配置" : "创建你的专属女友"}
            </CardTitle>
            <CardDescription>
              {isEditing
                ? "修改性格特征和兴趣爱好"
                : "上传参考照片并设置性格特征，打造独一无二的虚拟女友"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 参考照片上传 */}
              <div className="space-y-2">
                <Label htmlFor="image">
                  参考照片 {!isEditing && "*"}
                </Label>
                <div className="flex flex-col items-center gap-4">
                  {displayImage ? (
                    <div className="relative w-48 h-48 rounded-lg overflow-hidden border-2 border-border">
                      <img
                        src={displayImage}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      {!isEditing && (
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
                      )}
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
                  {!isEditing && (
                    <Input
                      id="image"
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  )}
                </div>
                {isEditing && (
                  <p className="text-xs text-muted-foreground text-center">
                    编辑模式下暂不支持更换照片，如需更换请创建新女友
                  </p>
                )}
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

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isEditing ? "保存中..." : "创建中..."}
                  </>
                ) : isEditing ? (
                  "保存修改"
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
