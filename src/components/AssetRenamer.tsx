import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface AssetRenamerProps {
  open: boolean;
  onClose: () => void;
  assets: { id: string; filename: string; file_url: string }[];
  gymCode: string;
  gymName: string;
  onRenameComplete: () => void;
}

export const AssetRenamer = ({ open, onClose, assets, gymCode, gymName, onRenameComplete }: AssetRenamerProps) => {
  const [prefix, setPrefix] = useState(gymCode);
  const [isRenaming, setIsRenaming] = useState(false);
  const queryClient = useQueryClient();

  const handleRename = async () => {
    setIsRenaming(true);
    try {
      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        const ext = asset.filename.split('.').pop();
        const newName = `${prefix}_logo_${i + 1}.${ext}`;
        await supabase.from('gym_logos').update({ filename: newName }).eq('id', asset.id);
      }
      queryClient.invalidateQueries({ queryKey: ['gyms'] });
      onRenameComplete();
    } catch (error) {
      console.error('Rename failed:', error);
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename {assets.length} Asset(s)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="Prefix" />
          <p className="text-sm text-muted-foreground">
            Files will be renamed: {prefix}_logo_1, {prefix}_logo_2, etc.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleRename} disabled={isRenaming} className="flex-1">
              {isRenaming ? 'Renaming...' : 'Rename'}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
