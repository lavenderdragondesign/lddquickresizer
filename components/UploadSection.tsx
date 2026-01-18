import React, { useRef, useState } from 'react';
import { UploadIcon } from './Icons';
import { UploadedImage } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface UploadSectionProps {
  onImagesAdded: (newImages: UploadedImage[]) => void;
}

const UploadSection: React.FC<UploadSectionProps> = ({ onImagesAdded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFiles = async (files: FileList | File[]) => {
    const newImages: UploadedImage[] = [];
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!validTypes.includes(file.type)) continue;

      try {
        const url = URL.createObjectURL(file);
        // Create an image element to get dimensions
        const img = new Image();
        img.src = url;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve; // Continue even if one fails
        });

        newImages.push({
          id: uuidv4(),
          file,
          name: file.name,
          width: img.naturalWidth,
          height: img.naturalHeight,
          url
        });
      } catch (e) {
        console.error("Error reading file", file.name, e);
      }
    }

    if (newImages.length > 0) {
      onImagesAdded(newImages);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div 
      className={`border-4 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer group ${
        isDragging 
          ? 'border-brand-500 bg-brand-900/20' 
          : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
    >
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="text-slate-600 group-hover:text-slate-400 transition-colors">
            <UploadIcon className="w-24 h-24" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-300">
            Drag & drop images
          </p>
          <p className="text-lg text-slate-500 mt-2">or click to browse</p>
        </div>
      </div>
      <input 
        type="file" 
        multiple 
        accept="image/png, image/jpeg, image/webp" 
        className="hidden" 
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files) processFiles(Array.from(e.target.files));
          e.target.value = ''; // Reset input
        }}
      />
    </div>
  );
};

export default UploadSection;