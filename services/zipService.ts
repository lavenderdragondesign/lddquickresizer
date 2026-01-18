import JSZip from 'jszip';
import { UploadedImage, ResizeSize, ResizeOptions, ExportOptions } from '../types';
import { processImage, generateFilename } from './imageProcessor';

export const createZipExport = async (
  images: UploadedImage[],
  sizes: ResizeSize[],
  options: ResizeOptions,
  exportOptions: ExportOptions,
  filenamePattern: string,
  onProgress: (current: number, total: number, message: string) => void
): Promise<Blob> => {
  const zip = new JSZip();
  const totalOperations = images.length * sizes.length;
  let completedOperations = 0;

  for (const image of images) {
    for (const size of sizes) {
      onProgress(
        completedOperations, 
        totalOperations, 
        `Processing ${image.name} @ ${size.width}x${size.height}`
      );

      try {
        const blob = await processImage(image, size, options);
        if (blob) {
          // Pass "custom" or "export" as the profile name placeholder since profiles are removed
          const filename = generateFilename(filenamePattern, image, size, "export");
          
          let path = filename;

          if (exportOptions.folderStrategy === 'bySize') {
            const folderName = `${size.width}x${size.height}${size.label ? '-' + size.label : ''}`;
            path = `${folderName}/${filename}`;
          } else if (exportOptions.folderStrategy === 'byImage') {
             const baseName = image.name.substring(0, image.name.lastIndexOf('.')) || image.name;
             path = `${baseName}/${filename}`;
          }

          zip.file(path, blob);
        }
      } catch (err) {
        console.error("Error processing image", err);
      }
      
      completedOperations++;
    }
  }

  onProgress(totalOperations, totalOperations, "Compressing ZIP file...");
  return await zip.generateAsync({ type: "blob" });
};