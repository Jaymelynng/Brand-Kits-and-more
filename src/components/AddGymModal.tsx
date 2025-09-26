import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useAddGym } from "@/hooks/useGyms";
import { X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddGymModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ColorInput {
  id: number;
  colorValue: string;
  textValue: string;
}

export const AddGymModal = ({ isOpen, onClose }: AddGymModalProps) => {
  const [gymName, setGymName] = useState("");
  const [gymCode, setGymCode] = useState("");
  const [colorInputs, setColorInputs] = useState<ColorInput[]>([
    { id: 1, colorValue: "#A4B4C4", textValue: "#A4B4C4" }
  ]);
  
  const addGymMutation = useAddGym();
  const { toast } = useToast();

  const addColorInput = () => {
    const newId = Math.max(...colorInputs.map(c => c.id)) + 1;
    setColorInputs(prev => [...prev, { 
      id: newId, 
      colorValue: "#A4B4C4", 
      textValue: "#A4B4C4" 
    }]);
  };

  const removeColorInput = (id: number) => {
    if (colorInputs.length > 1) {
      setColorInputs(prev => prev.filter(c => c.id !== id));
    }
  };

  const updateColorInput = (id: number, field: 'colorValue' | 'textValue', value: string) => {
    setColorInputs(prev => prev.map(color => {
      if (color.id === id) {
        const updated = { ...color, [field]: value };
        // Sync color picker with text input
        if (field === 'colorValue') {
          updated.textValue = value;
        } else if (field === 'textValue' && value.match(/^#[0-9A-Fa-f]{6}$/)) {
          updated.colorValue = value;
        }
        return updated;
      }
      return color;
    }));
  };

  const handleSubmit = async () => {
    if (!gymName.trim() || !gymCode.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const colors = colorInputs.map(input => input.textValue || input.colorValue);

    try {
      await addGymMutation.mutateAsync({
        name: gymName.trim(),
        code: gymCode.trim().toUpperCase(),
        colors,
      });

      toast({
        title: "Success",
        description: `${gymCode.toUpperCase()} gym added successfully!`,
      });

      // Reset form
      setGymName("");
      setGymCode("");
      setColorInputs([{ id: 1, colorValue: "#A4B4C4", textValue: "#A4B4C4" }]);
      onClose();
    } catch (error) {
      console.error('Error adding gym:', error);
      toast({
        title: "Error",
        description: "Failed to add gym. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setGymName("");
    setGymCode("");
    setColorInputs([{ id: 1, colorValue: "#A4B4C4", textValue: "#A4B4C4" }]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Add New Gym</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="gymName" className="text-sm font-medium">
              Gym Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="gymName"
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              placeholder="Enter gym name"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gymCode" className="text-sm font-medium">
              Gym Code <span className="text-red-500">*</span>
            </Label>
            <Input
              id="gymCode"
              value={gymCode}
              onChange={(e) => setGymCode(e.target.value.toUpperCase())}
              placeholder="Enter 3-5 letter code"
              maxLength={5}
              className="w-full uppercase"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Brand Colors:</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addColorInput}
                className="add-color-btn flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Color
              </Button>
            </div>

            <div className="space-y-3">
              {colorInputs.map((colorInput) => (
                <div key={colorInput.id} className="color-input-group flex items-center gap-3">
                  <input
                    type="color"
                    value={colorInput.colorValue}
                    onChange={(e) => updateColorInput(colorInput.id, 'colorValue', e.target.value)}
                    className="w-12 h-10 rounded-md border border-gray-300 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={colorInput.textValue}
                    onChange={(e) => updateColorInput(colorInput.id, 'textValue', e.target.value)}
                    placeholder="#A4B4C4"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    className="flex-1 font-mono"
                  />
                  {colorInputs.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeColorInput(colorInput.id)}
                      className="remove-color-btn text-red-500 hover:bg-red-50 px-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={addGymMutation.isPending}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              {addGymMutation.isPending ? 'Adding...' : 'Add Gym'}
            </Button>
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};