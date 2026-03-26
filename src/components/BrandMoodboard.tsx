import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  usePersonalBrandImages,
  useAddPersonalBrandImage,
  useDeletePersonalBrandImage,
  useUpdatePersonalBrandImage,
} from "@/hooks/usePersonalBrand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ImagePlus, Trash2, Copy, Check, Download, Pencil, X, Camera, Maximize2, Image as ImageIcon } from "lucide-react";
import { useDropzone } from "react-dropzone";

const BrandMoodboard = () => {
  const { toast } = useToast();
  const { data: images = [], isLoading } = usePersonalBrandImages();
  const addImage = useAddPersonalBrandImage();
  const deleteImage = useDeletePersonalBrandImage();
  const updateImage = useUpdatePersonalBrandImage();
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [viewingImage, setViewingImage] = useState<{ url: string; label: string } | null>(null);

  const onDrop = useCallback(async (files: File[]) => {
    setUploading(true);
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `moodboard/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("personal-brand").upload(path, file);
      if (uploadErr) {
        toast({ description: `Upload failed: ${uploadErr.message}`, variant: "destructive" });
        continue;
      }
      const { data: urlData } = supabase.storage.from("personal-brand").getPublicUrl(path);
      await addImage.mutateAsync({
        file_url: urlData.publicUrl,
        filename: file.name,
        order_index: images.length,
      });
    }
    setUploading(false);
    toast({ description: `${files.length} image(s) uploaded!` });
  }, [images.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: true,
  });

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    toast({ description: "URL copied!" });
  };

  const copyImage = async (url: string, id: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const pngBlob = blob.type === "image/png" ? blob : await convertToPng(blob);
      await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
      setCopiedId(id + "-img");
      setTimeout(() => setCopiedId(null), 1500);
      toast({ description: "Image copied to clipboard!" });
    } catch {
      toast({ description: "Couldn't copy image — try downloading instead", variant: "destructive" });
    }
  };

  const convertToPng = (blob: Blob): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext("2d")!.drawImage(img, 0, 0);
        canvas.toBlob((b) => resolve(b!), "image/png");
      };
      img.src = URL.createObjectURL(blob);
    });
  };

  const downloadImage = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast({ description: "Download failed", variant: "destructive" });
    }
  };

  const handleDelete = (id: string, fileUrl: string) => {
    const path = fileUrl.split("/personal-brand/").pop() || "";
    deleteImage.mutate({ id, filePath: path }, {
      onSuccess: () => toast({ description: "Image removed" }),
    });
  };

  const startEdit = (id: string, label: string | null) => {
    setEditingId(id);
    setEditLabel(label || "");
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateImage.mutate(
      { id: editingId, updates: { label: editLabel || null } },
      { onSuccess: () => { setEditingId(null); toast({ description: "Label updated!" }); } }
    );
  };

  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/15 shadow-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-white/90 text-sm uppercase tracking-widest flex items-center gap-2">
          <Camera className="w-4 h-4 text-[#c3a5a5]" /> Moodboard & Aesthetic
          <span className="text-xs text-white/40 font-normal ml-auto">{images.length} images</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all mb-4 ${
            isDragActive ? "border-[#b48f8f] bg-white/10" : "border-white/20 hover:border-white/40"
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <p className="text-white/60 text-sm">Uploading...</p>
          ) : (
            <div className="space-y-1">
              <ImagePlus className="w-8 h-8 mx-auto text-white/40" />
              <p className="text-white/60 text-sm">Drop images here or click to upload</p>
              <p className="text-white/30 text-xs">PNG, JPG, WEBP — any vibe inspo</p>
            </div>
          )}
        </div>

        {/* Image grid */}
        {isLoading ? (
          <p className="text-white/40 text-sm">Loading...</p>
        ) : images.length === 0 ? (
          <p className="text-white/30 text-sm text-center py-4">No moodboard images yet. Upload some inspo!</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {images.map((img) => (
              <div key={img.id} className="group relative">
                <div className="aspect-square rounded-lg overflow-hidden bg-black/20 border border-white/10">
                  <img
                    src={img.file_url}
                    alt={img.label || img.filename}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                </div>

                {/* Hover overlay with actions */}
                <div className="absolute inset-0 rounded-lg bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  <button
                    className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
                    onClick={() => copyUrl(img.file_url, img.id)}
                    title="Copy URL"
                  >
                    {copiedId === img.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-white" />}
                  </button>
                  <button
                    className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
                    onClick={() => downloadImage(img.file_url, img.filename)}
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5 text-white" />
                  </button>
                  <button
                    className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
                    onClick={() => startEdit(img.id, img.label)}
                    title="Edit label"
                  >
                    <Pencil className="w-3.5 h-3.5 text-white" />
                  </button>
                  <button
                    className="w-7 h-7 rounded-full bg-red-600/60 flex items-center justify-center hover:bg-red-600/80"
                    onClick={() => handleDelete(img.id, img.file_url)}
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>

                {/* Label */}
                {editingId === img.id ? (
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="h-6 text-[10px] bg-white/10 border-white/20 text-white"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                      placeholder="Label"
                    />
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={saveEdit}>
                      <Check className="w-3 h-3 text-green-400" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setEditingId(null)}>
                      <X className="w-3 h-3 text-red-400" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-[10px] text-white/50 text-center mt-1 truncate">
                    {img.label || img.filename}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BrandMoodboard;
