import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useGyms } from "@/hooks/useGyms";
import { parseFilename, getFileExtension } from "@/lib/assetNaming";
import { supabase } from "@/integrations/supabase/client";
import { Upload, CheckCircle2, AlertCircle, XCircle, ArrowLeft, Trash2, LogOut } from "lucide-react";

interface ParsedFile {
  file: File;
  id: string;
  gymCode: string;
  gymId?: string;
  gymName?: string;
  assetType: string;
  descriptor: string;
  variant: number;
  status: 'valid' | 'warning' | 'error';
  statusMessage: string;
  targetTable: 'gym_logos' | 'gym_elements';
  uploadStatus?: 'pending' | 'uploading' | 'success' | 'failed';
  errorMessage?: string;
}

export default function BulkUpload() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const { data: gyms, isLoading: gymsLoading } = useGyms();
  
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newParsedFiles: ParsedFile[] = acceptedFiles.map((file) => {
      const parsed = parseFilename(file.name);
      const extension = getFileExtension(file.name);
      
      let status: 'valid' | 'warning' | 'error' = 'valid';
      let statusMessage = 'Ready to upload';
      let gymId: string | undefined;
      let gymName: string | undefined;
      let targetTable: 'gym_logos' | 'gym_elements' = 'gym_elements';

      if (!parsed.isValid) {
        status = 'error';
        statusMessage = 'Invalid filename format (expected: GYMCODE-type-descriptor-v1.ext)';
      } else {
        const gym = gyms?.find(g => g.code.toUpperCase() === parsed.gymCode.toUpperCase());
        
        if (!gym) {
          status = 'warning';
          statusMessage = `Gym code "${parsed.gymCode}" not found in database`;
        } else {
          gymId = gym.id;
          gymName = gym.name;
          
          // Determine target table based on asset type
          if (parsed.assetType === 'logo') {
            targetTable = 'gym_logos';
            statusMessage = `Will upload to ${gymName} logos`;
          } else {
            targetTable = 'gym_elements';
            statusMessage = `Will upload to ${gymName} elements (${parsed.assetType})`;
          }
        }
      }

      return {
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        gymCode: parsed.gymCode,
        gymId,
        gymName,
        assetType: parsed.assetType,
        descriptor: parsed.descriptor,
        variant: parsed.variant,
        status,
        statusMessage,
        targetTable,
        uploadStatus: 'pending',
      };
    });

    setFiles(prev => [...prev, ...newParsedFiles]);
  }, [gyms]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'],
    },
  });

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const uploadFiles = async () => {
    const validFiles = files.filter(f => f.status === 'valid' && f.gymId);
    
    if (validFiles.length === 0) {
      toast({
        title: "No Valid Files",
        description: "Please add files with valid gym codes to upload.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < validFiles.length; i++) {
      const parsedFile = validFiles[i];
      
      setFiles(prev => prev.map(f => 
        f.id === parsedFile.id ? { ...f, uploadStatus: 'uploading' } : f
      ));

      try {
        const fileExt = getFileExtension(parsedFile.file.name);
        const fileName = `${parsedFile.gymId}-${parsedFile.assetType}-${Date.now()}.${fileExt}`;
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('gym-logos')
          .upload(fileName, parsedFile.file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('gym-logos')
          .getPublicUrl(fileName);

        // Insert into appropriate table
        if (parsedFile.targetTable === 'gym_logos') {
          const { error: dbError } = await supabase
            .from('gym_logos')
            .insert({
              gym_id: parsedFile.gymId!,
              filename: parsedFile.file.name,
              file_url: publicUrl,
              is_main_logo: false,
            });

          if (dbError) throw dbError;
        } else {
          // For elements, read SVG data if applicable
          let svgData = '';
          if (parsedFile.file.type === 'image/svg+xml' || parsedFile.file.name.endsWith('.svg')) {
            svgData = await parsedFile.file.text();
          }

          const { error: dbError } = await supabase
            .from('gym_elements')
            .insert({
              gym_id: parsedFile.gymId!,
              element_type: parsedFile.assetType,
              svg_data: svgData || publicUrl,
              element_color: '#000000',
              element_variant: parsedFile.variant,
            });

          if (dbError) throw dbError;
        }

        setFiles(prev => prev.map(f => 
          f.id === parsedFile.id ? { ...f, uploadStatus: 'success' } : f
        ));
        successCount++;
      } catch (error: any) {
        console.error('Upload error:', error);
        setFiles(prev => prev.map(f => 
          f.id === parsedFile.id 
            ? { ...f, uploadStatus: 'failed', errorMessage: error.message } 
            : f
        ));
        errorCount++;
      }

      setUploadProgress(((i + 1) / validFiles.length) * 100);
    }

    setUploading(false);

    toast({
      title: "Upload Complete",
      description: `${successCount} files uploaded successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      variant: errorCount > 0 ? "destructive" : "default",
    });
  };

  const getStatusIcon = (file: ParsedFile) => {
    if (file.uploadStatus === 'success') {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    }
    if (file.uploadStatus === 'failed') {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    if (file.uploadStatus === 'uploading') {
      return <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
    }
    if (file.status === 'valid') {
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    }
    if (file.status === 'warning') {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  if (authLoading || gymsLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You need admin privileges to access this page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const validFilesCount = files.filter(f => f.status === 'valid' && f.gymId).length;
  const groupedByGym = files.reduce((acc, file) => {
    const gymKey = file.gymName || 'Unknown Gym';
    if (!acc[gymKey]) acc[gymKey] = [];
    acc[gymKey].push(file);
    return acc;
  }, {} as Record<string, ParsedFile[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Header */}
      <div className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold">Bulk Asset Upload</h1>
              <p className="text-sm text-muted-foreground">Upload multiple assets at once</p>
            </div>
          </div>
          {user && (
            <Button onClick={signOut} variant="outline" size="sm" className="gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          )}
        </div>
      </div>
      
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="mb-8">
          <p className="text-muted-foreground">
            Upload multiple assets at once with automatic categorization based on filenames
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upload Zone */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Files</CardTitle>
              <CardDescription>
                Expected format: <code className="text-xs bg-muted px-2 py-1 rounded">GYMCODE-type-descriptor-v1.ext</code>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                {isDragActive ? (
                  <p className="text-lg font-medium">Drop files here...</p>
                ) : (
                  <>
                    <p className="text-lg font-medium mb-2">Drag & drop files here</p>
                    <p className="text-sm text-muted-foreground">or click to browse</p>
                  </>
                )}
              </div>

              {files.length > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {files.length} file{files.length !== 1 ? 's' : ''} added
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {validFilesCount} ready to upload
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFiles([])}
                      disabled={uploading}
                    >
                      Clear All
                    </Button>
                  </div>

                  {uploading && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} />
                      <p className="text-sm text-muted-foreground text-center">
                        Uploading... {Math.round(uploadProgress)}%
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={uploadFiles}
                    disabled={uploading || validFilesCount === 0}
                    className="w-full"
                    size="lg"
                  >
                    {uploading ? 'Uploading...' : `Upload ${validFilesCount} File${validFilesCount !== 1 ? 's' : ''}`}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Files Preview</CardTitle>
              <CardDescription>Review and verify before uploading</CardDescription>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No files added yet</p>
                  <p className="text-sm mt-2">Upload files to see them here</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-6">
                    {Object.entries(groupedByGym).map(([gymName, gymFiles]) => (
                      <div key={gymName}>
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                          {gymName}
                          <span className="text-sm text-muted-foreground font-normal">
                            ({gymFiles.length} file{gymFiles.length !== 1 ? 's' : ''})
                          </span>
                        </h3>
                        <div className="space-y-2">
                          {gymFiles.map((file) => (
                            <div
                              key={file.id}
                              className={`p-3 rounded-lg border ${
                                file.status === 'valid' ? 'border-green-200 bg-green-50/50' :
                                file.status === 'warning' ? 'border-yellow-200 bg-yellow-50/50' :
                                'border-red-200 bg-red-50/50'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {getStatusIcon(file)}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{file.file.name}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {file.statusMessage}
                                  </p>
                                  {file.status === 'valid' && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Type: <span className="font-medium">{file.assetType}</span> • 
                                      Variant: <span className="font-medium">v{file.variant}</span>
                                    </div>
                                  )}
                                  {file.uploadStatus === 'failed' && file.errorMessage && (
                                    <p className="text-xs text-red-600 mt-1">{file.errorMessage}</p>
                                  )}
                                </div>
                                {!uploading && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeFile(file.id)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Naming Convention Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Pattern</h4>
                <code className="text-sm bg-muted px-3 py-2 rounded block">
                  GYMCODE-assettype-descriptor-v1.extension
                </code>
              </div>
              <div>
                <h4 className="font-medium mb-2">Examples</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• <code>OASIS-logo-horizontal-white-v1.png</code></li>
                  <li>• <code>CRR-hero-email-promo-v2.gif</code></li>
                  <li>• <code>FORGE-icon-dumbbell-v1.svg</code></li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Asset Types</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• <strong>logo</strong>: Saved to gym_logos table</li>
                  <li>• <strong>hero, icon, banner, pattern, etc.</strong>: Saved to gym_elements</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Tips</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Use gym code exactly as shown in database</li>
                  <li>• Keep descriptors lowercase with hyphens</li>
                  <li>• Increment variant for similar assets</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
