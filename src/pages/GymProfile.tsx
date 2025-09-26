import { useParams, Link } from "react-router-dom";
import { useGyms } from "@/hooks/useGyms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Copy } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const GymProfile = () => {
  const { gymCode } = useParams<{ gymCode: string }>();
  const { data: gyms = [], isLoading, error } = useGyms();
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const gym = gyms.find(g => g.code === gymCode);

  const showCopyFeedback = (key: string, message: string) => {
    setCopiedStates(prev => ({ ...prev, [key]: true }));
    toast({
      description: message,
      duration: 2000,
    });
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const copyColor = (colorCode: string) => {
    navigator.clipboard.writeText(colorCode).then(() => {
      showCopyFeedback(colorCode, `Copied ${colorCode}!`);
    });
  };

  const copyAllColors = () => {
    if (!gym) return;
    const colorText = gym.colors.map(color => color.color_hex).join('\n');
    navigator.clipboard.writeText(colorText).then(() => {
      showCopyFeedback('all-colors', 'All colors copied!');
    });
  };

  const downloadLogo = (logoUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = logoUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-xl">Loading gym profile...</div>
      </div>
    );
  }

  if (error || !gym) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-destructive text-xl mb-4">
            {error ? 'Error loading gym data' : `Gym "${gymCode}" not found`}
          </div>
          <Link to="/">
            <Button className="bg-brand-warm hover:bg-brand-warm/80 text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const mainLogo = gym.logos.find(logo => logo.is_main_logo);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-foreground flex items-center gap-2">
              {gym.name}
              <span className="px-3 py-1 rounded-full bg-brand-warm text-white text-lg font-medium">
                {gym.code}
              </span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Complete brand profile and asset collection
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Logo Section */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🏆 Main Logo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mainLogo ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-full max-w-md h-48 flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed border-border">
                    <img 
                      src={mainLogo.file_url} 
                      alt={`${gym.name} main logo`}
                      className="max-h-44 max-w-full object-contain"
                    />
                  </div>
                  <Button
                    onClick={() => downloadLogo(mainLogo.file_url, mainLogo.filename)}
                    className="bg-brand-cool hover:bg-brand-cool/80 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Main Logo
                  </Button>
                </div>
              ) : (
                <div className="w-full h-48 flex items-center justify-center bg-muted/20 rounded-lg border-2 border-dashed border-border text-muted-foreground">
                  No main logo uploaded
                </div>
              )}
            </CardContent>
          </Card>

          {/* Color Palette */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                🎨 Brand Colors
                <Button
                  onClick={copyAllColors}
                  size="sm"
                  className="bg-brand-warm hover:bg-brand-warm/80 text-white"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {gym.colors.map((color, index) => (
                  <div 
                    key={color.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => copyColor(color.color_hex)}
                  >
                    <div 
                      className="w-12 h-12 rounded-lg border-2 border-border flex-shrink-0"
                      style={{ backgroundColor: color.color_hex }}
                    />
                    <div className="flex-1">
                      <div className="font-mono text-sm font-medium">
                        {color.color_hex}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Color {index + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Logo Gallery */}
          {gym.logos.length > 0 && (
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>📁 Logo Gallery ({gym.logos.length} files)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {gym.logos.map((logo) => (
                    <div 
                      key={logo.id} 
                      className="relative group bg-muted/20 rounded-lg p-3 border-2 border-border hover:border-brand-cool/50 transition-colors"
                    >
                      <div className="aspect-square flex items-center justify-center mb-2">
                        <img 
                          src={logo.file_url} 
                          alt={logo.filename}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="text-xs text-muted-foreground truncate mb-2">
                        {logo.filename}
                      </div>
                      {logo.is_main_logo && (
                        <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs px-2 py-1 rounded-full font-medium">
                          Main
                        </div>
                      )}
                      <Button
                        onClick={() => downloadLogo(logo.file_url, logo.filename)}
                        size="sm"
                        className="w-full opacity-0 group-hover:opacity-100 transition-opacity bg-brand-soft hover:bg-brand-soft/80 text-white"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
};

export default GymProfile;