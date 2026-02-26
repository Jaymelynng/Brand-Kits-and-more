import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PlusCircle, Edit3, Shield } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

  const handleGrantAdmin = async () => {
    toast({
      title: "Admin Access",
      description: "Admin privileges are managed via PIN authentication. Please contact the system administrator.",
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle 
            className="text-2xl font-bold"
            style={{ color: 'hsl(var(--brand-rose-gold))' }}
          >
            Admin Toolkit
          </SheetTitle>
          <SheetDescription>
            Manage gyms and edit existing entries
          </SheetDescription>
        </SheetHeader>

        <div className="mt-8 space-y-6">
          {/* Grant Admin Access Section */}
          <div className="p-4 border rounded-lg" style={{ borderColor: 'hsl(var(--brand-rose-gold) / 0.3)' }}>
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Shield className="w-5 h-5" style={{ color: 'hsl(var(--brand-rose-gold))' }} />
              Grant Admin Access
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Admin privileges are managed via PIN authentication
            </p>
            <Button 
              onClick={handleGrantAdmin}
              className="w-full"
              style={{ 
                background: 'hsl(var(--brand-rose-gold))',
                color: 'white'
              }}
            >
              Contact Administrator
            </Button>
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
              style={{ 
                background: 'hsl(var(--brand-rose-gold))',
                color: 'white'
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Gym
            </Button>
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
        </div>
      </SheetContent>
    </Sheet>
  );
};
