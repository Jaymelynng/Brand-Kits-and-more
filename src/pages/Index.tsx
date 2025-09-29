import { useState, useEffect } from "react";
import { useGyms } from "@/hooks/useGyms";
import { GymNavigation } from "@/components/GymNavigation";
import { GymCard } from "@/components/GymCard";
import { AddGymModal } from "@/components/AddGymModal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronUp, Edit3, Plus } from "lucide-react";

const Index = () => {
  const { data: gyms = [], isLoading, error } = useGyms();
  const [editMode, setEditMode] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedGyms, setSelectedGyms] = useState<Set<string>>(new Set());
  const [showBackToTop, setShowBackToTop] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize with all gyms selected for perfect 10/10 state
    setSelectedGyms(new Set(gyms.map(gym => gym.code)));
  }, [gyms.length]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setShowBackToTop(scrollTop > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleGymSelection = (gymCode: string) => {
    setSelectedGyms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gymCode)) {
        newSet.delete(gymCode);
      } else {
        newSet.add(gymCode);
      }
      return newSet;
    });
  };

  const selectAllGyms = () => {
    setSelectedGyms(new Set(gyms.map(gym => gym.code)));
  };

  const deselectAllGyms = () => {
    setSelectedGyms(new Set());
  };

  const scrollToGym = (gymCode: string) => {
    const gymElement = document.getElementById(`gym-${gymCode}`);
    if (gymElement) {
      gymElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
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

  const handleCopySelected = () => {
    const selectedGymsList = gyms.filter(gym => selectedGyms.has(gym.code));
    if (selectedGymsList.length === 0) {
      toast({
        description: 'No gyms selected!',
        variant: 'destructive',
        duration: 2000,
      });
      return;
    }

    let selectedText = 'SELECTED GYM BRAND COLORS\n\n';
    selectedGymsList.forEach(gym => {
      selectedText += `${gym.name} (${gym.code}):\n`;
      selectedText += gym.colors.map(color => color.color_hex).join('\n') + '\n\n';
    });

    navigator.clipboard.writeText(selectedText).then(() => {
      const count = selectedGymsList.length;
      const message = count === 1 ? '1 Gym Copied!' : `${count} Gyms Copied!`;
      toast({
        description: message,
        duration: 2000,
      });
    });
  };

  const toggleEditMode = () => {
    setEditMode(!editMode);
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-xl text-gray-900">Loading gym data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-red-600 text-xl">Error loading gym data</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">🏆 Gym Brand Kit Database</h1>
            
            <div className="flex items-center gap-3">
              {selectedGyms.size > 0 && (
                <Button
                  onClick={handleCopySelected}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                >
                  Copy Selected ({selectedGyms.size})
                </Button>
              )}
              
              <Button
                onClick={copyAllGyms}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Copy All
              </Button>
              
              <Button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white"
              >
                Add New Gym
              </Button>
              
              <Button
                onClick={toggleEditMode}
                variant={editMode ? "default" : "outline"}
                className={editMode 
                  ? "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white" 
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }
              >
                {editMode ? 'Exit Edit' : 'Edit Mode'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area with rose tint background */}
      <div className="bg-gradient-to-br from-rose-gold/20 via-rose-gold/10 to-transparent min-h-screen">
        {/* Navigation */}
        <GymNavigation 
          gyms={gyms} 
          onScrollToGym={scrollToGym}
          onCopySelected={handleCopySelected}
          selectedGyms={selectedGyms}
          onToggleGymSelection={toggleGymSelection}
          onSelectAllGyms={selectAllGyms}
          onDeselectAllGyms={deselectAllGyms}
        />

        {/* Main Content */}
        <div className="pt-8 pb-16">
          <div className="max-w-7xl mx-auto px-6">
            {/* Gym Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gyms.map((gym) => (
                <GymCard 
                  key={gym.id} 
                  gym={gym} 
                  editMode={editMode}
                  showAllLogos={false}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="mt-16 text-center">
              <p className="text-sm leading-relaxed max-w-4xl mx-auto text-gray-600">
                Click gym buttons in the dashboard to jump to each gym • Use sparkling diamonds to select specific gyms for copying • Copy individual colors, single gyms, selected groups, or all at once • Click main logo area or upload section to add logos • Click any uploaded logo to set it as the main display logo • Edit mode allows you to modify colors and add new gyms
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Gym Modal */}
      <AddGymModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Back to Top Button */}
      {showBackToTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 rounded-full w-12 h-12 p-0 text-white shadow-lg transition-all duration-300 hover:scale-110"
          title="Back to top"
          style={{
            background: `linear-gradient(135deg, hsl(var(--brand-blue-gray)) 0%, hsl(var(--brand-blue-gray-mid)) 50%, hsl(var(--brand-blue-gray-dark)) 100%)`,
            boxShadow: '0 4px 15px hsl(var(--brand-blue-gray) / 0.4)'
          }}
        >
          <ChevronUp className="w-6 h-6" />
        </Button>
      )}
    </div>
  );
};

export default Index;
