export type ResizeMode = "contain" | "cover" | "stretch" | "pad";

export interface ResizeSize {
  id: string;
  label?: string;
  width: number;
  height: number;
}

export interface ResizeProfile {
  id: string;
  name: string;
  description?: string;
  sizes: ResizeSize[];
  filenamePattern: string;
  isDefault?: boolean;
}

export interface UploadedImage {
  id: string;
  file: File;
  name: string;
  width: number;
  height: number;
  url: string;
}

export interface ResizeOptions {
  mode: ResizeMode;
  maintainAspect: boolean;
  keepTransparency: boolean;
  convertJpgToPng: boolean;
  sharpen: boolean;
  padColor: string; // Hex color for padding
}

export interface ExportOptions {
  asZip: boolean;
  folderStrategy: "bySize" | "byImage" | "flat";
}

export type AppStatus = "idle" | "processing" | "completed" | "error";

export interface ProgressState {
  current: number;
  total: number;
  message: string;
}