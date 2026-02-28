import { useState } from "react";

export const useBackgroundRemoval = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const removeBg = async (imageUrl: string): Promise<Blob | null> => {
    try {
      setIsProcessing(true);
      setStatusMessage("Loading background removal model...");
      setProgress(10);

      const { removeBackground } = await import("@imgly/background-removal");

      setStatusMessage("Processing image...");
      setProgress(30);

      const result = await removeBackground(imageUrl, {
        progress: (key: string, current: number, total: number) => {
          const pct = Math.round((current / total) * 100);
          setProgress(30 + pct * 0.7);
        },
      });

      setProgress(100);
      setStatusMessage("Done!");
      return result;
    } catch (error) {
      console.error("Background removal failed:", error);
      return null;
    } finally {
      setIsProcessing(false);
      setProgress(0);
      setStatusMessage(null);
    }
  };

  return { removeBg, isProcessing, progress, statusMessage };
};
