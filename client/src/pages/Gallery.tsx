import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Trash2, Download, Image as ImageIcon, Sun, Moon } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Gallery() {
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { data: selfies, isLoading, refetch } = trpc.selfie.list.useQuery();
  const deleteSelfie = trpc.selfie.delete.useMutation({
    onSuccess: () => {
      toast.success("删除成功");
      refetch();
    },
    onError: (error) => {
      toast.error(`删除失败：${error.message}`);
    },
  });

  const handleDownload = async (imageUrl: string, id: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `selfie-${id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("下载成功");
    } catch (error) {
      toast.error("下载失败");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航栏 */}
      <header className="flex items-center gap-3 px-4 py-3 border-b bg-card sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold flex-1">自拍画廊</h1>
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </Button>
      </header>

      {/* 画廊内容 */}
      <div className="p-4 max-w-4xl mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !selfies || selfies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ImageIcon className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">还没有自拍照片</h2>
            <p className="text-muted-foreground mb-4">
              在聊天中说"发张自拍"或描述场景来生成照片
            </p>
            <Button onClick={() => setLocation("/chat")}>去聊天</Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              共 {selfies.length} 张照片
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {selfies.map((selfie) => (
                <Card key={selfie.id} className="overflow-hidden group relative">
                  <img
                    src={selfie.imageUrl}
                    alt="Selfie"
                    className="w-full aspect-square object-cover cursor-pointer"
                    onClick={() => window.open(selfie.imageUrl, "_blank")}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => handleDownload(selfie.imageUrl, selfie.id)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确认删除</AlertDialogTitle>
                          <AlertDialogDescription>
                            确定要删除这张自拍吗？此操作无法撤销。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteSelfie.mutate({ id: selfie.id })}
                          >
                            删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>

                  <div className="p-2 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <p className="truncate flex-1">{selfie.userContext}</p>
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full ml-1 flex-shrink-0">
                        {selfie.mode === "mirror" ? "镜子" : "直拍"}
                      </span>
                    </div>
                    <p className="text-[10px] mt-1">
                      {new Date(selfie.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
