
import React, { useState, useEffect, useMemo } from 'react';
import { MessageCircle, Phone, X, ShieldAlert, ChevronRight, ChevronDown } from 'lucide-react';
import { GENERAL_SUPPORT, EVENT_SUPPORT_MAPPING, SupportMember } from '../supportConfig';

export interface ContactSupportProps {
  context?: "registration" | "payment" | "competition" | "default";
  type?: "general" | "event";
  eventId?: string;
  autoOpen?: boolean;
}

const ContactSupport: React.FC<ContactSupportProps> = ({ 
  context = "default", 
  type = "general",
  eventId,
  autoOpen = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  useEffect(() => {
    if (autoOpen) {
      const timer = setTimeout(() => setIsOpen(true), 0);
      return () => clearTimeout(timer);
    }
  }, [autoOpen]);

  const members = useMemo((): SupportMember[] => {
    if (type === "event" && eventId && EVENT_SUPPORT_MAPPING[eventId]) {
      return EVENT_SUPPORT_MAPPING[eventId];
    }
    return GENERAL_SUPPORT;
  }, [type, eventId]);

  const isAvailable = useMemo(() => {
    const hour = new Date().getHours();
    return hour >= 9 && hour < 22;
  }, []);

  const bottomClass = useMemo(() => {
    if (context === "registration" || context === "payment") {
      return "bottom-[110px] md:bottom-6";
    }
    return "bottom-6";
  }, [context]);

  return (
    <div className={`fixed right-6 z-[100] font-inter transition-all duration-500 ease-in-out ${bottomClass}`}>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[-1] animate-in fade-in duration-300" 
          onClick={() => setIsOpen(false)}
        />
      )}

      <div 
        className={`absolute bottom-20 right-0 w-[320px] md:w-[380px] bg-[#0f0f0f] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden transition-all duration-500 origin-bottom-right ${
          isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-10 pointer-events-none'
        }`}
      >
        <div className="p-6 bg-gradient-to-br from-cyan-950/50 to-black border-b border-white/5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-orbitron text-sm font-black text-white uppercase tracking-widest">
              {type === "event" ? "Event Incharges" : "Cognotsav Support"}
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {isAvailable ? "Online Now" : "Currently Offline"}
            </span>
          </div>
        </div>

        <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
          {members.map((member) => (
            <div 
              key={member.phone}
              className={`border rounded-2xl transition-all duration-300 ${
                expandedMember === member.name ? 'bg-white/[0.05] border-cyan-500/30' : 'bg-white/[0.02] border-white/5 hover:border-white/10'
              }`}
            >
              <button 
                onClick={() => setExpandedMember(expandedMember === member.name ? null : member.name)}
                className="w-full px-5 py-4 flex items-center justify-between text-left"
              >
                <span className="text-sm font-bold text-gray-200">{member.name}</span>
                {expandedMember === member.name ? <ChevronDown size={16} className="text-cyan-500" /> : <ChevronRight size={16} className="text-gray-600" />}
              </button>
              
              {expandedMember === member.name && (
                <div className="px-5 pb-5 flex flex-col sm:flex-row gap-2 animate-in slide-in-from-top-2 duration-200">
                  <a 
                    href={`tel:${member.phone}`}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all border border-white/10"
                  >
                    <Phone size={14} /> Call
                  </a>
                  <a 
                    href={`https://wa.me/91${member.phone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600/20 hover:bg-green-600/30 rounded-xl text-xs font-black uppercase tracking-widest text-green-400 transition-all border border-green-500/20"
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 bg-black/50 border-t border-white/5 text-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-gray-600 flex items-center justify-center gap-2">
            <ShieldAlert size={10} className="text-yellow-600" /> Professional Support Protocol Active
          </p>
        </div>
      </div>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center w-14 h-14 rounded-full shadow-2xl transition-all duration-300 transform active:scale-95 group ${
          isOpen ? 'bg-white text-black' : 'bg-cyan-600 text-black hover:bg-cyan-500'
        }`}
      >
        <div className="relative flex items-center justify-center">
          {isOpen ? <X size={24} /> : <span className="text-2xl leading-none">📞</span>}
          {!isOpen && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-cyan-600 animate-ping"></span>}
        </div>
      </button>
    </div>
  );
};

export default ContactSupport;
