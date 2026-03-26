import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  usePersonalBrandColors,
  usePersonalBrandInfo,
  useAddPersonalColor,
  useDeletePersonalColor,
  useUpdatePersonalColor,
  useUpdatePersonalBrandInfo,
} from "@/hooks/usePersonalBrand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Shield, Palette, Type, Sparkles, Plus, Trash2, Copy, Check, Pencil, X, Save
} from "lucide-react";
import BrandMoodboard from "@/components/BrandMoodboard";

const MyBrand = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: colors = [], isLoading: colorsLoading } = usePersonalBrandColors();
  const { data: brandInfo, isLoading: infoLoading } = usePersonalBrandInfo();
  const addColor = useAddPersonalColor();
  const deleteColor = useDeletePersonalColor();
  const updateColor = useUpdatePersonalColor();
  const updateInfo = useUpdatePersonalBrandInfo();

  const [newHex, setNewHex] = useState("#");
  const [newName, setNewName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingColor, setEditingColor] = useState<string | null>(null);
  const [editHex, setEditHex] = useState("");
  const [editName, setEditName] = useState("");
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editFieldValue, setEditFieldValue] = useState("");

  if (loading || colorsLoading || infoLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#8a8a8a' }}>
        <div className="text-xl text-white/80">Loading...</div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#8a8a8a' }}>
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 mx-auto text-white/60" />
          <h1 className="text-2xl font-bold text-white">Private Area</h1>
          <p className="text-white/60">This brand kit is private.</p>
          <Button onClick={() => navigate('/')} variant="outline" className="border-white/30 text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        </div>
      </div>
    );
  }

  const copyHex = (hex: string, id: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleAddColor = () => {
    const hex = newHex.startsWith("#") ? newHex : `#${newHex}`;
    if (hex.length < 4) return;
    addColor.mutate(
      { color_hex: hex, color_name: newName || undefined, order_index: colors.length },
      {
        onSuccess: () => {
          setNewHex("#");
          setNewName("");
          toast({ description: "Color added!" });
        },
      }
    );
  };

  const startEditColor = (c: { id: string; color_hex: string; color_name: string | null }) => {
    setEditingColor(c.id);
    setEditHex(c.color_hex);
    setEditName(c.color_name || "");
  };

  const saveEditColor = () => {
    if (!editingColor) return;
    updateColor.mutate(
      { id: editingColor, updates: { color_hex: editHex, color_name: editName || null } },
      { onSuccess: () => { setEditingColor(null); toast({ description: "Color updated!" }); } }
    );
  };

  const startEditField = (field: string, value: string) => {
    setEditingField(field);
    setEditFieldValue(value || "");
  };

  const saveEditField = () => {
    if (!editingField || !brandInfo) return;
    updateInfo.mutate(
      { id: brandInfo.id, updates: { [editingField]: editFieldValue || null } },
      { onSuccess: () => { setEditingField(null); toast({ description: "Updated!" }); } }
    );
  };

  const copyAllColors = () => {
    const text = colors.map(c => c.color_hex).join("\n");
    navigator.clipboard.writeText(text);
    toast({ description: `${colors.length} colors copied!` });
  };

  const isLightColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 186;
  };

  const renderInfoField = (label: string, field: string, value: string | null | undefined) => {
    const isEditing = editingField === field;
    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/50 w-24">{label}</span>
          <Input
            value={editFieldValue}
            onChange={(e) => setEditFieldValue(e.target.value)}
            className="h-7 text-xs bg-white/10 border-white/20 text-white"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") saveEditField(); if (e.key === "Escape") setEditingField(null); }}
          />
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveEditField}>
            <Check className="w-3 h-3 text-green-400" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingField(null)}>
            <X className="w-3 h-3 text-red-400" />
          </Button>
        </div>
      );
    }
    return (
      <div
        className="flex items-center gap-2 group cursor-pointer hover:bg-white/5 rounded px-1 py-0.5 -mx-1"
        onClick={() => startEditField(field, value || "")}
      >
        <span className="text-xs text-white/50 w-24">{label}</span>
        <span className={`text-sm ${value ? "text-white/90" : "text-white/30 italic"}`}>
          {value || "Not set"}
        </span>
        <Pencil className="w-3 h-3 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: "linear-gradient(180deg, #737373 0%, #8a8a8a 30%, #9a8a85 60%, #b48f8f 100%)",
      }}
    >
      {/* Sparkle overlay */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/20 animate-pulse"
            style={{
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 sticky top-0 backdrop-blur-md bg-black/20 border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} className="text-white/80 hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#b48f8f]" />
              {brandInfo?.brand_name || "My Brand Kit"}
            </h1>
            <p className="text-xs text-white/50">Private — Admin only</p>
          </div>
        </div>
        <Button onClick={copyAllColors} size="sm" className="bg-[#b48f8f] hover:bg-[#a07878] text-white border-0">
          <Copy className="w-4 h-4 mr-1" /> Copy All Colors
        </Button>
      </div>

      <div className="relative z-10 p-4 max-w-[1400px] mx-auto space-y-6">
        {/* Brand Info */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/15 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-white/90 text-sm uppercase tracking-widest flex items-center gap-2">
              <Type className="w-4 h-4 text-[#adb2c6]" /> Brand Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {renderInfoField("Brand Name", "brand_name", brandInfo?.brand_name)}
            {renderInfoField("Tagline", "tagline", brandInfo?.tagline)}
            {renderInfoField("Heading Font", "heading_font", brandInfo?.heading_font)}
            {renderInfoField("Subheading", "subheading_font", brandInfo?.subheading_font)}
            {renderInfoField("Body Font", "body_font", brandInfo?.body_font)}
            {renderInfoField("Notes", "notes", brandInfo?.notes)}
          </CardContent>
        </Card>

        {/* Color Palette */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/15 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-white/90 text-sm uppercase tracking-widest flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#b48f8f]" /> Color Palette
              <span className="text-xs text-white/40 font-normal ml-auto">{colors.length} colors</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {colors.map((c) => {
                const isEditing = editingColor === c.id;
                const light = isLightColor(c.color_hex);

                if (isEditing) {
                  return (
                    <div key={c.id} className="space-y-1 p-2 rounded-lg bg-white/10">
                      <input
                        type="color"
                        value={editHex}
                        onChange={(e) => setEditHex(e.target.value)}
                        className="w-full h-14 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={editHex}
                        onChange={(e) => setEditHex(e.target.value)}
                        className="h-6 text-[10px] bg-white/10 border-white/20 text-white font-mono"
                      />
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Name"
                        className="h-6 text-[10px] bg-white/10 border-white/20 text-white"
                      />
                      <div className="flex gap-1">
                        <Button size="icon" className="h-5 w-5 bg-green-600/80" onClick={saveEditColor}>
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button size="icon" className="h-5 w-5 bg-red-600/80" onClick={() => setEditingColor(null)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={c.id} className="group relative">
                    <div
                      className="aspect-square rounded-lg cursor-pointer transition-all hover:scale-105 hover:shadow-lg relative"
                      style={{
                        background: c.color_hex,
                        border: light ? "2px solid rgba(0,0,0,0.15)" : "2px solid rgba(255,255,255,0.15)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)",
                      }}
                      onClick={() => copyHex(c.color_hex, c.id)}
                    >
                      {copiedId === c.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      )}
                      {/* Hover actions */}
                      <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="w-5 h-5 rounded bg-black/50 flex items-center justify-center"
                          onClick={(e) => { e.stopPropagation(); startEditColor(c); }}
                        >
                          <Pencil className="w-2.5 h-2.5 text-white" />
                        </button>
                        <button
                          className="w-5 h-5 rounded bg-red-600/70 flex items-center justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteColor.mutate(c.id, { onSuccess: () => toast({ description: "Color removed" }) });
                          }}
                        >
                          <Trash2 className="w-2.5 h-2.5 text-white" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] font-mono text-white/60 text-center mt-1">{c.color_hex}</p>
                    {c.color_name && (
                      <p className="text-[9px] text-white/40 text-center truncate">{c.color_name}</p>
                    )}
                  </div>
                );
              })}

              {/* Add new color */}
              <div className="space-y-1">
                <div
                  className="aspect-square rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-white/40 transition-colors"
                  onClick={() => document.getElementById("new-color-picker")?.click()}
                  style={{ background: newHex.length >= 4 ? newHex : "transparent" }}
                >
                  <Plus className="w-6 h-6 text-white/40" />
                  <input
                    id="new-color-picker"
                    type="color"
                    value={newHex.length >= 7 ? newHex : "#b48f8f"}
                    onChange={(e) => setNewHex(e.target.value)}
                    className="sr-only"
                  />
                </div>
                <Input
                  value={newHex}
                  onChange={(e) => setNewHex(e.target.value)}
                  placeholder="#hex"
                  className="h-6 text-[10px] bg-white/10 border-white/20 text-white font-mono"
                />
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Name"
                  className="h-6 text-[10px] bg-white/10 border-white/20 text-white"
                />
                <Button size="sm" className="w-full h-5 text-[10px] bg-[#b48f8f] hover:bg-[#a07878] text-white" onClick={handleAddColor}>
                  Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Typography Preview */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/15 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-white/90 text-sm uppercase tracking-widest flex items-center gap-2">
              <Type className="w-4 h-4 text-[#e5e7eb]" /> Typography Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-white rounded-lg p-6 space-y-3">
              <h2 className="text-3xl font-serif text-gray-900">Heading</h2>
              <h3 className="text-xl font-medium text-gray-700">Subheading</h3>
              <p className="text-base text-gray-600">Body text goes here. Aa Bb Cc Dd Ee Ff Gg</p>
              <div className="flex gap-2 mt-4">
                {colors.slice(0, 6).map((c) => (
                  <div key={c.id} className="flex-1 h-2 rounded-full" style={{ background: c.color_hex }} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Moodboard */}
        <BrandMoodboard />

        {/* Design Elements - Color Rows */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/15 shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-white/90 text-sm uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#c3a5a5]" /> Design Elements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Color bar rows */}
            <div className="space-y-2">
              <p className="text-xs text-white/40">Color combinations</p>
              <div className="flex gap-1 rounded-lg overflow-hidden h-10">
                {colors.map((c) => (
                  <div key={c.id} className="flex-1" style={{ background: c.color_hex }} />
                ))}
              </div>
              <div className="flex gap-1 rounded-lg overflow-hidden h-6">
                {[...colors].reverse().map((c) => (
                  <div key={c.id} className="flex-1" style={{ background: c.color_hex }} />
                ))}
              </div>
            </div>

            {/* Hex list */}
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-xs text-white/40 mb-2">All hex codes</p>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <span
                    key={c.id}
                    className="text-xs font-mono px-2 py-1 rounded cursor-pointer hover:scale-105 transition-transform"
                    style={{
                      background: c.color_hex,
                      color: isLightColor(c.color_hex) ? "#333" : "#fff",
                      border: isLightColor(c.color_hex) ? "1px solid rgba(0,0,0,0.15)" : "1px solid rgba(255,255,255,0.15)",
                    }}
                    onClick={() => copyHex(c.color_hex, c.id)}
                  >
                    {c.color_hex}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyBrand;
