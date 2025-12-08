import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CampaignAsset } from "@/hooks/useCampaignAssets";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tag } from "lucide-react";

interface Gym {
  id: string;
  code: string;
  name: string;
}

interface BulkGymAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAssets: Set<string>;
  gyms: Gym[] | undefined;
  onSuccess: () => void;
}

export function BulkGymAssignmentDialog({
  open,
  onOpenChange,
  selectedAssets,
  gyms,
  onSuccess,
}: BulkGymAssignmentDialogProps) {
  const [assetGymMap, setAssetGymMap] = useState<Map<string, string | null>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const toggleGymForAllAssets = (gymId: string | null) => {
    const newMap = new Map(assetGymMap);
    const allAssignedToThisGym = Array.from(selectedAssets).every(
      assetId => assetGymMap.get(assetId) === gymId
    );

    if (allAssignedToThisGym) {
      // Unassign all
      Array.from(selectedAssets).forEach(assetId => newMap.delete(assetId));
    } else {
      // Assign all to this gym
      Array.from(selectedAssets).forEach(assetId => newMap.set(assetId, gymId));
    }
    setAssetGymMap(newMap);
  };

  const getGymAssignmentCount = (gymId: string | null) => {
    return Array.from(selectedAssets).filter(
      assetId => assetGymMap.get(assetId) === gymId
    ).length;
  };

  const isGymFullySelected = (gymId: string | null) => {
    return Array.from(selectedAssets).every(
      assetId => assetGymMap.get(assetId) === gymId
    );
  };

  const isGymPartiallySelected = (gymId: string | null) => {
    const count = getGymAssignmentCount(gymId);
    return count > 0 && count < selectedAssets.size;
  };

  const handleAssign = async () => {
    if (assetGymMap.size === 0 || selectedAssets.size === 0) return;

    setIsProcessing(true);
    try {
      // Group assets by gym for efficient updates
      const gymGroups = new Map<string | null, string[]>();
      assetGymMap.forEach((gymId, assetId) => {
        if (!gymGroups.has(gymId)) {
          gymGroups.set(gymId, []);
        }
        gymGroups.get(gymId)!.push(assetId);
      });

      // Execute all updates
      const updates = Array.from(gymGroups.entries()).map(([gymId, assetIds]) => {
        return supabase
          .from('campaign_assets')
          .update({ gym_id: gymId })
          .in('id', assetIds);
      });

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) throw errors[0].error;

      toast.success(`${assetGymMap.size} assets assigned to gyms`);
      queryClient.invalidateQueries({ queryKey: ['campaign-assets'] });
      onSuccess();
      onOpenChange(false);
      setAssetGymMap(new Map());
    } catch (error) {
      console.error('Error bulk assigning:', error);
      toast.error('Failed to assign assets');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      onOpenChange(false);
      setAssetGymMap(new Map());
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Assign Assets to Gyms</DialogTitle>
          <DialogDescription>
            Click a gym to assign ALL {selectedAssets.size} selected asset{selectedAssets.size !== 1 ? 's' : ''} to it. Click multiple gyms to assign different sets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4 max-h-[500px] overflow-y-auto">
          {/* Admin Resources Option */}
          <div
            className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer hover:bg-accent ${
              isGymFullySelected('admin')
                ? 'border-primary bg-primary/5' 
                : isGymPartiallySelected('admin')
                ? 'border-primary/50 bg-primary/5'
                : 'border-border'
            }`}
            onClick={() => toggleGymForAllAssets('admin')}
          >
            <Checkbox 
              checked={isGymFullySelected('admin')}
              className={isGymPartiallySelected('admin') ? 'data-[state=checked]:bg-primary/50' : ''}
              onCheckedChange={(checked) => toggleGymForAllAssets('admin')}
            />
            <div className="flex-1">
              <div className="font-medium flex items-center gap-2">
                Unassigned
                {getGymAssignmentCount('admin') > 0 && (
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    {getGymAssignmentCount('admin')}
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">Not assigned to any specific gym</div>
            </div>
          </div>

          {/* Gym Options */}
          {gyms?.map((gym) => (
            <div
              key={gym.id}
              className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer hover:bg-accent ${
                isGymFullySelected(gym.id)
                  ? 'border-primary bg-primary/5' 
                  : isGymPartiallySelected(gym.id)
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border'
              }`}
              onClick={() => toggleGymForAllAssets(gym.id)}
            >
              <Checkbox 
                checked={isGymFullySelected(gym.id)}
                className={isGymPartiallySelected(gym.id) ? 'data-[state=checked]:bg-primary/50' : ''}
                onCheckedChange={(checked) => toggleGymForAllAssets(gym.id)}
              />
              <div className="flex-1">
                <div className="font-medium flex items-center gap-2">
                  {gym.name}
                  {getGymAssignmentCount(gym.id) > 0 && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                      {getGymAssignmentCount(gym.id)}
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{gym.code}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {assetGymMap.size} of {selectedAssets.size} asset{selectedAssets.size !== 1 ? 's' : ''} assigned
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={assetGymMap.size === 0 || isProcessing}
            >
              <Tag className="h-4 w-4 mr-2" />
              {isProcessing ? 'Saving...' : `Save Assignments (${assetGymMap.size})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
