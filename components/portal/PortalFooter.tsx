import React from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import { shellClassName } from './utils';

export const PortalFooter: React.FC = () => {
  return (
    <footer className="pb-24 pt-5 md:pb-8 md:pt-6">
      <div className={shellClassName}>
        <div className="portal-glow-card portal-glass overflow-hidden rounded-[2rem] p-4 sm:p-5 md:p-6">
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(145deg,rgba(12,20,35,0.94),rgba(18,27,45,0.86))] p-5">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-[1.2rem] border border-white/10 bg-white/[0.06] p-2">
                  <img src="/images/ceasposter.jpeg" alt="CEAS logo" className="h-full w-full rounded-[0.9rem] object-cover" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/80 sm:text-[11px]">CEAS COGNOTSAV 2026</p>
                  <h3 className="mt-1 text-xl font-semibold text-white">Computer Engineering Association of Students</h3>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                A cleaner event portal for competition discovery, registration, payment confirmation, and status tracking.
              </p>
              <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-slate-300">
                Created by <span className="font-semibold text-white">Sanket Meghale</span>
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(145deg,rgba(59,130,246,0.10),rgba(217,70,239,0.08),rgba(251,191,36,0.08))] p-5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-fuchsia-100/80 sm:text-[11px]">Contact Us</p>
              <h4 className="mt-2 text-xl font-semibold text-white">Reach the organizers quickly.</h4>
              <div className="mt-4 grid gap-3">
                <div className="rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-4 text-sm text-slate-200">
                  <Mail size={16} className="mr-2 inline text-cyan-200" />
                  sanketmeghale@gmail.com
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-4 text-sm text-slate-200">
                  <Phone size={16} className="mr-2 inline text-emerald-200" />
                  9356776307
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-4 text-sm text-slate-200">
                  <MapPin size={16} className="mr-2 inline text-amber-200" />
                  DVVPCOE, Ahilyanagar
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PortalFooter;
