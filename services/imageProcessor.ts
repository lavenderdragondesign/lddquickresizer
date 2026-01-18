import { UploadedImage, ResizeSize, ResizeOptions } from '../types';

// --- DPI Utilities ---

// CRC Table for PNG
const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ 0xffffffff;
}

// 300 DPI = 11811 pixels per meter (approx)
const PPM_300_DPI = 11811;

const force300Dpi = async (blob: Blob): Promise<Blob> => {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (blob.type === 'image/jpeg') {
    // Modify APP0 marker (JFIF)
    // Structure: FFE0 (2) + Length (2) + 'JFIF\0' (5) + Version (2) + Units (1) + Xdens (2) + Ydens (2)
    // We look for FF E0
    if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
      // Scan for APP0
      let ptr = 2;
      while (ptr < bytes.length) {
        if (bytes[ptr] === 0xFF && bytes[ptr + 1] === 0xE0) {
          // Found APP0
          // Offset 13 is units. 1 = dots/inch
          const app0Start = ptr;
          // Check for JFIF signature at offset 6 from app0Start
          if (bytes[app0Start + 6] === 0x4A && bytes[app0Start + 7] === 0x46 && 
              bytes[app0Start + 8] === 0x49 && bytes[app0Start + 9] === 0x46) {
              
            bytes[app0Start + 13] = 1; // Units: Dots per inch
            
            // X Density (300 = 0x012C)
            bytes[app0Start + 14] = 0x01;
            bytes[app0Start + 15] = 0x2C;
            
            // Y Density
            bytes[app0Start + 16] = 0x01;
            bytes[app0Start + 17] = 0x2C;
            
            return new Blob([bytes], { type: 'image/jpeg' });
          }
          break; // Stop if APP0 found but not JFIF (unlikely) or handled
        }
        ptr++;
        // Limit scan to first 100 bytes to be safe/fast
        if (ptr > 100) break;
      }
    }
  } else if (blob.type === 'image/png') {
    // Insert pHYs chunk
    // IHDR is always first chunk. It ends at byte 33 (8 signature + 25 IHDR).
    // We will insert pHYs right after IHDR.
    
    // Check PNG signature
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      
      const pHYs_Length = 9;
      const chunkTotalSize = 4 + 4 + pHYs_Length + 4; // Len + Type + Data + CRC
      
      const newBytes = new Uint8Array(bytes.length + chunkTotalSize);
      
      // Copy signature (8) + IHDR (25) = 33 bytes
      const insertPos = 33;
      newBytes.set(bytes.slice(0, insertPos), 0);
      
      // Construct pHYs chunk
      const chunkView = new DataView(new ArrayBuffer(chunkTotalSize));
      
      // Length
      chunkView.setUint32(0, pHYs_Length);
      // Type 'pHYs' (0x70485973)
      chunkView.setUint8(4, 0x70);
      chunkView.setUint8(5, 0x48);
      chunkView.setUint8(6, 0x59);
      chunkView.setUint8(7, 0x73);
      // Data: X axis PPU (pixels per unit)
      chunkView.setUint32(8, PPM_300_DPI);
      // Data: Y axis PPU
      chunkView.setUint32(12, PPM_300_DPI);
      // Data: Unit specifier (1 = meter)
      chunkView.setUint8(16, 1);
      
      // Calculate CRC
      // CRC covers Type + Data (bytes 4 to 16 inclusive, total 13 bytes)
      const crcData = new Uint8Array(chunkView.buffer.slice(4, 17));
      const crcVal = crc32(crcData);
      chunkView.setUint32(17, crcVal);
      
      newBytes.set(new Uint8Array(chunkView.buffer), insertPos);
      
      // Copy rest of original file
      newBytes.set(bytes.slice(insertPos), insertPos + chunkTotalSize);
      
      return new Blob([newBytes], { type: 'image/png' });
    }
  }

  return blob; // Return original if not patched
}

// --- Image Processing ---

