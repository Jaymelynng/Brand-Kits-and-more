import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video, Upload, Download, Trash2, LinkIcon, Loader2 } from "lucide-react";
import { useUploadHeroVideo, useUpdateHeroVideo } from "@/hooks/useGyms";
import { useToast } from "@/hooks/use-toast";

interface HeroVideoManagerProps {
  gymId: string;
  gymName: string;
  gymCode: string;
  currentVideoUrl: string | null;
  primaryColor: string;
}

export function HeroVideoManager({ gymId, gymName, gymCode, currentVideoUrl, primaryColor }: HeroVideoManagerProps) {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const uploadMutation = useUploadHeroVideo();
  const updateMutation = useUpdateHeroVideo();

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast({ variant: "destructive", description: "Please select a video file" });
      return;
    }
    setIsUploading(true);
    uploadMutation.mutate(
      { gymId, file },
      {
        onSuccess: () => {
          setIsUploading(false);
          toast({ description: `Hero video updated for ${gymName}!` });
        },
        onError: (err) => {
          setIsUploading(false);
          console.error(err);
          toast({ variant: "destructive", description: "Failed to upload video" });
        },
      }
    );
  };

  const handleSetUrl = () => {
    if (!urlValue.trim()) return;
    updateMutation.mutate(
      { gymId, heroVideoUrl: urlValue.trim() },
      {
        onSuccess: () => {
          toast({ description: `Hero video URL set for ${gymName}!` });
          setShowUrlInput(false);
          setUrlValue("");
        },
        onError: () => {
          toast({ variant: "destructive", description: "Failed to set video URL" });
        },
      }
    );
  };

  const handleRemove = () => {
    updateMutation.mutate(
      { gymId, heroVideoUrl: null },
      {
        onSuccess: () => toast({ description: "Hero video removed" }),
        onError: () => toast({ variant: "destructive", description: "Failed to remove video" }),
      }
    );
  };

  const handleDownload = async () => {
    if (!currentVideoUrl) return;
    try {
      const response = await fetch(currentVideoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${gymCode}-hero-video.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      toast({ variant: "destructive", description: "Download failed" });
    }
  };

  return (
    <div className="p-4 border rounded-lg space-y-3" style={{ borderColor: `${primaryColor}35` }}>
      <div className="flex items-center gap-2 mb-2">
        <Video className="w-5 h-5" style={{ color: primaryColor }} />
        <h3 className="text-sm font-semibold">Hero Video</h3>
      </div>

      {currentVideoUrl ? (
        <div className="space-y-2">
          <video
            src={currentVideoUrl}
            className="w-full h-32 object-cover rounded-md"
            muted
            playsInline
            loop
            autoPlay
          />
          <p className="text-xs text-muted-foreground truncate" title={currentVideoUrl}>
            {currentVideoUrl.split("/").pop()}
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={handleDownload}>
              <Download className="w-3 h-3 mr-1" /> Download
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-3 h-3 mr-1" /> Replace
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowUrlInput(!showUrlInput)}>
              <LinkIcon className="w-3 h-3 mr-1" /> Set URL
            </Button>
            <Button size="sm" variant="destructive" onClick={handleRemove}>
              <Trash2 className="w-3 h-3 mr-1" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">No hero video set</p>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
              Upload Video
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowUrlInput(!showUrlInput)}>
              <LinkIcon className="w-3 h-3 mr-1" /> Set URL
            </Button>
          </div>
        </div>
      )}

      {showUrlInput && (
        <div className="flex gap-2">
          <Input
            placeholder="Paste video URL..."
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            className="text-xs"
          />
          <Button size="sm" onClick={handleSetUrl} style={{ backgroundColor: primaryColor, color: "white" }}>
            Save
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
