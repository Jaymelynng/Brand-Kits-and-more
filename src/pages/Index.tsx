import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGyms } from "@/hooks/useGyms";
import { useAuth } from "@/hooks/useAuth";
import { GymNavigation } from "@/components/GymNavigation";
import { GymCard } from "@/components/GymCard";
import { AddGymModal } from "@/components/AddGymModal";
import { AdminToolkit } from "@/components/AdminToolkit";
import { GymSearchBar } from "@/components/GymSearchBar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronUp, Shield, Folder } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { data: gyms = [], isLoading, error } = useGyms();
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdminToolkitOpen, setIsAdminToolkitOpen] = useState(false);
  const [selectedGyms, setSelectedGyms] = useState<Set<string>>(new Set());
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const filteredGyms = useMemo(() => {
    if (!searchQuery.trim()) return gyms;
    const q = searchQuery.toLowerCase();
    return gyms.filter(g => g.name.toLowerCase().includes(q) || g.code.toLowerCase().includes(q));
  }, [gyms, searchQuery]);

  const handleAdminClick = () => {
    if (!user) {
      toast({
        title: "Admin Login Required",
        description: "Please sign in to access admin features",
      });
      navigate("/auth");
    } else if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "You need admin privileges to access this feature",
        variant: "destructive",
      });
    } else {
      setIsAdminToolkitOpen(true);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Signed Out",
      description: "You've been successfully signed out",
    });
    setEditMode(false);
  };

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--brand-white))' }}>
        <div className="text-xl" style={{ color: 'hsl(var(--brand-text-primary))' }}>Loading gym data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(var(--brand-white))' }}>
        <div className="text-red-600 text-xl">Error loading gym data</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #e5e7eb 0%, #e6e6e6 50%, #d6c5bf 100%)' }}>
      {/* Navigation section - Now includes title */}
      <div className="sticky top-0 z-40 shadow-sm" style={{ background: 'hsl(var(--brand-white))' }}>
        <GymNavigation 
          gyms={gyms} 
          onScrollToGym={scrollToGym}
          onCopySelected={handleCopySelected}
          onCopyAll={copyAllGyms}
          selectedGyms={selectedGyms}
          onToggleGymSelection={toggleGymSelection}
          onSelectAllGyms={selectAllGyms}
          onDeselectAllGyms={deselectAllGyms}
          user={user}
          isAdmin={isAdmin}
          onAdminClick={handleAdminClick}
          onSignOut={handleSignOut}
        />
      </div>

      {/* Main content area - Soft background with your colors */}
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #e5e7eb 0%, #d6c5bf 100%)' }}>

        {/* Main Content */}
        <div className="pt-2 pb-16">
          <div className="max-w-7xl mx-auto px-6">
            {/* Search Bar */}
            <GymSearchBar 
              onSearch={setSearchQuery} 
              resultCount={filteredGyms.length} 
              totalCount={gyms.length} 
            />

            {/* Gym Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {filteredGyms.map((gym) => (
                <GymCard 
                  key={gym.id} 
                  gym={gym} 
                  editMode={editMode}
                  showAllLogos={false}
                />
              ))}
              {filteredGyms.length === 0 && searchQuery && (
                <div className="col-span-full text-center py-12">
                  <p className="text-lg font-medium text-muted-foreground">No gyms match "{searchQuery}"</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-16 text-center">
              <p className="text-sm leading-relaxed max-w-4xl mx-auto" style={{ color: 'hsl(var(--brand-text-primary) / 0.8)' }}>
                Click gym buttons in the dashboard to jump to each gym • Use sparkling diamonds to select specific gyms for copying • Copy individual colors, single gyms, selected groups, or all at once • Click main logo area or upload section to add logos • Click any uploaded logo to set it as the main display logo • Edit mode allows you to modify colors and add new gyms
              </p>
              
              {/* Campaigns Link */}
              <div className="mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => navigate('/campaigns')}
                >
                  <Folder className="w-3 h-3 mr-1" />
                  Campaigns & Asset Library
                </Button>
              </div>

              {/* Admin Access Button - always visible, handles login redirect */}
              {!isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 text-xs opacity-60 hover:opacity-100 transition-opacity"
                  onClick={() => {
                    if (!user) {
                      navigate("/auth");
                    } else {
                      handleAdminClick();
                    }
                  }}
                >
                  <Shield className="w-3 h-3 mr-1" />
                  Admin Access
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Gym Modal */}
      <AddGymModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Admin Toolkit - Only show if admin */}
      {isAdmin && (
        <AdminToolkit
          isOpen={isAdminToolkitOpen}
          onClose={() => setIsAdminToolkitOpen(false)}
          editMode={editMode}
          onToggleEditMode={toggleEditMode}
          onAddNewGym={() => setIsAddModalOpen(true)}
        />
      )}

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
