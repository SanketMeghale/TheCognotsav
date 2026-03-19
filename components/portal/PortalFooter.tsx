import React from 'react';
import { CalendarDays, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { shellClassName } from './utils';

export const PortalFooter: React.FC = () => {
  return (
    <footer className="pt-4 pb-12 md:pt-6 md:pb-16">
      <div className={`${shellClassName}`}>
        <div className="portal-glow-card portal-glass overflow-hidden rounded-[2rem] p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
            <div className="flex gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/5 p-1 shadow-[0_0_25px_rgba(59,130,246,0.14)]">
                <img
                  src="/images/ceasposter.jpeg"
                  alt="CEAS logo"
                  className="h-full w-full rounded-[1rem] object-cover"
                />
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-blue-300/80">CEAS Portal</p>
                <h3 className="mt-2 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text font-orbitron text-2xl font-black uppercase text-transparent">
                  CEAS COGNOTSAV 2026
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
                  Computer Engineering Association of Students registration portal for competitions,
                  payments, live tracking, and organizer verification.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-blue-400/16 bg-blue-500/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-blue-100">
                    Participant first
                  </span>
                  <span className="rounded-full border border-purple-400/16 bg-purple-500/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-purple-100">
                    Verified payments
                  </span>
                  <span className="rounded-full border border-yellow-400/16 bg-yellow-500/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-yellow-100">
                    Event day ready
                  </span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-blue-300/80">Portal Details</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-3 rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3">
                  <CalendarDays size={18} className="mt-0.5 text-yellow-300" />
                  <div>
                    <p className="text-sm font-semibold text-white">Fest dates</p>
                    <p className="text-sm text-slate-300">07-08 April 2026</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3">
                  <MapPin size={18} className="mt-0.5 text-blue-300" />
                  <div>
                    <p className="text-sm font-semibold text-white">Venue</p>
                    <p className="text-sm text-slate-300">CE Department, Ahilyanagar</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3">
                  <ShieldCheck size={18} className="mt-0.5 text-purple-300" />
                  <div>
                    <p className="text-sm font-semibold text-white">System</p>
                    <p className="text-sm text-slate-300">Registrations, tracker, and export workflow</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-blue-300/80">Quick Links</p>
              <div className="mt-4 grid gap-3">
                <a href="#overview" className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:border-blue-400/30 hover:text-white">
                  Overview
                </a>
                <a href="#timeline" className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:border-purple-400/30 hover:text-white">
                  Timeline Page
                </a>
                <a href="#registration-panel" className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:border-pink-400/30 hover:text-white">
                  Register
                </a>
                <a href="#tracker" className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:border-yellow-400/30 hover:text-white">
                  Tracker
                </a>
                <a href="#admin-registrations" className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-400/30 hover:text-white">
                  Admin Page
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-400">
              © 2026 CEAS COGNOTSAV Registration Portal. All rights reserved.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
              <Sparkles size={16} className="text-blue-300" />
              Created and maintained by <span className="font-semibold text-white">Sanket Meghale</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PortalFooter;
