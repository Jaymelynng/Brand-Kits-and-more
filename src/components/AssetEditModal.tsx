import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { CampaignAsset } from "@/hooks/useCampaignAssets";
import { Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface AssetEditModalProps {
  asset: CampaignAsset;
  gyms: Array<{ id: string; code: string; name: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssetEditModal({ asset, gyms, open, onOpenChange }: AssetEditModalProps) {
  const [filename, setFilename] = useState(asset.filename);
  const [gymId, setGymId] = useState<string | null>(asset.gym_id);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const queryClient = useQueryClient();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('campaign_assets')
        .update({
          gym_id: gymId === 'admin' ? null : gymId,
          filename: filename,
        })
        .eq('id', asset.id);

      if (error) throw error;

      toast.success('Asset updated successfully');
      queryClient.invalidateQueries({ queryKey: ['campaign-assets'] });
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating asset:', error);
      toast.error('Failed to update asset');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      // Extract filename from URL
      const urlParts = asset.file_url.split('/');
      const storageFilename = urlParts[urlParts.length - 1];

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('campaign-assets')
        .remove([storageFilename]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('campaign_assets')
        .delete()
        .eq('id', asset.id);

      if (dbError) throw dbError;

      toast.success('Asset deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['campaign-assets'] });
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast.error('Failed to delete asset');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="filename">Filename</Label>
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="Enter filename"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gym">Assigned Gym</Label>
              <Select
                value={gymId || 'admin'}
                onValueChange={(value) => setGymId(value === 'admin' ? null : value)}
              >
                <SelectTrigger id="gym">
                  <SelectValue placeholder="Select gym" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin Resource (No Gym)</SelectItem>
                  {gyms.map((gym) => (
                    <SelectItem key={gym.id} value={gym.id}>
                      {gym.name} ({gym.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Asset
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{asset.filename}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
