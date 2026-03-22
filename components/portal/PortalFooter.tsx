import React from 'react';
import { Github, Instagram, Mail, MapPin, Phone } from 'lucide-react';
import { shellClassName } from './utils';

const FOOTER_QR_URL = 'https://res.cloudinary.com/dkxddhawc/image/upload/v1774197848/My_QR_Code_1-1024_dhiqjw.png';

export const PortalFooter: React.FC = () => {
  return (
    <footer className="pb-14 pt-5 md:pb-20 md:pt-6">
      <div className={shellClassName}>
        <div className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(145deg,rgba(5,8,16,0.98),rgba(9,14,24,0.96))] px-4 py-6 sm:px-5 sm:py-7">
          <div className="grid gap-8 border-b border-white/8 pb-8 lg:grid-cols-[1.15fr_0.8fr_1fr_0.72fr]">
            <div>
              <div className="portal-footer-lockup">
                <div className="portal-footer-lockup__frame">
                  <img src="/images/ceasposter.jpeg" alt="CEAS logo" className="portal-footer-lockup__image" />
                </div>
                <div>
                  <p className="portal-footer-lockup__overline">Computer Engineering Association of Students</p>
                  <p className="font-orbitron text-2xl font-black uppercase text-cyan-300">
                    CEAS<span className="text-white">/COGNOTSAV</span>
                  </p>
                  <p className="portal-footer-lockup__meta">Dr. Vithalrao Vikhe Patil College of Engineering, Ahilyanagar</p>
                </div>
              </div>
              <p className="mt-5 max-w-sm text-sm leading-8 text-slate-400">
                Empowering innovators and shaping the future of technology through collaborative excellence and competitive spirit.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="https://www.instagram.com/dvvp_computer_dept?igsh=a25ieGxjb29lcWw3" target="_blank" rel="noreferrer" className="magnetic-button inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-200">
                  <Instagram size={18} />
                </a>
                <a href="mailto:ceascongnotsav@gmail.com" className="magnetic-button inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-200">
                  <Mail size={18} />
                </a>
                <a href="tel:+918087379885" className="magnetic-button inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-200">
                  <Phone size={18} />
                </a>
                <a href="https://github.com/SanketMeghale/TheCognotsav" target="_blank" rel="noreferrer" className="magnetic-button inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-200">
                  <Github size={18} />
                </a>
              </div>
            </div>

            <div>
              <p className="font-orbitron text-lg font-bold uppercase text-white">Navigation</p>
              <div>
                <div className="mt-5 grid gap-4 text-sm text-slate-300">
                  <a href="#overview" className="transition hover:text-cyan-200">Home</a>
                  <a href="#registration-panel" className="transition hover:text-cyan-200">Events</a>
                  <a href="#announcement-archive" className="transition hover:text-cyan-200">Updates</a>
                  <a href="#faq" className="transition hover:text-cyan-200">FAQ</a>
                </div>
              </div>
            </div>

            <div>
              <p className="font-orbitron text-lg font-bold uppercase text-white">Reach Us</p>
              <div className="mt-5 space-y-5 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="mt-1 shrink-0 text-fuchsia-300" />
                  <span>Computer Engineering Department, Dr. Vithalrao Vikhe Patil College of Engineering, Ahilyanagar, Maharashtra 414001</span>
                </div>
                <a href="mailto:ceascongnotsav@gmail.com" className="flex items-center gap-3 transition hover:text-cyan-200">
                  <Mail size={18} className="shrink-0 text-fuchsia-300" />
                  <span>ceascongnotsav@gmail.com</span>
                </a>
                <a href="tel:+918087379885" className="flex items-center gap-3 transition hover:text-cyan-200">
                  <Phone size={18} className="shrink-0 text-fuchsia-300" />
                  <span>+91 8087379885</span>
                </a>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="rounded-[1.4rem] border-4 border-cyan-400/90 bg-white p-3 shadow-[0_0_34px_rgba(34,211,238,0.24)]">
                <img
                  src={FOOTER_QR_URL}
                  alt="COGNOTSAV portal QR"
                  className="h-36 w-36 rounded-[0.8rem]"
                />
              </div>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">COGNOTSAV 2026 Portal</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 CEAS COGNOTSAV. All Rights Reserved.</p>
            <p>
              Created by <span className="font-semibold text-cyan-300">Sanket Meghale</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PortalFooter;
