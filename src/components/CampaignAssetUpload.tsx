import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { parseFilename, getFileExtension } from "@/lib/assetNaming";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, CheckCircle2, AlertCircle, Loader2, Edit2, Sparkles, Check, XCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";

interface ParsedCampaignAsset {
  file: File;
  id: string;
  gymCode?: string;
  gymId?: string;
  gymName?: string;
  isAdminResource: boolean;
  fileType: string;
  status: 'valid' | 'warning' | 'error';
  statusMessage: string;
  uploadStatus?: 'pending' | 'uploading' | 'success' | 'failed';
  editedFilename?: string;
  aiSuggestedFilename?: string;
  isEditingFilename: boolean;
  isAnalyzing: boolean;
}

interface CampaignAssetUploadProps {
  campaignId: string;
  campaignName: string;
  gyms: Array<{ id: string; code: string; name: string }>;
  onSuccess: () => void;
}

export function CampaignAssetUpload({ campaignId, campaignName, gyms, onSuccess }: CampaignAssetUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadingAssets, setUploadingAssets] = useState<ParsedCampaignAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);

  const gymCodes = gyms.map(g => g.code);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const parsed: ParsedCampaignAsset[] = acceptedFiles.map((file) => {
      const filenameResult = parseFilename(file.name, gymCodes);
      
      let status: 'valid' | 'warning' | 'error' = 'valid';
      let statusMessage = 'Ready to upload';
      let gymId: string | undefined;
      let gymName: string | undefined;
      let isAdminResource = false;
      
      if (!filenameResult.isValid) {
        isAdminResource = true;
        status = 'warning';
        statusMessage = 'No gym code found - will be uploaded as Admin Resource';
      } else {
        const gym = gyms?.find(g => g.code.toUpperCase() === filenameResult.gymCode.toUpperCase());
        if (gym) {
          gymId = gym.id;
          gymName = gym.name;
          statusMessage = `Will upload to ${gymName} (${filenameResult.gymCode})`;
        } else {
          isAdminResource = true;
          status = 'warning';
          statusMessage = `Gym "${filenameResult.gymCode}" not found - will be uploaded as Admin Resource`;
        }
      }
      
      return {
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        gymCode: filenameResult.gymCode,
        gymId,
        gymName,
        isAdminResource,
        fileType: file.type,
        status,
        statusMessage,
        uploadStatus: 'pending',
        editedFilename: file.name,
        isEditingFilename: false,
        isAnalyzing: false,
      };
    });
    
    setUploadingAssets(prev => [...prev, ...parsed]);
  }, [gyms, gymCodes]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
  });

  const toggleAdminResource = (assetId: string) => {
    setUploadingAssets(prev => prev.map(a => 
      a.id === assetId 
        ? { 
            ...a, 
            isAdminResource: !a.isAdminResource,
            statusMessage: !a.isAdminResource 
              ? 'Will be uploaded as Admin Resource' 
              : `Will upload to ${a.gymName} (${a.gymCode})`
          }
        : a
    ));
  };

  const removeAsset = (assetId: string) => {
    setUploadingAssets(prev => prev.filter(a => a.id !== assetId));
  };

  const toggleEditFilename = (assetId: string) => {
    setUploadingAssets(prev => prev.map(a =>
      a.id === assetId ? { ...a, isEditingFilename: !a.isEditingFilename } : a
    ));
  };

  const updateFilename = (assetId: string, newFilename: string) => {
    setUploadingAssets(prev => prev.map(a => {
      if (a.id !== assetId) return a;
      
      // Re-parse the filename to detect gym codes
      const filenameResult = parseFilename(newFilename, gymCodes);
      let gymId: string | undefined;
      let gymName: string | undefined;
      let isAdminResource = a.isAdminResource;
      let status: 'valid' | 'warning' | 'error' = 'valid';
      let statusMessage = 'Ready to upload';

      if (!filenameResult.isValid) {
        isAdminResource = true;
        status = 'warning';
        statusMessage = 'No gym code found - will be uploaded as Admin Resource';
      } else {
        const gym = gyms?.find(g => g.code.toUpperCase() === filenameResult.gymCode.toUpperCase());
        if (gym) {
          gymId = gym.id;
          gymName = gym.name;
          isAdminResource = false;
          statusMessage = `Will upload to ${gymName} (${filenameResult.gymCode})`;
        } else {
          isAdminResource = true;
          status = 'warning';
          statusMessage = `Gym "${filenameResult.gymCode}" not found - will be uploaded as Admin Resource`;
        }
      }

      return {
        ...a,
        editedFilename: newFilename,
        gymCode: filenameResult.gymCode,
        gymId,
        gymName,
        isAdminResource,
        status,
        statusMessage,
      };
    }));
  };

  const analyzeFile = async (asset: ParsedCampaignAsset) => {
    if (!asset.fileType.startsWith('image/')) {
      toast.error('AI analysis only works with images');
      return;
    }

    setUploadingAssets(prev => prev.map(a =>
      a.id === asset.id ? { ...a, isAnalyzing: true } : a
    ));

    const tempUrl = URL.createObjectURL(asset.file);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: {
          imageUrl: tempUrl,
          gymCode: asset.gymCode || 'ADMIN',
          gymName: asset.gymName || 'Admin Resource',
          currentFilename: asset.editedFilename || asset.file.name,
        }
      });

      if (error) throw error;

      const suggestedName = data.suggestedName;
      
      // Re-parse to detect gym codes in suggested name
      const filenameResult = parseFilename(suggestedName, gymCodes);
      let gymId: string | undefined;
      let gymName: string | undefined;
      let isAdminResource = false;
      let status: 'valid' | 'warning' | 'error' = 'valid';
      let statusMessage = 'AI suggested filename';

      if (!filenameResult.isValid) {
        isAdminResource = true;
        status = 'warning';
        statusMessage = 'AI suggested - No gym code found';
      } else {
        const gym = gyms?.find(g => g.code.toUpperCase() === filenameResult.gymCode.toUpperCase());
        if (gym) {
          gymId = gym.id;
          gymName = gym.name;
          statusMessage = `AI suggested for ${gymName} (${filenameResult.gymCode})`;
        } else {
          isAdminResource = true;
          status = 'warning';
          statusMessage = `AI suggested - Gym "${filenameResult.gymCode}" not found`;
        }
      }

      setUploadingAssets(prev => prev.map(a =>
        a.id === asset.id
          ? {
              ...a,
              aiSuggestedFilename: suggestedName,
              editedFilename: suggestedName,
              gymCode: filenameResult.gymCode,
              gymId,
              gymName,
              isAdminResource,
              status,
              statusMessage,
              isAnalyzing: false,
            }
          : a
      ));

      toast.success('AI filename generated!');
    } catch (error) {
      console.error('AI analysis error:', error);
      toast.error('Failed to analyze image');
      setUploadingAssets(prev => prev.map(a =>
        a.id === asset.id ? { ...a, isAnalyzing: false } : a
      ));
    } finally {
      URL.revokeObjectURL(tempUrl);
    }
  };

  const analyzeAllFiles = async () => {
    const imageAssets = uploadingAssets.filter(a => a.fileType.startsWith('image/'));
    
    if (imageAssets.length === 0) {
      toast.error('No images to analyze');
      return;
    }

    setIsBatchAnalyzing(true);
    let analyzed = 0;

    for (const asset of imageAssets) {
      await analyzeFile(asset);
      analyzed++;
      toast.info(`Analyzing... ${analyzed}/${imageAssets.length}`);
    }

    setIsBatchAnalyzing(false);
    toast.success(`Analyzed ${imageAssets.length} images!`);
  };

  const uploadAssets = async () => {
    setIsUploading(true);
    setUploadProgress(0);
    
    const totalAssets = uploadingAssets.length;
    let completed = 0;

    for (const asset of uploadingAssets) {
      try {
        setUploadingAssets(prev => prev.map(a => 
          a.id === asset.id ? { ...a, uploadStatus: 'uploading' } : a
        ));
        
        const finalFilename = asset.editedFilename || asset.file.name;
        const fileExt = getFileExtension(finalFilename);
        const fileName = `${campaignId}-${asset.gymId || 'admin'}-${Date.now()}-${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('campaign-assets')
          .upload(fileName, asset.file);
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('campaign-assets')
          .getPublicUrl(fileName);
        
        // Determine asset category
        let assetCategory = 'other';
        if (asset.fileType.startsWith('video/')) assetCategory = 'video';
        else if (asset.fileType.startsWith('image/')) assetCategory = 'image';
        else if (asset.fileType === 'application/pdf') assetCategory = 'document';
        
        const { error: dbError } = await supabase
          .from('campaign_assets')
          .insert({
            campaign_id: campaignId,
            gym_id: asset.isAdminResource ? null : asset.gymId,
            file_url: publicUrl,
            filename: finalFilename,
            file_type: asset.fileType,
            file_size: asset.file.size,
            asset_category: assetCategory,
          });
        
        if (dbError) throw dbError;
        
        setUploadingAssets(prev => prev.map(a => 
          a.id === asset.id ? { ...a, uploadStatus: 'success' } : a
        ));
        
        completed++;
        setUploadProgress((completed / totalAssets) * 100);
      } catch (error) {
        console.error('Upload error:', error);
        setUploadingAssets(prev => prev.map(a => 
          a.id === asset.id ? { ...a, uploadStatus: 'failed' } : a
        ));
      }
    }
    
    setIsUploading(false);
    
    const successCount = uploadingAssets.filter(a => a.uploadStatus === 'success').length;
    const failCount = uploadingAssets.filter(a => a.uploadStatus === 'failed').length;
    
    if (failCount === 0) {
      toast.success(`Successfully uploaded ${successCount} assets!`);
      setUploadingAssets([]);
      setIsOpen(false);
      onSuccess();
    } else {
      toast.error(`Uploaded ${successCount} assets, ${failCount} failed`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'uploading': return <Loader2 className="w-4 h-4 animate-spin" />;
      default: return null;
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline">
        <Upload className="w-4 h-4 mr-2" />
        Upload Assets
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Campaign Assets</DialogTitle>
            <DialogDescription>
              Upload files for {campaignName}. Files will be automatically assigned to gyms based on filename.
            </DialogDescription>
          </DialogHeader>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p>Drop files here...</p>
            ) : (
              <div>
                <p className="mb-2">Drag & drop files here, or click to select</p>
                <p className="text-sm text-muted-foreground">
                  Supports: Images, Videos, PDFs, DOCX, XLSX
                </p>
              </div>
            )}
          </div>

          {uploadingAssets.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Files to Upload ({uploadingAssets.length})</h3>
                {uploadingAssets.some(a => a.fileType.startsWith('image/')) && !isUploading && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={analyzeAllFiles}
                    disabled={isBatchAnalyzing}
                  >
                    {isBatchAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI Suggest All
                      </>
                    )}
                  </Button>
                )}
              </div>
              
              {isUploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} />
                  <p className="text-sm text-muted-foreground text-center">
                    Uploading... {Math.round(uploadProgress)}%
                  </p>
                </div>
              )}

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {uploadingAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="p-3 border rounded-lg bg-card space-y-2"
                  >
                    <div className="flex items-start gap-3">
                      {/* File preview thumbnail */}
                      {asset.fileType.startsWith('image/') && (
                        <img
                          src={URL.createObjectURL(asset.file)}
                          alt="Preview"
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        {/* Filename editor */}
                        {asset.isEditingFilename && !isUploading ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={asset.editedFilename || asset.file.name}
                              onChange={(e) => updateFilename(asset.id, e.target.value)}
                              className="text-sm"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => toggleEditFilename(asset.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate flex-1">
                              {asset.editedFilename || asset.file.name}
                            </p>
                            {!isUploading && asset.uploadStatus !== 'success' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => toggleEditFilename(asset.id)}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        )}

                        {/* AI suggestion display */}
                        {asset.aiSuggestedFilename && asset.aiSuggestedFilename !== asset.editedFilename && (
                          <p className="text-xs text-muted-foreground">
                            AI suggested: {asset.aiSuggestedFilename}
                          </p>
                        )}

                        {/* Status message */}
                        <div className="flex items-center gap-2">
                          {asset.status === 'valid' && <Check className="w-3 h-3 text-green-500" />}
                          {asset.status === 'warning' && <AlertCircle className="w-3 h-3 text-yellow-500" />}
                          {asset.status === 'error' && <XCircle className="w-3 h-3 text-destructive" />}
                          <p className={`text-xs ${asset.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {asset.statusMessage}
                          </p>
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        {asset.uploadStatus && getStatusIcon(asset.uploadStatus)}
                        
                        {!isUploading && asset.uploadStatus !== 'success' && (
                          <>
                            {/* AI analyze button */}
                            {asset.fileType.startsWith('image/') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => analyzeFile(asset)}
                                disabled={asset.isAnalyzing}
                              >
                                {asset.isAnalyzing ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    AI
                                  </>
                                )}
                              </Button>
                            )}
                            
                            {/* Admin resource toggle */}
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={asset.isAdminResource}
                                onCheckedChange={() => toggleAdminResource(asset.id)}
                                disabled={!asset.gymId}
                              />
                              <Label className="text-xs whitespace-nowrap">Admin</Label>
                            </div>
                            
                            {/* Remove button */}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeAsset(asset.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isUploading}>
                  Cancel
                </Button>
                <Button onClick={uploadAssets} disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    `Upload ${uploadingAssets.length} Files`
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
