import React from 'react';
import { UploadedImage } from '../types';
import { TrashIcon } from './Icons';

interface ImageListPanelProps {
  images: UploadedImage[];
  onRemoveImage: (id: string) => void;
}

const ImageListPanel: React.FC<ImageListPanelProps> = ({ images, onRemoveImage }) => {
  return (
    <div className="h-full flex flex-col">
       <div className="p-6 border-b border-slate-800 bg-slate-900">
        <h3 className="text-xl font-bold text-slate-200">Uploaded Images</h3>
        <p className="text-sm text-slate-500 mt-1">{images.length} items ready</p>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950">
        {images.length === 0 ? (
          <div className="text-center py-16 text-slate-600">
            <p className="text-lg">No images yet.</p>
          </div>
        ) : (
          images.map((img) => (
            <div key={img.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md flex items-center gap-5 group hover:border-slate-600 transition-colors">
              <div className="w-20 h-20 rounded-lg bg-slate-700 flex-shrink-0 overflow-hidden border border-slate-600">
                <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-slate-200 truncate" title={img.name}>{img.name}</p>
                <p className="text-base text-slate-400 mt-1">{img.width} × {img.height}</p>
              </div>
              <button 
                onClick={() => onRemoveImage(img.id)}
                className="text-slate-500 hover:text-red-400 p-3 rounded-xl hover:bg-slate-700 transition-colors"
                title="Remove image"
              >
                <TrashIcon className="w-8 h-8" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ImageListPanel;