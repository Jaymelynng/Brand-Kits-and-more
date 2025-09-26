import { useState, useRef } from "react";
import { useGyms } from "@/hooks/useGyms";
import { GymNavigation } from "@/components/GymNavigation";
import { GymCard } from "@/components/GymCard";
import { AddGymModal } from "@/components/AddGymModal";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { data: gyms = [], isLoading, error } = useGyms();
  const [editMode, setEditMode] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { toast } = useToast();

  const scrollToGym = (gymCode: string) => {
    const gymElement = document.getElementById(`gym-${gymCode}`);
    if (gymElement) {
      gymElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
      
      // Add highlight effect
      gymElement.style.boxShadow = '0 0 20px rgba(196, 164, 164, 0.8)';
      setTimeout(() => {
        gymElement.style.boxShadow = '';
      }, 2000);
    }
  };

  const copyAllGyms = () => {
    let allText = 'GYM BRAND COLORS DATABASE\n\n';
    
    gyms.forEach(gym => {
      allText += `${gym.name} (${gym.code}):\n`;
      allText += gym.colors.map(color => color.color_hex).join('\n') + '\n\n';
    });
    
    navigator.clipboard.writeText(allText).then(() => {
      toast({
        description: 'All Gym Colors Copied!',
        duration: 2000,
      });
    });
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
  };

  const handleCopySelected = () => {
    // This will be handled by the GymNavigation component
    console.log('Copy selected gyms');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading gym data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-300 text-xl">Error loading gym data</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Animated Background */}
      <div className="gym-background">
        <div className="sparkle"></div>
        <div className="sparkle"></div>
        <div className="sparkle"></div>
        <div className="sparkle"></div>
        <div className="sparkle"></div>
      </div>

      {/* Navigation */}
      <GymNavigation 
        gyms={gyms} 
        onScrollToGym={scrollToGym}
        onCopySelected={handleCopySelected}
      />

      {/* Main Content */}
      <div className="pt-32 pb-16">
        <div className="container mx-auto px-6">
          {/* Header Controls */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-green-500/90 hover:bg-green-600 text-white shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Gym
              </Button>
              <Button
                onClick={toggleEditMode}
                variant={editMode ? "default" : "outline"}
                className={`edit-mode-btn ${editMode ? 'bg-blue-500 text-white' : 'bg-white/10 border-white/30 text-white hover:bg-white/20'}`}
              >
                <Edit className="w-4 h-4 mr-2" />
                {editMode ? 'Exit Edit Mode' : 'Edit Mode'}
              </Button>
            </div>

            <Button
              onClick={copyAllGyms}
              className="bg-purple-500/90 hover:bg-purple-600 text-white shadow-lg"
            >
              <Download className="w-4 h-4 mr-2" />
              Copy All Gyms
            </Button>
          </div>

          {/* Gym Grid */}
          <div className="gym-grid grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {gyms.map((gym) => (
              <GymCard 
                key={gym.id} 
                gym={gym} 
                editMode={editMode}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="footer mt-16 text-center">
            <p className="text-white/80 text-sm leading-relaxed max-w-4xl mx-auto">
              Click gym buttons in the dashboard to jump to each gym • Use sparkling diamonds to select specific gyms for copying • Copy individual colors, single gyms, selected groups, or all at once • Click main logo area or upload section to add logos • Click any uploaded logo to set it as the main display logo • Edit mode allows you to modify colors and add new gyms
            </p>
          </div>
        </div>
      </div>

      {/* Add Gym Modal */}
      <AddGymModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};

export default Index;
