import React from 'react';
import { ResizeProfile } from '../types';
import { ChevronRightIcon } from './Icons';

interface ProfileSidebarProps {
  profiles: ResizeProfile[];
  activeProfile: ResizeProfile | null;
  onSelectProfile: (profile: ResizeProfile) => void;
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ profiles, activeProfile, onSelectProfile }) => {
  return (
    <div className="bg-white border-l border-slate-200 h-full flex flex-col w-full md:w-80 flex-shrink-0">
      <div className="p-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800">Resize Profiles</h2>
        <p className="text-xs text-slate-500 mt-1">Select a preset to apply sizes & settings.</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            onClick={() => onSelectProfile(profile)}
            className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group ${
              activeProfile?.id === profile.id
                ? 'border-brand-500 bg-brand-50 shadow-sm ring-1 ring-brand-500'
                : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className={`font-medium ${activeProfile?.id === profile.id ? 'text-brand-700' : 'text-slate-700'}`}>
                  {profile.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {profile.description}
                </p>
                <div className="mt-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                  {profile.sizes.length} sizes
                </div>
              </div>
              {activeProfile?.id === profile.id && (
                 <div className="text-brand-500">
                   <ChevronRightIcon />
                 </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProfileSidebar;