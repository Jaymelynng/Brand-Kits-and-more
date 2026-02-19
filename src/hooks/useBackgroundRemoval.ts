import { useState, useCallback } from 'react';
import { removeBackground } from '@imgly/background-removal';

interface BackgroundRemovalState {
  isProcessing: boolean;
  progress: number;
  statusMessage: string;
}

export const useBackgroundRemoval = () => {
  const [state, setState] = useState<BackgroundRemovalState>({
    isProcessing: false,
    progress: 0,
    statusMessage: '',
  });

  const removeBg = useCallback(async (imageUrl: string): Promise<Blob | null> => {
    setState({ isProcessing: true, progress: 0, statusMessage: 'Downloading AI model...' });

    try {
      const result = await removeBackground(imageUrl, {
        progress: (key: string, current: number, total: number) => {
          const pct = total > 0 ? Math.round((current / total) * 100) : 0;
          const message = key.includes('fetch') || key.includes('download')
            ? 'Downloading AI model...'
            : 'Removing background...';
          setState(prev => ({ ...prev, progress: pct, statusMessage: message }));
        },
      });

      setState({ isProcessing: false, progress: 100, statusMessage: 'Done!' });
      return result;
    } catch (error) {
      console.error('Background removal failed:', error);
      setState({ isProcessing: false, progress: 0, statusMessage: '' });
      return null;
    }
  }, []);

  return {
    removeBg,
    isProcessing: state.isProcessing,
    progress: state.progress,
    statusMessage: state.statusMessage,
  };
};
