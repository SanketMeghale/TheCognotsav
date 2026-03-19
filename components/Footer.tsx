
import React from 'react';
import { Instagram, Facebook, Twitter, Mail, MapPin, Phone, Github, Shield } from 'lucide-react';

interface Props {
  onAdminClick?: () => void;
}

const Footer: React.FC<Props> = ({ onAdminClick }) => {
  return (
    <footer id="footer" className="bg-black pt-24 pb-12 border-t border-white/5 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Info */}
          <div className="space-y-6">
            <a href="#" className="flex items-center gap-2">
              <span className="font-orbitron text-3xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent tracking-tighter">CEAS</span>
              <div className="h-6 w-[2px] bg-gradient-to-b from-purple-500 to-pink-500 rotate-12"></div>
              <span className="font-orbitron text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent tracking-widest">COGNOTSAV</span>
            </a>
            <p className="text-gray-500 leading-relaxed max-w-xs">
              Empowering innovators and shaping the future of technology through collaborative excellence and competitive spirit.
            </p>
            <div className="flex gap-4">
              {[Instagram, Facebook, Twitter, Github].map((Icon, i) => (
                <a key={i} href="#" className="p-3 bg-white/5 rounded-full text-gray-400 hover:text-pink-400 hover:bg-pink-500/10 transition-all border border-white/5 hover:border-pink-400/30 hover:portal-glow-pink">
                  <Icon size={20} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-orbitron text-white font-bold mb-6 uppercase tracking-widest text-sm">Navigation</h4>
            <ul className="space-y-4">
              {['Home', 'Tracker', 'Events', 'About', 'FAQ'].map((link) => (
                <li key={link}>
                  <a href={`#${link.toLowerCase()}`} className="text-gray-500 hover:text-cyan-300 transition-colors hover:portal-glow-cyan">
                    {link}
                  </a>
                </li>
              ))}
              <li>
                <button 
                  onClick={onAdminClick}
                  className="text-gray-700 hover:text-purple-300 transition-colors flex items-center gap-2 group italic hover:portal-glow-purple"
                >
                  <Shield size={14} className="group-hover:animate-pulse" /> Command Center
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="font-orbitron text-white font-bold mb-6 uppercase tracking-widest text-sm">Reach Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-4 text-gray-500">
                <MapPin size={20} className="text-purple-500 shrink-0" />
                <span>Computer Engineering Department, Dr. Vithalrao Vikhe Patil College of Engineering, Savitribai Phule Pune University, Ahilyanagar, Maharashtra 414001</span>
              </li>
              <li className="flex items-center gap-4 text-gray-500">
                <Mail size={20} className="text-purple-500 shrink-0" />
                <span>cognoutsav@gmail.com</span>
              </li>
              <li className="flex items-center gap-4 text-gray-500">
                <Phone size={20} className="text-purple-500 shrink-0" />
                <span>+91 8087379885</span>
              </li>
            </ul>
          </div>

          {/* QR & Support */}
          <div className="flex flex-col items-center lg:items-end">
            <div className="p-4 bg-white rounded-2xl mb-4 w-fit border-4 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <img 
                src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://cognotsav.vercel.app" 
                alt="Cognotsav 2026 Portal QR Code"
                className="w-32 h-32"
                referrerPolicy="no-referrer"
              />
            </div>
            <p className="text-gray-500 text-xs text-center lg:text-right uppercase tracking-widest font-bold">
              Cognotsav 2026 Portal
            </p>
          </div>
        </div>

        <div className="border-t border-white/5 pt-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-gray-500 text-sm">
            &copy; 2026 CEAS COGNOTSAV. All Rights Reserved.
          </p>
          <p className="text-gray-500 text-sm font-medium">
            Designed with <span className="text-red-500 animate-pulse">❤️</span> by <span className="text-cyan-400 font-orbitron font-bold">CE Department</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
