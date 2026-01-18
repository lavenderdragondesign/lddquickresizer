import React, { useState } from 'react';
import { 
  UploadedImage, 
  ResizeSize, 
  ResizeOptions, 
  ExportOptions,
  AppStatus,
  ProgressState
} from './types';
import { 
  DEFAULT_RESIZE_OPTIONS, 
  DEFAULT_EXPORT_OPTIONS, 
  DEFAULT_FILENAME_PATTERN,
  DEFAULT_INITIAL_SIZES
} from './constants';

import UploadSection from './components/UploadSection';
import ImageListPanel from './components/ImageListPanel';
import SizesAndOptions from './components/SizesAndOptions';
import { DownloadIcon } from './components/Icons';
import { createZipExport } from './services/zipService';

const App: React.FC = () => {
  // --- State ---
  const [images, setImages] = useState<UploadedImage[]>([]);
  
  // Sizes state: All sizes are now loaded by default
  const [allSizes, setAllSizes] = useState<ResizeSize[]>(DEFAULT_INITIAL_SIZES);
  
  // Default to selecting ONLY the POD Default (4500x5400)
  const [selectedSizeIds, setSelectedSizeIds] = useState<string[]>(['4500-5400-shirt']);
  
  // Options
  // Filename pattern state is kept for logic but UI is removed
  const [filenamePattern] = useState(DEFAULT_FILENAME_PATTERN);
  const [resizeOptions, setResizeOptions] = useState<ResizeOptions>(DEFAULT_RESIZE_OPTIONS);
  const [exportOptions, setExportOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  
  // Processing State
  const [status, setStatus] = useState<AppStatus>('idle');
  const [progress, setProgress] = useState<ProgressState>({ current: 0, total: 0, message: '' });

  // --- Handlers ---

  const handleImagesAdded = (newImages: UploadedImage[]) => {
    setImages(prev => [...prev, ...newImages]);
  };

  const handleRemoveImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleToggleSize = (id: string) => {
    setSelectedSizeIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleAddCustomSize = (width: number, height: number) => {
    const newSize: ResizeSize = {
      id: `custom-${width}-${height}-${Date.now()}`,
      width,
      height,
      label: 'Custom'
    };
    setAllSizes(prev => [...prev, newSize]);
    setSelectedSizeIds(prev => [...prev, newSize.id]);
  };

  const handleExport = async () => {
    if (images.length === 0 || selectedSizeIds.length === 0) return;

    setStatus('processing');
    setProgress({ current: 0, total: images.length * selectedSizeIds.length, message: 'Starting...' });

    const selectedSizes = allSizes.filter(s => selectedSizeIds.includes(s.id));

    try {
      // Small delay to allow UI to render the 'processing' state
      await new Promise(r => setTimeout(r, 100));

      const zipBlob = await createZipExport(
        images,
        selectedSizes,
        resizeOptions,
        exportOptions,
        filenamePattern,
        (current, total, message) => {
           setProgress({ current, total, message });
        }
      );

      // Trigger download
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resized_images_${new Date().toISOString().slice(0,10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus('completed');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error(error);
      setStatus('error');
      setProgress({ current: 0, total: 0, message: 'An error occurred during export.' });
    }
  };

  // --- Render Helpers ---

  const canExport = images.length > 0 && selectedSizeIds.length > 0 && status !== 'processing';

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-8 py-6 flex-shrink-0 z-10 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-white flex items-center gap-4">
            <span className="bg-brand-600 text-white rounded-lg p-2 w-14 h-14 flex items-center justify-center text-xl shadow-lg">LDD</span>
            Bulk Resizer
          </h1>
          <p className="text-lg text-slate-400 mt-2 hidden sm:block">Upload, Resize, Export. High Quality 300 DPI.</p>
        </div>
        <div className="flex items-center gap-8">
            <div className="text-right hidden md:block">
                 <p className="text-lg font-bold text-slate-200">{images.length} Images</p>
                 <p className="text-base text-slate-500">{selectedSizeIds.length} Sizes Selected</p>
            </div>
            <button
              onClick={handleExport}
              disabled={!canExport}
              className={`flex items-center gap-3 px-8 py-4 rounded-xl font-bold shadow-lg transition-all text-xl ${
                canExport 
                  ? 'bg-brand-600 text-white hover:bg-brand-700 hover:shadow-xl hover:scale-105 transform' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <DownloadIcon className="w-8 h-8" />
              {status === 'processing' ? 'Processing...' : 'Export ZIP'}
            </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Left Column: Image List & Upload */}
        <div className="w-full md:w-[450px] border-r border-slate-800 bg-slate-900 flex flex-col flex-shrink-0 z-0">
           {/* Upload Area (Top of left col) */}
           <div className="p-6 border-b border-slate-800">
             <UploadSection onImagesAdded={handleImagesAdded} />
           </div>
           {/* List */}
           <div className="flex-1 overflow-hidden relative">
             <ImageListPanel images={images} onRemoveImage={handleRemoveImage} />
           </div>
        </div>

        {/* Middle Column: Configuration - Now takes up remaining space */}
        <div className="flex-1 overflow-hidden relative flex flex-col bg-slate-950">
           <SizesAndOptions 
             allSizes={allSizes}
             selectedSizeIds={selectedSizeIds}
             toggleSize={handleToggleSize}
             addCustomSize={handleAddCustomSize}
             resizeOptions={resizeOptions}
             setResizeOptions={setResizeOptions}
           />
        </div>
      </main>

      {/* Overlay for processing status */}
      {status === 'processing' && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="bg-slate-800 p-12 rounded-3xl shadow-2xl border border-slate-700 max-w-2xl w-full text-center">
            <div className="mb-8">
              <div className="w-20 h-20 border-8 border-slate-600 border-t-brand-500 rounded-full animate-spin mx-auto"></div>
            </div>
            <h3 className="text-3xl font-black text-white mb-4">Processing Images</h3>
            <p className="text-xl text-slate-400 mb-8">{progress.message}</p>
            
            <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-brand-500 h-4 rounded-full transition-all duration-300" 
                style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
              ></div>
            </div>
            <p className="text-lg text-slate-500 mt-4 text-right">
              {progress.current} / {progress.total}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;