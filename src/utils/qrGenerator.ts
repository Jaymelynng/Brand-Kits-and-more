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

  // 2. Overlay logo if provided (preserves aspect ratio — no stretching)
  if (logoImage) {
    const ctx = qrCanvas.getContext('2d');
    if (ctx) {
      const boxSize = qrCanvas.width * logoSize;
      const cx = qrCanvas.width / 2;
      const cy = qrCanvas.height / 2;

      // Fit the logo inside the circular clear area without distortion
      const naturalW = logoImage.naturalWidth || logoImage.width || boxSize;
      const naturalH = logoImage.naturalHeight || logoImage.height || boxSize;
      const scale = Math.min(boxSize / naturalW, boxSize / naturalH);
      const drawW = naturalW * scale;
      const drawH = naturalH * scale;
      const drawX = cx - drawW / 2;
      const drawY = cy - drawH / 2;

      // White safe-zone behind logo (circle sized to the longest logo edge)
      const safeRadius = Math.max(drawW, drawH) / 2 + 8;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, safeRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw logo at natural aspect ratio
      ctx.drawImage(logoImage, drawX, drawY, drawW, drawH);

      // Subtle outline matching the safe-zone circle
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, safeRadius, 0, Math.PI * 2);
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

  let frameW: number;
  let frameH: number;
  let qrX: number;
  let qrY: number;
  let renderQrSize = qrSize;

  switch (shape) {
    case 'tall': {
      frameW = qrSize + qrSize * 0.2;
      frameH = Math.round(qrSize * 1.5);
      renderQrSize = qrSize;
      qrX = (frameW - renderQrSize) / 2;
      qrY = qrSize * 0.1;
      break;
    }
    case 'wide': {
      frameH = qrSize + qrSize * 0.2;
      frameW = Math.round(qrSize * 1.6);
      renderQrSize = qrSize;
      qrX = qrSize * 0.1;
      qrY = (frameH - renderQrSize) / 2;
      break;
    }
    case 'circle': {
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

  ctx.drawImage(qr, qrX, qrY, renderQrSize, renderQrSize);

  if (labelLines.length > 0 && shape !== 'circle') {
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (shape === 'wide') {
      const labelAreaX = qrX + renderQrSize;
      const labelAreaW = frameW - labelAreaX;
      const cx = labelAreaX + labelAreaW / 2;
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
