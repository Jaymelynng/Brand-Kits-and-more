import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { PageBoundary } from "@/components/PageBoundary";
import GymProfile from "./pages/GymProfile";
import NotFound from "./pages/NotFound";

// Shared kits load immediately; working screens load only when visited.
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Themes = lazy(() => import("./pages/Themes"));
const ThemeDetail = lazy(() => import("./pages/ThemeDetail"));
const Admin = lazy(() => import("./pages/Admin"));
const Review = lazy(() => import("./pages/Review"));
const MyBrand = lazy(() => import("./pages/MyBrand"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PageBoundary>
          <Suspense fallback={<div role="status" className="flex min-h-[60vh] items-center justify-center bg-white p-6 text-lg font-semibold text-slate-900">Loading page…</div>}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/gym/:gymCode" element={<GymProfile />} />
              {/* Public share link: visible gym-logo strip, no editing or routes out. */}
              <Route path="/kit/:gymCode" element={<GymProfile solo />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/assets" element={<Themes />} />
              <Route path="/themes" element={<Themes />} />
              <Route path="/themes/:categoryId" element={<ThemeDetail />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/review" element={<Review />} />
              <Route path="/my-brand" element={<MyBrand />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </PageBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
