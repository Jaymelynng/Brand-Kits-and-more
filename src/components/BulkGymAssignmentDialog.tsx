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
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const handleAssign = async () => {
    if (!selectedGymId || selectedAssets.size === 0) return;

    setIsProcessing(true);
    try {
      const gymId = selectedGymId === 'admin' ? null : selectedGymId;
      
      const { error } = await supabase
        .from('campaign_assets')
        .update({ gym_id: gymId })
        .in('id', Array.from(selectedAssets));

      if (error) throw error;

      const gymName = selectedGymId === 'admin' 
        ? 'Admin Resources'
        : gyms?.find(g => g.id === selectedGymId)?.name || 'Unknown';

      toast.success(`${selectedAssets.size} assets assigned to ${gymName}`);
      queryClient.invalidateQueries({ queryKey: ['campaign-assets'] });
      onSuccess();
      onOpenChange(false);
      setSelectedGymId(null);
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
      setSelectedGymId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Assets to Gym</DialogTitle>
          <DialogDescription>
            Select which gym to assign these {selectedAssets.size} asset{selectedAssets.size !== 1 ? 's' : ''} to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
          {/* Admin Resources Option */}
          <div
            className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer hover:bg-accent ${
              selectedGymId === 'admin' 
                ? 'border-primary bg-primary/5' 
                : 'border-border'
            }`}
            onClick={() => setSelectedGymId('admin')}
          >
            <Checkbox 
              checked={selectedGymId === 'admin'}
              onCheckedChange={(checked) => setSelectedGymId(checked ? 'admin' : null)}
            />
            <div className="flex-1">
              <div className="font-medium">Admin Resources</div>
              <div className="text-sm text-muted-foreground">Not assigned to any specific gym</div>
            </div>
          </div>

          {/* Gym Options */}
          {gyms?.map((gym) => (
            <div
              key={gym.id}
              className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all cursor-pointer hover:bg-accent ${
                selectedGymId === gym.id 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border'
              }`}
              onClick={() => setSelectedGymId(gym.id)}
            >
              <Checkbox 
                checked={selectedGymId === gym.id}
                onCheckedChange={(checked) => setSelectedGymId(checked ? gym.id : null)}
              />
              <div className="flex-1">
                <div className="font-medium">{gym.name}</div>
                <div className="text-sm text-muted-foreground">{gym.code}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {selectedAssets.size} asset{selectedAssets.size !== 1 ? 's' : ''} selected
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
              disabled={!selectedGymId || isProcessing}
            >
              <Tag className="h-4 w-4 mr-2" />
              {isProcessing ? 'Assigning...' : `Assign All (${selectedAssets.size})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
