import {
  QRCodeReader,
  BinaryBitmap,
  HybridBinarizer,
  RGBLuminanceSource,
  DecodeHintType,
} from '@zxing/library';

export interface QRCode {
  data: string;
  location: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
    bottomRight: { x: number; y: number };
  };
}

function decodeFromCanvasData(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  reader: QRCodeReader
): { text: string; points: { x: number; y: number }[] } | null {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const luminances = new Uint8ClampedArray(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    luminances[p] = ((r + 2 * g + b) / 4) & 0xff;
  }

  const hints = new Map();
  hints.set(DecodeHintType.TRY_HARDER, true);

  try {
    const luminance = new RGBLuminanceSource(luminances, width, height);
    const bitmap = new BinaryBitmap(new HybridBinarizer(luminance));
    const result = reader.decode(bitmap, hints);
    const points = result.getResultPoints().map((p) => ({ x: p.getX(), y: p.getY() }));
    return { text: result.getText(), points };
  } catch {
    // try inverted
  }

  try {
    const luminance = new RGBLuminanceSource(luminances, width, height);
    const invertedBitmap = new BinaryBitmap(new HybridBinarizer(luminance.invert()));
    const result = reader.decode(invertedBitmap, hints);
    const points = result.getResultPoints().map((p) => ({ x: p.getX(), y: p.getY() }));
    return { text: result.getText(), points };
  } catch {
    return null;
  }
}

function makeCanvasFromRegion(
  source: HTMLCanvasElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  paddingRatio = 0.06,
) {
  const pad = Math.round(Math.max(sw, sh) * paddingRatio);
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(sw + pad * 2));
  out.height = Math.max(1, Math.round(sh + pad * 2));
  const outCtx = out.getContext('2d');
  if (!outCtx) return null;
  outCtx.fillStyle = '#ffffff';
  outCtx.fillRect(0, 0, out.width, out.height);
  outCtx.drawImage(source, sx, sy, sw, sh, pad, pad, sw, sh);
  return { canvas: out, offsetX: sx - pad, offsetY: sy - pad };
}

function getLongestActiveRun(values: number[], threshold: number, minLength: number) {
  let bestStart = -1;
  let bestEnd = -1;
  let start = -1;

  for (let i = 0; i <= values.length; i++) {
    const active = i < values.length && values[i] >= threshold;
    if (active && start === -1) start = i;
    if ((!active || i === values.length) && start !== -1) {
      const end = i - 1;
      if (end - start + 1 >= minLength && end - start > bestEnd - bestStart) {
        bestStart = start;
        bestEnd = end;
      }
      start = -1;
    }
  }

  return bestStart >= 0 ? { start: bestStart, end: bestEnd } : null;
}

function getDenseQrRegion(source: HTMLCanvasElement) {
  const ctx = source.getContext('2d');
  if (!ctx) return null;

  const { width, height } = source;
  const imgData = ctx.getImageData(0, 0, width, height).data;
  const rowDark = new Array(height).fill(0);
  const colDark = new Array(width).fill(0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = imgData[i + 3];
      if (a < 20) continue;
      const luminance = 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
      if (luminance < 145) {
        rowDark[y]++;
        colDark[x]++;
      }
    }
  }

  const yRun = getLongestActiveRun(rowDark, width * 0.055, Math.max(24, height * 0.22));
  const xRun = getLongestActiveRun(colDark, height * 0.045, Math.max(24, width * 0.22));
  if (!xRun || !yRun) return null;

  const runW = xRun.end - xRun.start + 1;
  const runH = yRun.end - yRun.start + 1;
  const side = Math.max(runW, runH);
  const cx = (xRun.start + xRun.end) / 2;
  const cy = (yRun.start + yRun.end) / 2;
  const expandedSide = Math.min(Math.max(width, height), side * 1.08);
  const sx = Math.max(0, Math.min(width - expandedSide, cx - expandedSide / 2));
  const sy = Math.max(0, Math.min(height - expandedSide, cy - expandedSide / 2));

  return {
    sx: Math.round(sx),
    sy: Math.round(sy),
    sw: Math.round(Math.min(expandedSide, width - sx)),
    sh: Math.round(Math.min(expandedSide, height - sy)),
  };
}

