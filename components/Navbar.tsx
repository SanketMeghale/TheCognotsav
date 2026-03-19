
import React, { useState, useEffect } from 'react';
import { Menu, X, ShieldAlert } from 'lucide-react';

interface Props {
  onAdminClick?: () => void;
}

const Navbar: React.FC<Props> = ({ onAdminClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#' },
    { name: 'Tracker', href: '#tracker' },
    { name: 'Events', href: '#events' },
    { name: 'About', href: '#about' },
    { name: 'FAQ', href: '#faq' },
  ];

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-black/85 backdrop-blur-lg py-3 border-b border-cyan-400/40 portal-glow-cyan' : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <a href="#" className="flex items-center gap-2 group">
          <span className="font-orbitron text-2xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent tracking-tighter group-hover:portal-glow-cyan transition-all">
            CEAS
          </span>
          <div className="h-6 w-[2px] bg-gradient-to-b from-purple-500 to-pink-500 rotate-12 mx-1"></div>
          <span className="font-orbitron text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent tracking-widest sm:inline">
            COGNOTSAV
          </span>
        </a>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a 
              key={link.name}
              href={link.href}
              className="font-medium text-gray-300 hover:text-cyan-400 transition-colors uppercase tracking-widest text-sm"
            >
              {link.name}
            </a>
          ))}
          <div className="flex items-center gap-4 border-l border-white/10 pl-8">
            <button 
              onClick={onAdminClick}
              className="p-2 text-gray-500 hover:text-cyan-400 transition-colors"
              title="Admin Portal"
            >
              <ShieldAlert size={20} />
            </button>
            <a 
              href="#events" 
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-full font-bold transition-all glow-cyan transform hover:scale-105 active:scale-95 text-xs uppercase"
            >
              Register
            </a>
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex items-center gap-4 md:hidden">
           <button onClick={onAdminClick} className="text-gray-500"><ShieldAlert size={20} /></button>
           <button 
            className="text-white"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-black/95 border-b border-cyan-500/30 py-6 px-6 flex flex-col gap-4 animate-in fade-in slide-in-from-top-5">
          {navLinks.map((link) => (
            <a 
              key={link.name}
              href={link.href}
              className="text-xl font-bold text-gray-200 hover:text-cyan-400"
              onClick={() => setIsOpen(false)}
            >
              {link.name}
            </a>
          ))}
          <a 
            href="#events" 
            className="w-full text-center bg-cyan-600 text-white py-3 rounded-xl font-bold mt-2"
            onClick={() => setIsOpen(false)}
          >
            Explore Events
          </a>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
