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

      const full = decodeFromCanvasData(ctx, canvas.width, canvas.height, reader);
      if (full) addResult(full.text, full.points);

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
