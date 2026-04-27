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

  // 2. Overlay logo if provided — safe-zone shape adapts to the QR frame.
  //    circle frame  → circular crop (logo fills the disc, longest edge = diameter)
  //    rounded frame → rounded-square crop
  //    square/tall/wide → aspect-preserving fit on a circular safe-zone
  if (logoImage) {
    const ctx = qrCanvas.getContext('2d');
    if (ctx) {
      const boxSize = qrCanvas.width * logoSize;
      const cx = qrCanvas.width / 2;
      const cy = qrCanvas.height / 2;
      const naturalW = logoImage.naturalWidth || logoImage.width || boxSize;
      const naturalH = logoImage.naturalHeight || logoImage.height || boxSize;

      const drawCircularSafeZone = (radius: number) => {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      };

      if (frameShape === 'circle') {
        // Circular logo crop — logo's longest edge = disc diameter (cover-fit, no stretch)
        const radius = boxSize / 2;
        drawCircularSafeZone(radius + 6);
        const scale = Math.max((radius * 2) / naturalW, (radius * 2) / naturalH);
        const drawW = naturalW * scale;
        const drawH = naturalH * scale;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logoImage, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
        ctx.restore();
      } else if (frameShape === 'rounded') {
        // Rounded-square logo crop matching the frame personality
        const side = boxSize;
        const r = side * 0.18;
        const x = cx - side / 2;
        const y = cy - side / 2;
        // White rounded safe-zone (slightly larger)
        const pad = 6;
        ctx.fillStyle = '#ffffff';
        roundRect(ctx, x - pad, y - pad, side + pad * 2, side + pad * 2, r + pad);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 2;
        roundRect(ctx, x - pad, y - pad, side + pad * 2, side + pad * 2, r + pad);
        ctx.stroke();
        // Cover-fit the logo inside the rounded square
        const scale = Math.max(side / naturalW, side / naturalH);
        const drawW = naturalW * scale;
        const drawH = naturalH * scale;
        ctx.save();
        roundRect(ctx, x, y, side, side, r);
        ctx.clip();
        ctx.drawImage(logoImage, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
        ctx.restore();
      } else {
        // Default: aspect-preserving fit (works for any logo proportion without stretching)
        const scale = Math.min(boxSize / naturalW, boxSize / naturalH);
        const drawW = naturalW * scale;
        const drawH = naturalH * scale;
        const safeRadius = Math.max(drawW, drawH) / 2 + 8;
        drawCircularSafeZone(safeRadius);
        ctx.drawImage(logoImage, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
      }
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