const getOutputDimensions = (
  srcWidth: number,
  srcHeight: number,
  targetWidth: number,
  targetHeight: number,
  mode: ResizeOptions['mode']
) => {
  if (mode === 'stretch') {
    return { width: targetWidth, height: targetHeight, dx: 0, dy: 0, dw: targetWidth, dh: targetHeight };
  }

  const srcRatio = srcWidth / srcHeight;
  const targetRatio = targetWidth / targetHeight;

  let dw = targetWidth;
  let dh = targetHeight;

  if (mode === 'contain' || mode === 'pad') {
    if (srcRatio > targetRatio) {
      dh = targetWidth / srcRatio;
    } else {
      dw = targetHeight * srcRatio;
    }
  } else if (mode === 'cover') {
    if (srcRatio > targetRatio) {
      dw = targetHeight * srcRatio;
    } else {
      dh = targetWidth / srcRatio;
    }
  }

  // Center the image
  const dx = (targetWidth - dw) / 2;
  const dy = (targetHeight - dh) / 2;

  // Previously 'contain' cropped the canvas. Now it returns the full target size.
  // This ensures 4500x5400 output even if the image is smaller/different aspect ratio.
  
  return { width: targetWidth, height: targetHeight, dx, dy, dw, dh };
};

const applySharpen = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const w = width;
  const h = height;
  const mix = 0.2; // Sharpen intensity

  const buffer = new Uint8ClampedArray(data);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      
      // We only sharpen RGB, keep Alpha
      for (let c = 0; c < 3; c++) {
        const val = 
          buffer[idx + c] * 5 +
          buffer[((y - 1) * w + x) * 4 + c] * -1 +
          buffer[((y + 1) * w + x) * 4 + c] * -1 +
          buffer[(y * w + (x - 1)) * 4 + c] * -1 +
          buffer[(y * w + (x + 1)) * 4 + c] * -1;
        
        data[idx + c] = Math.min(255, Math.max(0, val * mix + buffer[idx + c] * (1 - mix)));
      }
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
};

export const processImage = async (
  image: UploadedImage,
  size: ResizeSize,
  options: ResizeOptions
): Promise<Blob | null> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image.url;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) {
        reject(new Error("Could not create canvas context"));
        return;
      }

      // Calculate geometry
      const geom = getOutputDimensions(img.naturalWidth, img.naturalHeight, size.width, size.height, options.mode);

      canvas.width = geom.width;
      canvas.height = geom.height;

      // Handle Background (Pad mode or non-transparent needs)
      if (options.mode === 'pad') {
        ctx.fillStyle = options.padColor || '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (!options.keepTransparency) {
        ctx.fillStyle = '#ffffff'; // Force white background if removing transparency
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // High quality scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(img, geom.dx, geom.dy, geom.dw, geom.dh);

      if (options.sharpen) {
        applySharpen(ctx, canvas.width, canvas.height);
      }

      // Determine output format
      let mimeType = image.file.type;
      if (options.convertJpgToPng) {
        mimeType = 'image/png';
      }
      
      // High quality export
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
             // FORCE 300 DPI METADATA
             const patchedBlob = await force300Dpi(blob);
             resolve(patchedBlob);
          } catch (e) {
             console.warn("Failed to patch DPI, returning standard blob", e);
             resolve(blob);
          }
        } else {
          reject(new Error("Canvas to Blob failed"));
        }
      }, mimeType, 0.95);
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image ${image.name}`));
    };
  });
};

export const generateFilename = (
  pattern: string,
  image: UploadedImage,
  size: ResizeSize,
  profileName: string
): string => {
  const baseName = image.name.substring(0, image.name.lastIndexOf('.')) || image.name;
  
  const tokens: Record<string, string> = {
    "{{basename}}": baseName,
    "{{width}}": String(size.width),
    "{{height}}": String(size.height),
    "{{profile}}": profileName.replace(/\s+/g, '-').toLowerCase()
  };

  let result = pattern;
  for (const [token, value] of Object.entries(tokens)) {
    result = result.split(token).join(value);
  }

  // Ensure extension
  let ext = image.name.substring(image.name.lastIndexOf('.'));
  if (!ext) ext = '.png';
  
  // If no extension in result, append original
  if (!result.toLowerCase().endsWith('.jpg') && !result.toLowerCase().endsWith('.png') && !result.toLowerCase().endsWith('.webp')) {
     result += ext;
  }
  
  return result;
};