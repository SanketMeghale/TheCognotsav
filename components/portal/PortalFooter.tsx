import React from 'react';
import { shellClassName } from './utils';

export const PortalFooter: React.FC = () => {
  return (
    <footer className="pb-24 pt-5 md:pb-8 md:pt-6">
      <div className={shellClassName}>
        <div className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(145deg,rgba(12,20,35,0.94),rgba(18,27,45,0.86))] px-4 py-5 sm:px-5 sm:py-6">
          <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 overflow-hidden rounded-[1rem] border border-white/10 bg-white/[0.06] p-2">
                <img src="/images/ceasposter.jpeg" alt="CEAS logo" className="h-full w-full rounded-[0.8rem] object-cover" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/80 sm:text-[11px]">CEAS COGNOTSAV 2026</p>
                <p className="mt-1 text-sm text-slate-300">Computer Engineering Association of Students</p>
              </div>
            </div>
            <div className="text-sm text-slate-300">
              Created by <span className="font-semibold text-white">Sanket Meghale</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PortalFooter;