function buildScanCandidates(source: HTMLCanvasElement) {
  const { width, height } = source;
  const candidates: Array<{ canvas: HTMLCanvasElement; offsetX: number; offsetY: number }> = [
    { canvas: source, offsetX: 0, offsetY: 0 },
  ];

  const addRegion = (sx: number, sy: number, sw: number, sh: number, paddingRatio = 0.06) => {
    if (sw < 32 || sh < 32) return;
    const region = makeCanvasFromRegion(source, sx, sy, sw, sh, paddingRatio);
    if (region) candidates.push(region);
  };

  const side = Math.min(width, height);
  if (height > width * 1.03) {
    addRegion(0, 0, side, side, 0.03);
    addRegion(0, Math.round((height - side) / 2), side, side, 0.03);
  }
  if (width > height * 1.03) {
    addRegion(0, 0, side, side, 0.03);
    addRegion(Math.round((width - side) / 2), 0, side, side, 0.03);
  }

  const denseRegion = getDenseQrRegion(source);
  if (denseRegion) addRegion(denseRegion.sx, denseRegion.sy, denseRegion.sw, denseRegion.sh, 0.1);

  return candidates;
}

export const scanQRCode = async (file: File): Promise<QRCode[]> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const fileReader = new FileReader();

    fileReader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Could not get canvas context')); return; }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const results: QRCode[] = [];
      const foundData = new Set<string>();
      const reader = new QRCodeReader();

      const addResult = (text: string, points: { x: number; y: number }[], offsetX = 0, offsetY = 0) => {
        if (foundData.has(text)) return;
        foundData.add(text);
        results.push({
          data: text,
          location: {
            topLeft: { x: (points[0]?.x || 0) + offsetX, y: (points[0]?.y || 0) + offsetY },
            topRight: { x: (points[1]?.x || 0) + offsetX, y: (points[1]?.y || 0) + offsetY },
            bottomLeft: { x: (points[2]?.x || 0) + offsetX, y: (points[2]?.y || 0) + offsetY },
            bottomRight: { x: (points[3]?.x || 0) + offsetX, y: (points[3]?.y || 0) + offsetY },
          },
        });
      };

      for (const candidate of buildScanCandidates(canvas)) {
        const candidateCtx = candidate.canvas.getContext('2d');
        if (!candidateCtx) continue;
        const decoded = decodeFromCanvasData(candidateCtx, candidate.canvas.width, candidate.canvas.height, reader);
        if (decoded) addResult(decoded.text, decoded.points, candidate.offsetX, candidate.offsetY);
      }

      const divisions = [2, 3, 4];
      for (const div of divisions) {
        for (let row = 0; row < div; row++) {
          for (let col = 0; col < div; col++) {
            const rx = Math.floor((col * canvas.width) / div);
            const ry = Math.floor((row * canvas.height) / div);
            const rw = Math.floor(canvas.width / div);
            const rh = Math.floor(canvas.height / div);
            const regionCanvas = document.createElement('canvas');
            regionCanvas.width = rw;
            regionCanvas.height = rh;
            const regionCtx = regionCanvas.getContext('2d');
            if (!regionCtx) continue;
            regionCtx.drawImage(canvas, rx, ry, rw, rh, 0, 0, rw, rh);
            const result = decodeFromCanvasData(regionCtx, rw, rh, reader);
            if (result) addResult(result.text, result.points, rx, ry);
          }
        }
      }

      if (results.length < 2) {
        const bwCanvas = document.createElement('canvas');
        bwCanvas.width = canvas.width;
        bwCanvas.height = canvas.height;
        const bwCtx = bwCanvas.getContext('2d');
        if (bwCtx) {
          bwCtx.drawImage(canvas, 0, 0);
          const imgData = bwCtx.getImageData(0, 0, bwCanvas.width, bwCanvas.height);
          for (let i = 0; i < imgData.data.length; i += 4) {
            const gray = 0.299 * imgData.data[i] + 0.587 * imgData.data[i + 1] + 0.114 * imgData.data[i + 2];
            const bw = gray < 128 ? 0 : 255;
            imgData.data[i] = bw;
            imgData.data[i + 1] = bw;
            imgData.data[i + 2] = bw;
          }
          bwCtx.putImageData(imgData, 0, 0);
          for (const div of divisions) {
            for (let row = 0; row < div; row++) {
              for (let col = 0; col < div; col++) {
                const rx = Math.floor((col * bwCanvas.width) / div);
                const ry = Math.floor((row * bwCanvas.height) / div);
                const rw = Math.floor(bwCanvas.width / div);
                const rh = Math.floor(bwCanvas.height / div);
                const regionCanvas = document.createElement('canvas');
                regionCanvas.width = rw;
                regionCanvas.height = rh;
                const regionCtx = regionCanvas.getContext('2d');
                if (!regionCtx) continue;
                regionCtx.drawImage(bwCanvas, rx, ry, rw, rh, 0, 0, rw, rh);
                const result = decodeFromCanvasData(regionCtx, rw, rh, reader);
                if (result) addResult(result.text, result.points, rx, ry);
              }
            }
          }
        }
      }

      resolve(results);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    fileReader.onerror = () => reject(new Error('Failed to read file'));
    fileReader.readAsDataURL(file);
  });
};
