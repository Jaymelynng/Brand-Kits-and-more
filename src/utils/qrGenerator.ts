import QRCode from 'qrcode';

export type QRFrameShape = 'square' | 'tall' | 'wide' | 'rounded' | 'circle';

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
  frameShape?: QRFrameShape;
  frameColor?: string;
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
    sublabel,
    frameShape = 'square',
    frameColor = '#ffffff',
  } = options;

  // 1. Render the base QR canvas (always square)
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, content, {
    width: size,
    margin: 2,
    errorCorrectionLevel: logoImage ? 'H' : errorCorrectionLevel,
    color,
  });

  // 2. Overlay logo if provided
  if (logoImage) {
    const ctx = qrCanvas.getContext('2d');
    if (ctx) {
      const logoPixelSize = qrCanvas.width * logoSize;
      const logoX = (qrCanvas.width - logoPixelSize) / 2;
      const logoY = (qrCanvas.height - logoPixelSize) / 2;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(qrCanvas.width / 2, qrCanvas.height / 2, logoPixelSize / 2 + 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(qrCanvas.width / 2, qrCanvas.height / 2, logoPixelSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logoImage, logoX, logoY, logoPixelSize, logoPixelSize);
      ctx.restore();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(qrCanvas.width / 2, qrCanvas.height / 2, logoPixelSize / 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 3. Wrap into the chosen frame shape (with optional label)
  const framed = wrapInFrame(qrCanvas, frameShape, frameColor, label, sublabel);
  return framed.toDataURL('image/png');
};

// ─── Frame wrapper ────────────────────────────────────────────────────
function wrapInFrame(
  qr: HTMLCanvasElement,
  shape: QRFrameShape,
  bgColor: string,
  label?: string,
  sublabel?: string,
): HTMLCanvasElement {
  const qrSize = qr.width;
  const labelLines = [label, sublabel].filter(Boolean) as string[];

  // Per-shape dimensions (frame container size)
  let frameW: number;
  let frameH: number;
  let qrX: number;
  let qrY: number;
  let renderQrSize = qrSize;

  switch (shape) {
    case 'tall': {
      // Vertical poster — QR top, label area bottom
      frameW = qrSize + qrSize * 0.2; // padding around QR
      frameH = Math.round(qrSize * 1.5);
      renderQrSize = qrSize;
      qrX = (frameW - renderQrSize) / 2;
      qrY = qrSize * 0.1;
      break;
    }
    case 'wide': {
      // Landscape banner — QR left, label area right
      frameH = qrSize + qrSize * 0.2;
      frameW = Math.round(qrSize * 1.6);
      renderQrSize = qrSize;
      qrX = qrSize * 0.1;
      qrY = (frameH - renderQrSize) / 2;
      break;
    }
    case 'circle': {
      // Circular badge — QR centered, no label area (label clipped)
      const diameter = Math.round(qrSize * 1.35);
      frameW = diameter;
      frameH = diameter;
      renderQrSize = Math.round(qrSize * 0.78);
      qrX = (frameW - renderQrSize) / 2;
      qrY = (frameH - renderQrSize) / 2;
      break;
    }
    case 'rounded':
    case 'square':
    default: {
      const pad = qrSize * 0.08;
      frameW = qrSize + pad * 2;
      frameH = qrSize + pad * 2 + (labelLines.length > 0 ? (labelLines.length === 2 ? 90 : 60) : 0);
      renderQrSize = qrSize;
      qrX = pad;
      qrY = pad;
      break;
    }
  }

  const out = document.createElement('canvas');
  out.width = frameW;
  out.height = frameH;
  const ctx = out.getContext('2d')!;

  // Draw frame background with shape-specific clipping
  ctx.save();
  if (shape === 'circle') {
    ctx.beginPath();
    ctx.arc(frameW / 2, frameH / 2, Math.min(frameW, frameH) / 2, 0, Math.PI * 2);
    ctx.clip();
  } else if (shape === 'rounded') {
    const r = Math.min(frameW, frameH) * 0.08;
    roundRect(ctx, 0, 0, frameW, frameH, r);
    ctx.clip();
  }
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, frameW, frameH);
  ctx.restore();

  // Draw QR
  ctx.drawImage(qr, qrX, qrY, renderQrSize, renderQrSize);

  // Draw labels — per-shape positioning
  if (labelLines.length > 0 && shape !== 'circle') {
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (shape === 'wide') {
      // Label to the right of QR
      const labelAreaX = qrX + renderQrSize;
      const labelAreaW = frameW - labelAreaX;
      const cx = labelAreaX + labelAreaW / 2;
      ctx.textAlign = 'center';
      const primarySize = Math.min(28, labelAreaW / 10);
      ctx.font = `bold ${primarySize}px sans-serif`;
      if (labelLines[1]) {
        ctx.fillText(labelLines[0], cx, frameH * 0.42);
        ctx.fillStyle = '#666666';
        const secSize = Math.min(20, labelAreaW / 14);
        ctx.font = `${secSize}px sans-serif`;
        ctx.fillText(labelLines[1], cx, frameH * 0.58);
      } else {
        ctx.fillText(labelLines[0], cx, frameH / 2);
      }
    } else {
      // Below QR (square / tall / rounded)
      const labelTop = qrY + renderQrSize;
      const labelArea = frameH - labelTop;
      const primarySize = Math.min(26, frameW / 18);
      ctx.font = `bold ${primarySize}px sans-serif`;
      if (labelLines[1]) {
        ctx.fillText(labelLines[0], frameW / 2, labelTop + labelArea * 0.35);
        ctx.fillStyle = '#666666';
        const secSize = Math.min(18, frameW / 26);
        ctx.font = `${secSize}px sans-serif`;
        ctx.fillText(labelLines[1], frameW / 2, labelTop + labelArea * 0.7);
      } else {
        ctx.fillText(labelLines[0], frameW / 2, labelTop + labelArea / 2);
      }
    }
  }

  return out;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export const detectQRType = (content: string): 'url' | 'email' | 'phone' | 'text' | 'other' => {
  if (content.startsWith('http://') || content.startsWith('https://')) return 'url';
  if (content.startsWith('mailto:')) return 'email';
  if (content.startsWith('tel:')) return 'phone';
  return 'text';
};


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
