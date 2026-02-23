import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import GymProfile from "./pages/GymProfile";
import Auth from "./pages/Auth";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import AssetLibrary from "./pages/AssetLibrary";
import BulkUpload from "./pages/BulkUpload";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/gym/:gymCode" element={<GymProfile />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:campaignName" element={<CampaignDetail />} />
          <Route path="/assets" element={<AssetLibrary />} />
          <Route path="/bulk-upload" element={<BulkUpload />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
