import React, { useState } from 'react';
import { ResizeSize, ResizeOptions } from '../types';
import { PlusIcon } from './Icons';

interface SizesAndOptionsProps {
  allSizes: ResizeSize[];
  selectedSizeIds: string[];
  toggleSize: (id: string) => void;
  addCustomSize: (w: number, h: number) => void;
  resizeOptions: ResizeOptions;
  setResizeOptions: (opt: ResizeOptions) => void;
}

const SizesAndOptions: React.FC<SizesAndOptionsProps> = ({
  allSizes,
  selectedSizeIds,
  toggleSize,
  addCustomSize,
  resizeOptions,
  setResizeOptions
}) => {
  const [customW, setCustomW] = useState('');
  const [customH, setCustomH] = useState('');

  const handleAddCustom = () => {
    const w = parseInt(customW);
    const h = parseInt(customH);
    if (w > 0 && h > 0) {
      addCustomSize(w, h);
      setCustomW('');
      setCustomH('');
    }
  };

  const handleOptionChange = <K extends keyof ResizeOptions>(key: K, value: ResizeOptions[K]) => {
    setResizeOptions({ ...resizeOptions, [key]: value });
  };

  return (
    <div className="flex-1 overflow-y-auto p-10 space-y-12 bg-slate-900 h-full">
      {/* Header */}
      <div>
        <h2 className="text-4xl font-black text-slate-100">
          Export Configuration
        </h2>
        <p className="text-slate-400 text-xl mt-2">Select output sizes and tweak processing settings.</p>
      </div>

      {/* Sizes Selection */}
      <section>
        <div className="flex justify-between items-end mb-6">
          <label className="block text-xl font-bold text-slate-300">Output Sizes</label>
          <div className="text-lg text-brand-400 font-medium cursor-pointer hover:text-brand-300" onClick={() => {
             // Select all helper logic could go here
          }}>
             {selectedSizeIds.length} selected
          </div>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {allSizes.map((size) => {
            const isSelected = selectedSizeIds.includes(size.id);
            return (
              <button
                key={size.id}
                onClick={() => toggleSize(size.id)}
                className={`relative px-6 py-5 rounded-2xl border-2 text-left transition-all ${
                  isSelected 
                    ? 'border-brand-500 bg-brand-900/30 text-brand-400 shadow-md scale-[1.02]' 
                    : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
              >
                <div className="text-2xl font-bold">{size.width} × {size.height}</div>
                {size.label && <div className="text-lg opacity-75 mt-1">{size.label}</div>}
                
                {isSelected && (
                  <div className="absolute top-4 right-4 text-brand-400">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Add Custom Size */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 flex items-center gap-4">
          <input 
            type="number" 
            placeholder="W" 
            className="w-40 px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-xl text-xl text-white placeholder-slate-500 focus:ring-brand-500 focus:border-brand-500 outline-none"
            value={customW}
            onChange={(e) => setCustomW(e.target.value)}
          />
          <span className="text-2xl text-slate-500">×</span>
          <input 
            type="number" 
            placeholder="H" 
            className="w-40 px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-xl text-xl text-white placeholder-slate-500 focus:ring-brand-500 focus:border-brand-500 outline-none"
            value={customH}
            onChange={(e) => setCustomH(e.target.value)}
          />
          <button 
            onClick={handleAddCustom}
            className="ml-auto flex items-center px-6 py-3 bg-slate-700 border-2 border-slate-600 rounded-xl text-lg font-bold text-slate-300 hover:bg-slate-600 hover:text-white hover:border-slate-500 transition-colors"
          >
            <PlusIcon className="w-6 h-6 mr-2"/> Add
          </button>
        </div>
      </section>

      {/* Resize Options */}
      <section className="space-y-8 pt-8 border-t border-slate-800">
        <label className="block text-2xl font-bold text-slate-300">Processing Options</label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Fit Mode */}
          <div>
            <label className="text-lg text-slate-500 block mb-2">Fit Mode</label>
            <div className="relative">
              <select 
                value={resizeOptions.mode}
                onChange={(e) => handleOptionChange('mode', e.target.value as any)}
                className="w-full px-5 py-4 border-2 border-slate-700 rounded-xl text-xl bg-slate-800 text-white focus:ring-brand-500 focus:border-brand-500 outline-none appearance-none"
              >
                <option value="contain">Contain (Fit inside)</option>
                <option value="cover">Cover (Crop to fill)</option>
                <option value="stretch">Stretch (Distort)</option>
                <option value="pad">Pad (Fit & fill background)</option>
              </select>
               <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  <svg className="h-6 w-6 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
              </div>
            </div>
          </div>

          {/* Background Color (only for pad or no-transparency) */}
          {(resizeOptions.mode === 'pad' || !resizeOptions.keepTransparency) && (
             <div>
               <label className="text-lg text-slate-500 block mb-2">Background Color</label>
               <div className="flex items-center gap-4">
                 <input 
                    type="color" 
                    value={resizeOptions.padColor}
                    onChange={(e) => handleOptionChange('padColor', e.target.value)}
                    className="h-16 w-16 p-1 border-2 border-slate-600 bg-slate-700 rounded-xl cursor-pointer"
                 />
                 <span className="text-xl font-mono text-slate-400 uppercase tracking-wider">{resizeOptions.padColor}</span>
               </div>
             </div>
          )}
        </div>

        <div className="space-y-6">
           <label className="flex items-center space-x-5 cursor-pointer p-4 rounded-xl hover:bg-slate-800/50 transition-colors -ml-4">
             <input 
               type="checkbox" 
               checked={resizeOptions.maintainAspect}
               onChange={(e) => handleOptionChange('maintainAspect', e.target.checked)}
               disabled={resizeOptions.mode === 'stretch'}
               className="h-8 w-8 text-brand-500 rounded-lg border-2 border-slate-600 bg-slate-700 focus:ring-brand-500 focus:ring-offset-slate-900"
             />
             <span className="text-xl text-slate-300">Maintain Aspect Ratio</span>
           </label>

           <label className="flex items-center space-x-5 cursor-pointer p-4 rounded-xl hover:bg-slate-800/50 transition-colors -ml-4">
             <input 
               type="checkbox" 
               checked={resizeOptions.keepTransparency}
               onChange={(e) => handleOptionChange('keepTransparency', e.target.checked)}
               disabled={resizeOptions.convertJpgToPng === false && resizeOptions.padColor !== '' && resizeOptions.mode === 'pad'}
               className="h-8 w-8 text-brand-500 rounded-lg border-2 border-slate-600 bg-slate-700 focus:ring-brand-500 focus:ring-offset-slate-900"
             />
             <span className="text-xl text-slate-300">Keep Transparency (PNG/WebP)</span>
           </label>

           <label className="flex items-center space-x-5 cursor-pointer p-4 rounded-xl hover:bg-slate-800/50 transition-colors -ml-4">
             <input 
               type="checkbox" 
               checked={resizeOptions.convertJpgToPng}
               onChange={(e) => handleOptionChange('convertJpgToPng', e.target.checked)}
               className="h-8 w-8 text-brand-500 rounded-lg border-2 border-slate-600 bg-slate-700 focus:ring-brand-500 focus:ring-offset-slate-900"
             />
             <span className="text-xl text-slate-300">Force Convert to PNG</span>
           </label>

           <label className="flex items-center space-x-5 cursor-pointer p-4 rounded-xl hover:bg-slate-800/50 transition-colors -ml-4">
             <input 
               type="checkbox" 
               checked={resizeOptions.sharpen}
               onChange={(e) => handleOptionChange('sharpen', e.target.checked)}
               className="h-8 w-8 text-brand-500 rounded-lg border-2 border-slate-600 bg-slate-700 focus:ring-brand-500 focus:ring-offset-slate-900"
             />
             <span className="text-xl text-slate-300">Apply Slight Sharpening</span>
           </label>
        </div>
      </section>
    </div>
  );
};

export default SizesAndOptions;