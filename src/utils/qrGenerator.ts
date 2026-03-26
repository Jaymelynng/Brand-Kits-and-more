import QRCode from 'qrcode';

export interface QRGenerateOptions {
  content: string;
  size?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  color?: {
    dark?: string;
    light?: string;
  };
  logoImage?: HTMLImageElement;
  logoSize?: number;
  label?: string;
  sublabel?: string;
}

export const generateQRCode = async (options: QRGenerateOptions): Promise<string> => {
  const {
    content,
    size = 512,
    errorCorrectionLevel = 'M',
    color = { dark: '#000000', light: '#ffffff' },
    logoImage,
    logoSize = 0.25,
    label,
    sublabel
  } = options;

  const addLabelToCanvas = (sourceCanvas: HTMLCanvasElement, primaryLabel: string, secondaryLabel?: string): HTMLCanvasElement => {
    const hasSecondary = !!secondaryLabel;
    const labelHeight = hasSecondary ? 90 : 60;
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = sourceCanvas.width;
    outputCanvas.height = sourceCanvas.height + labelHeight;
    const outCtx = outputCanvas.getContext('2d')!;
    outCtx.drawImage(sourceCanvas, 0, 0);
    outCtx.fillStyle = '#ffffff';
    outCtx.fillRect(0, sourceCanvas.height, outputCanvas.width, labelHeight);
    outCtx.fillStyle = '#333333';
    const primaryFontSize = Math.min(24, outputCanvas.width / 20);
    outCtx.font = `bold ${primaryFontSize}px sans-serif`;
    outCtx.textAlign = 'center';
    outCtx.textBaseline = 'middle';
    if (hasSecondary) {
      outCtx.fillText(primaryLabel, outputCanvas.width / 2, sourceCanvas.height + labelHeight * 0.35);
      const secondaryFontSize = Math.min(18, outputCanvas.width / 28);
      outCtx.font = `${secondaryFontSize}px sans-serif`;
      outCtx.fillStyle = '#666666';
      outCtx.fillText(secondaryLabel, outputCanvas.width / 2, sourceCanvas.height + labelHeight * 0.7);
    } else {
      outCtx.fillText(primaryLabel, outputCanvas.width / 2, sourceCanvas.height + labelHeight / 2);
    }
    return outputCanvas;
  };

  if (!logoImage) {
    if (!label) {
      return await QRCode.toDataURL(content, {
        width: size,
        margin: 2,
        errorCorrectionLevel,
        color
      });
    }
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, content, {
      width: size,
      margin: 2,
      errorCorrectionLevel,
      color
    });
    const labeled = addLabelToCanvas(canvas, label, sublabel);
    return labeled.toDataURL('image/png');
  }

  const canvas = document.createElement('canvas');
  await QRCode.toCanvas(canvas, content, {
    width: size,
    margin: 2,
    errorCorrectionLevel: 'H',
    color
  });

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  const logoPixelSize = canvas.width * logoSize;
  const logoX = (canvas.width - logoPixelSize) / 2;
  const logoY = (canvas.height - logoPixelSize) / 2;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, logoPixelSize / 2 + 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, logoPixelSize / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(logoImage, logoX, logoY, logoPixelSize, logoPixelSize);
  ctx.restore();

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, logoPixelSize / 2, 0, Math.PI * 2);
  ctx.stroke();

  if (label) {
    const labeled = addLabelToCanvas(canvas, label, sublabel);
    return labeled.toDataURL('image/png');
  }

  return canvas.toDataURL('image/png');
};

export const detectQRType = (content: string): 'url' | 'email' | 'phone' | 'text' | 'other' => {
  if (content.startsWith('http://') || content.startsWith('https://')) return 'url';
  if (content.startsWith('mailto:')) return 'email';
  if (content.startsWith('tel:')) return 'phone';
  return 'text';
};
