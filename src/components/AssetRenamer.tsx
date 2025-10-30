import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { parseFilename, validateFilename } from "@/lib/assetNaming";

interface AssetToRename {
  id: string;
  currentFilename: string;
  fileUrl: string;
  aiSuggestion?: string;
  userEdited?: string;
  status: 'pending' | 'analyzing' | 'ready' | 'error';
  analysis?: any;
}

interface AssetRenamerProps {
  open: boolean;
  onClose: () => void;
  assets: Array<{
    id: string;
    filename: string;
    file_url: string;
  }>;
  gymCode: string;
  gymName: string;
  onRenameComplete: () => void;
}

export function AssetRenamer({ 
  open, 
  onClose, 
  assets, 
  gymCode, 
  gymName,
  onRenameComplete 
}: AssetRenamerProps) {
  const [renameList, setRenameList] = useState<AssetToRename[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  // Initialize rename list when dialog opens
  useState(() => {
    if (open && assets.length > 0) {
      setRenameList(assets.map(asset => ({
        id: asset.id,
        currentFilename: asset.filename,
        fileUrl: asset.file_url,
        userEdited: asset.filename,
        status: 'pending' as const,
      })));
    }
  });

  const analyzeWithAI = async () => {
    setIsAnalyzing(true);
    
    try {
      const results = await Promise.all(
        assets.map(async (asset) => {
          try {
            const { data, error } = await supabase.functions.invoke('analyze-image', {
              body: {
                imageUrl: asset.file_url,
                gymCode,
                gymName,
                currentFilename: asset.filename,
              }
            });

            if (error) throw error;

            return {
              id: asset.id,
              currentFilename: asset.filename,
              fileUrl: asset.file_url,
              aiSuggestion: data.suggestedName,
              userEdited: data.suggestedName,
              status: 'ready' as const,
              analysis: data.analysis,
            };
          } catch (err) {
            console.error(`Failed to analyze ${asset.filename}:`, err);
            return {
              id: asset.id,
              currentFilename: asset.filename,
              fileUrl: asset.file_url,
              userEdited: asset.filename,
              status: 'error' as const,
            };
          }
        })
      );

      setRenameList(results);
      
      const successCount = results.filter(r => r.status === 'ready').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      
      if (successCount > 0) {
        toast.success(`AI analyzed ${successCount} asset${successCount > 1 ? 's' : ''}`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to analyze ${errorCount} asset${errorCount > 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error('Batch analysis error:', error);
      toast.error('AI analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateFilename = (id: string, newName: string) => {
    setRenameList(prev => prev.map(item => 
      item.id === id ? { ...item, userEdited: newName } : item
    ));
  };

  const applyRenames = async () => {
    setIsRenaming(true);
    
    try {
      const updates = renameList.map(async (item) => {
        if (item.userEdited === item.currentFilename) return null;

        const { error } = await supabase
          .from('gym_logos')
          .update({ filename: item.userEdited })
          .eq('id', item.id);

        if (error) throw error;
        return item.id;
      });

      const results = await Promise.all(updates);
      const successCount = results.filter(r => r !== null).length;
      
      toast.success(`Renamed ${successCount} asset${successCount > 1 ? 's' : ''}`);
      onRenameComplete();
      onClose();
    } catch (error) {
      console.error('Rename error:', error);
      toast.error('Failed to rename assets');
    } finally {
      setIsRenaming(false);
    }
  };

  const hasChanges = renameList.some(item => item.userEdited !== item.currentFilename);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Rename Assets
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {renameList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No assets selected
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b pb-4">
                <div className="text-sm text-muted-foreground">
                  {renameList.length} asset{renameList.length > 1 ? 's' : ''} selected
                </div>
                <Button 
                  onClick={analyzeWithAI} 
                  disabled={isAnalyzing}
                  variant="outline"
                  size="sm"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      AI Suggest Names
                    </>
                  )}
                </Button>
              </div>

              <div className="grid gap-4">
                {renameList.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start gap-4">
                      <img 
                        src={item.fileUrl} 
                        alt={item.currentFilename}
                        className="w-20 h-20 object-contain rounded border"
                      />
                      <div className="flex-1 space-y-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Current Name</Label>
                          <div className="text-sm font-mono">{item.currentFilename}</div>
                        </div>

                        {item.aiSuggestion && (
                          <div>
                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              AI Suggestion
                            </Label>
                            <div className="text-sm font-mono text-primary">{item.aiSuggestion}</div>
                          </div>
                        )}

                        <div>
                          <Label className="text-xs text-muted-foreground">New Name</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              value={item.userEdited || ''}
                              onChange={(e) => updateFilename(item.id, e.target.value)}
                              className="font-mono text-sm"
                              placeholder="Enter filename..."
                            />
                            {validateFilename(item.userEdited || '') ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <X className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={applyRenames} 
            disabled={!hasChanges || isRenaming}
          >
            {isRenaming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Renaming...
              </>
            ) : (
              <>Apply Changes</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
