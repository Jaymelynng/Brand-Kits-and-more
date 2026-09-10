import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGyms } from "@/hooks/useGyms";
import { useAuth } from "@/hooks/useAuth";
import { GymNavigation } from "@/components/GymNavigation";
import { GymPillStrip } from "@/components/GymPillStrip";
import { GymCard } from "@/components/GymCard";
import { AddGymModal } from "@/components/AddGymModal";
import { AdminToolkit } from "@/components/AdminToolkit";
import { SelectionRail } from "@/components/SelectionRail";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronUp, Shield } from "lucide-react";
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
    if (!gymElement) return;

    // Set scrollTop directly. Smooth behaviour and rAF both silently do
    // nothing in some contexts; this always lands on the card.
    const scroller = document.scrollingElement || document.documentElement;
    const target =
      scroller.scrollTop +
      gymElement.getBoundingClientRect().top -
      Math.max(0, (window.innerHeight - gymElement.offsetHeight) / 2);
    scroller.scrollTop = Math.max(0, target);

    gymElement.style.outline = '3px solid #16B8A0';
    gymElement.style.outlineOffset = '3px';
    setTimeout(() => {
      gymElement.style.outline = '';
      gymElement.style.outlineOffset = '';
    }, 1600);
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

  const buildLogoUrlsText = (list: typeof gyms) => {
    let text = 'GYM LOGO URLS\n\n';
    list.forEach(gym => {
      const urls = gym.logos || [];
      if (urls.length === 0) return;
      text += `${gym.name} (${gym.code}):\n`;
      const sorted = [...urls].sort((a, b) => Number(!!b.is_main_logo) - Number(!!a.is_main_logo));
      sorted.forEach(l => {
        text += `${l.filename || 'logo'}: ${l.file_url}\n`;
      });
      text += '\n';
    });
    return text;
  };

  const handleCopyLogoUrls = () => {
    const useSelected = selectedGyms.size > 0 && selectedGyms.size < gyms.length;
    const list = useSelected
      ? gyms.filter(g => selectedGyms.has(g.code))
      : gyms;
    if (list.length === 0) {
      toast({ description: 'No gyms selected!', variant: 'destructive', duration: 2000 });
      return;
    }
    const totalLogos = list.reduce((n, g) => n + (g.logos?.length || 0), 0);
    if (totalLogos === 0) {
      toast({ description: 'No logos found for selection', variant: 'destructive', duration: 2000 });
      return;
    }
    navigator.clipboard.writeText(buildLogoUrlsText(list)).then(() => {
      toast({
        description: `Copied ${totalLogos} logo URL${totalLogos === 1 ? '' : 's'} from ${list.length} gym${list.length === 1 ? '' : 's'}`,
        duration: 2000,
      });
    });
  };

  const handleCopyColorsAndLogos = () => {
    const useSelected = selectedGyms.size > 0 && selectedGyms.size < gyms.length;
    const list = useSelected ? gyms.filter(g => selectedGyms.has(g.code)) : gyms;
    if (list.length === 0) {
      toast({ description: 'No gyms selected!', variant: 'destructive', duration: 2000 });
      return;
    }
    let text = 'GYM BRAND COLORS + LOGO URLS\n\n';
    list.forEach(gym => {
      text += `${gym.name} (${gym.code}):\n`;
      text += 'Colors:\n';
      text += (gym.colors || []).map(c => c.color_hex).join('\n') + '\n';
      const logos = [...(gym.logos || [])].sort(
        (a, b) => Number(!!b.is_main_logo) - Number(!!a.is_main_logo)
      );
      if (logos.length > 0) {
        text += 'Logos:\n';
        logos.forEach(l => {
          text += `${l.filename || 'logo'}: ${l.file_url}\n`;
        });
      }
      text += '\n';
    });
    navigator.clipboard.writeText(text).then(() => {
      toast({
        description: `Copied colors + logos from ${list.length} gym${list.length === 1 ? '' : 's'}`,
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
      <div className="flex min-h-screen flex-col lg:flex-row">
      <SelectionRail
        gyms={gyms}
        selectedCodes={selectedGyms}
        onToggle={toggleGymSelection}
        onJumpTo={scrollToGym}
        onSelectAll={selectAllGyms}
        onClearAll={deselectAllGyms}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
      />

      <div className="min-w-0 flex-1" style={{ background: 'linear-gradient(135deg, #e5e7eb 0%, #d6c5bf 100%)' }}>

        {/* Main Content */}
        <div className="pt-5 pb-16">
          <div className="w-full px-4 sm:px-6 lg:pl-8 lg:pr-6 2xl:pl-10 2xl:pr-8">

            {/* Gym Grid */}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] justify-items-center gap-6 xl:gap-8 2xl:grid-cols-[repeat(auto-fill,minmax(min(100%,400px),1fr))] items-stretch">
              {filteredGyms.map((gym) => (
                <GymCard
                  key={gym.id}
                  gym={gym}
                  editMode={editMode}
                  showAllLogos={false}
                  selected={selectedGyms.has(gym.code)}
                  onToggleSelect={toggleGymSelection}
                />
              ))}
              {filteredGyms.length === 0 && searchQuery && (
                <div className="col-span-full text-center py-12">
                  <p className="text-lg font-medium text-muted-foreground">No gyms match "{searchQuery}"</p>
                </div>
              )}
            </div>

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
