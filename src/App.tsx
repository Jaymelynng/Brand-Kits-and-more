import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import GymProfile from "./pages/GymProfile";
import Auth from "./pages/Auth";
import Themes from "./pages/Themes";
import ThemeDetail from "./pages/ThemeDetail";
import Admin from "./pages/Admin";
import MyBrand from "./pages/MyBrand";
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
          <Route path="/themes" element={<Themes />} />
          <Route path="/themes/:categoryId" element={<ThemeDetail />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/my-brand" element={<MyBrand />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
