import { ResizeOptions, ExportOptions, ResizeSize } from './types';

export const DEFAULT_INITIAL_SIZES: ResizeSize[] = [
  { id: "4500-5400-shirt", width: 4500, height: 5400, label: "POD Default" },
  { id: "4500-4500-shirt", width: 4500, height: 4500, label: "Merch Square" },
  { id: "def-1080", width: 1080, height: 1080, label: "Instagram Post" },
  { id: "def-story", width: 1080, height: 1920, label: "Instagram Story" },
  { id: "3000-3000-etsy", width: 3000, height: 3000, label: "Etsy Listing" },
  { id: "def-print", width: 2400, height: 3000, label: "8x10 Print" },
  { id: "2048-2048-web", width: 2048, height: 2048, label: "2K Resolution" },
  { id: "1200-1200-web", width: 1200, height: 1200, label: "Web Preview" }
];

export const DEFAULT_RESIZE_OPTIONS: ResizeOptions = {
  mode: "contain",
  maintainAspect: true,
  keepTransparency: true,
  convertJpgToPng: false,
  sharpen: false,
  padColor: "#ffffff"
};

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  asZip: true,
  folderStrategy: "bySize"
};

export const DEFAULT_FILENAME_PATTERN = "{{basename}}_{{width}}x{{height}}";