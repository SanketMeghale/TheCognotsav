import React from 'react';
import { Instagram, Mail, MapPin } from 'lucide-react';
import { shellClassName } from './utils';

export const PortalFooter: React.FC = () => {
  return (
    <footer className="pb-24 pt-5 md:pb-8 md:pt-6">
      <div className={shellClassName}>
        <div className="portal-glow-card portal-glass rounded-[1.8rem] px-4 py-5 sm:px-5 sm:py-6 md:px-8">
          <div className="grid gap-5 md:grid-cols-[1.3fr_0.7fr] md:items-end">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-200/80 sm:text-[11px]">CEAS COGNOTSAV 2026</p>
              <h3 className="mt-2 text-xl font-semibold text-white sm:text-2xl">A cleaner registration experience for participants and organizers.</h3>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Mobile-first event discovery, event-wise payments, and live status tracking for the Computer Engineering Department fest.
              </p>
            </div>

            <div className="grid gap-3">
              <a href="mailto:sanketmeghale@gmail.com" className="rounded-[1.2rem] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-slate-200 transition hover:border-white/20 hover:text-white">
                <Mail size={16} className="mr-2 inline text-cyan-200" />
                sanketmeghale@gmail.com
              </a>
              <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-slate-200">
                <MapPin size={16} className="mr-2 inline text-amber-200" />
                Ahilyanagar, Maharashtra
              </div>
              <a href="#overview" className="rounded-[1.2rem] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-slate-200 transition hover:border-white/20 hover:text-white">
                <Instagram size={16} className="mr-2 inline text-pink-200" />
                Back to top
              </a>
            </div>
          </div>

          <div className="mt-5 border-t border-white/10 pt-4 text-xs uppercase tracking-[0.14em] text-slate-500 sm:text-sm">
            2026 CEAS COGNOTSAV Registration Portal
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PortalFooter;
