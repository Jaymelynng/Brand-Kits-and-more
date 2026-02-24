import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit3, Shield, Key, Trash2, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useGyms, useDeleteGym } from "@/hooks/useGyms";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AdminToolkitProps {
  isOpen: boolean;
  onClose: () => void;
  editMode: boolean;
  onToggleEditMode: () => void;
  onAddNewGym: () => void;
}

export const AdminToolkit = ({ 
  isOpen, 
  onClose, 
  editMode, 
  onToggleEditMode,
  onAddNewGym 
}: AdminToolkitProps) => {
  const { toast } = useToast();
  const { data: gyms = [] } = useGyms();
  const deleteGymMutation = useDeleteGym();
  const [grantingAdmin, setGrantingAdmin] = useState(false);

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [changingPin, setChangingPin] = useState(false);

  const [gymToDelete, setGymToDelete] = useState<{ id: string; name: string; code: string } | null>(null);

  const handleGrantAdmin = async () => {
    setGrantingAdmin(true);
    try {
      const { error } = await supabase.rpc('make_me_admin');
      if (error) throw error;
      
      toast({
        title: "Admin Access Granted!",
        description: "Please refresh the page to apply changes.",
      });
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Failed to Grant Admin",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGrantingAdmin(false);
    }
  };

  const handleChangePin = async () => {
    if (newPin !== confirmPin) {
      toast({ title: "PINs don't match", description: "New PIN and confirmation must match.", variant: "destructive" });
      return;
    }
    if (!/^\d{4}$/.test(newPin)) {
      toast({ title: "Invalid PIN", description: "PIN must be exactly 4 digits.", variant: "destructive" });
      return;
    }
    if (!currentPin) {
      toast({ title: "Current PIN required", description: "Enter your current PIN to verify.", variant: "destructive" });
      return;
    }

    setChangingPin(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-pin', {
        body: { currentPin, newPin },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "Failed", description: data.error, variant: "destructive" });
        return;
      }

      toast({ title: "PIN Updated!", description: "Your admin PIN has been changed." });
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (error: any) {
      toast({
        title: "Failed to Change PIN",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setChangingPin(false);
    }
  };

  const handleDeleteGym = async () => {
    if (!gymToDelete) return;

    deleteGymMutation.mutate(gymToDelete.id, {
      onSuccess: () => {
        toast({ title: "Gym Deleted", description: `${gymToDelete.name} (${gymToDelete.code}) has been removed.` });
        setGymToDelete(null);
      },
      onError: (error: any) => {
        toast({ title: "Failed to Delete", description: error.message, variant: "destructive" });
        setGymToDelete(null);
      },
    });
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle 
              className="text-2xl font-bold"
              style={{ color: 'hsl(var(--brand-rose-gold))' }}
            >
              Admin Toolkit
            </SheetTitle>
            <SheetDescription>
              Manage your app, gyms, and admin settings
            </SheetDescription>
          </SheetHeader>

          <div className="mt-8 space-y-6">
            {/* Change PIN Section */}
            <div className="p-4 border rounded-lg" style={{ borderColor: 'hsl(var(--brand-rose-gold) / 0.3)' }}>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Key className="w-5 h-5" style={{ color: 'hsl(var(--brand-rose-gold))' }} />
                Change PIN
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Update your 4-digit admin login PIN
              </p>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="currentPin" className="text-xs">Current PIN</Label>
                  <Input
                    id="currentPin"
                    type="password"
                    maxLength={4}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    placeholder="****"
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="font-mono tracking-widest text-center"
                  />
                </div>
                <div>
                  <Label htmlFor="newPin" className="text-xs">New PIN</Label>
                  <Input
                    id="newPin"
                    type="password"
                    maxLength={4}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    placeholder="****"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="font-mono tracking-widest text-center"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPin" className="text-xs">Confirm New PIN</Label>
                  <Input
                    id="confirmPin"
                    type="password"
                    maxLength={4}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    placeholder="****"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="font-mono tracking-widest text-center"
                  />
                </div>
                <Button 
                  onClick={handleChangePin}
                  disabled={changingPin || !currentPin || !newPin || !confirmPin}
                  className="w-full"
                  style={{ background: 'hsl(var(--brand-rose-gold))', color: 'white' }}
                >
                  {changingPin ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</> : "Update PIN"}
                </Button>
              </div>
            </div>

            {/* Add New Gym Section */}
            <div className="p-4 border rounded-lg" style={{ borderColor: 'hsl(var(--brand-rose-gold) / 0.3)' }}>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <PlusCircle className="w-5 h-5" style={{ color: 'hsl(var(--brand-rose-gold))' }} />
                Add New Gym
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a new gym entry with name, code, and brand colors
              </p>
              <Button 
                onClick={() => {
                  onAddNewGym();
                  onClose();
                }}
                className="w-full"
                style={{ background: 'hsl(var(--brand-rose-gold))', color: 'white' }}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Gym
              </Button>
            </div>

            {/* Delete Gym Section */}
            <div className="p-4 border rounded-lg" style={{ borderColor: 'hsl(var(--brand-rose-gold) / 0.3)' }}>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Trash2 className="w-5 h-5" style={{ color: 'hsl(var(--brand-rose-gold))' }} />
                Delete Gym
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Permanently remove a gym and all its logos, colors, and elements
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {gyms.map((gym) => (
                  <div key={gym.id} className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50">
                    <div>
                      <span className="font-medium text-sm">{gym.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">({gym.code})</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700 h-7 px-2"
                      onClick={() => setGymToDelete({ id: gym.id, name: gym.name, code: gym.code })}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Edit Mode Section */}
            <div className="p-4 border rounded-lg" style={{ borderColor: 'hsl(var(--brand-rose-gold) / 0.3)' }}>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Edit3 className="w-5 h-5" style={{ color: 'hsl(var(--brand-rose-gold))' }} />
                Edit Mode
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Enable editing of existing gym colors and logos
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {editMode ? 'Edit Mode Active' : 'Edit Mode Inactive'}
                </span>
                <Switch 
                  checked={editMode} 
                  onCheckedChange={onToggleEditMode}
                />
              </div>
              {editMode && (
                <p className="text-xs text-muted-foreground mt-2">
                  Gym cards now have orange borders and can be edited
                </p>
              )}
            </div>

            {/* Grant Admin Access Section */}
            <div className="p-4 border rounded-lg" style={{ borderColor: 'hsl(var(--brand-rose-gold) / 0.3)' }}>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5" style={{ color: 'hsl(var(--brand-rose-gold))' }} />
                Grant Admin Access
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Grant yourself admin privileges to upload logos and manage gyms
              </p>
              <Button 
                onClick={handleGrantAdmin}
                disabled={grantingAdmin}
                className="w-full"
                style={{ background: 'hsl(var(--brand-rose-gold))', color: 'white' }}
              >
                {grantingAdmin ? "Granting..." : "Grant Admin Access"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!gymToDelete} onOpenChange={(open) => !open && setGymToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {gymToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{gymToDelete?.name} ({gymToDelete?.code})</strong> and ALL of its logos, colors, and brand elements. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGym}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
