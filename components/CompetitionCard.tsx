
import React from 'react';
import { Competition } from '../types';
import { Users, Trophy, ExternalLink, CreditCard, TimerReset } from 'lucide-react';

interface Props {
  competition: Competition;
  onRegister: (comp: Competition) => void;
  slotsLeft?: number;
  registeredTeams?: number;
}

const CompetitionCard: React.FC<Props> = ({ competition, onRegister, slotsLeft, registeredTeams }) => {
  const showSlots = typeof slotsLeft === 'number' && typeof competition.maxSlots === 'number';
  const capacity = showSlots && competition.maxSlots
    ? Math.min((registeredTeams || 0) / competition.maxSlots, 1) * 100
    : 0;

  return (
    <div className="group relative bg-[#111] rounded-2xl overflow-hidden border border-white/5 hover:border-cyan-500/50 transition-all duration-500 hover:-translate-y-2 flex flex-col h-full shadow-2xl">
      {/* Poster */}
      <div className="relative aspect-video overflow-hidden">
        <img 
          src={competition.poster} 
          alt={competition.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 brightness-75 group-hover:brightness-100"
        />
        <div className="absolute top-4 right-4">
          <span className="bg-cyan-500/90 backdrop-blur-sm text-black px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest font-orbitron">
            {competition.category}
          </span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent opacity-80"></div>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-2xl font-black text-white mb-1 group-hover:text-cyan-400 transition-colors font-orbitron">
          {competition.name}
        </h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold text-cyan-500/80 uppercase tracking-widest mb-4">
          <span>{competition.date}</span>
          <span>•</span>
          <span>{competition.time}</span>
          <span>•</span>
          <span>{competition.location}</span>
        </div>
        <p className="text-gray-400 text-sm line-clamp-2 mb-6 flex-grow">
          {competition.description}
        </p>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-gray-400 text-sm">
            <Users size={16} className="text-cyan-500" />
            <span>
              {competition.teamType === 'solo' ? 'Solo Entry' : 
               competition.teamType === 'fixed' ? `${competition.maxMembers} Members Fixed` :
               `${competition.minMembers}-${competition.maxMembers} Members`}
            </span>
          </div>

          {showSlots && (
            <div className="p-3 bg-cyan-500/5 rounded-xl border border-cyan-500/10">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 text-cyan-300 text-xs uppercase tracking-[0.2em] font-black">
                  <TimerReset size={14} />
                  Live Slots
                </div>
                <span className={`text-xs font-black uppercase tracking-widest ${slotsLeft && slotsLeft <= 10 ? 'text-rose-300' : 'text-cyan-300'}`}>
                  {slotsLeft} left
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500" style={{ width: `${capacity}%` }}></div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Trophy size={14} className="text-yellow-500" />
                <span className="text-[9px] uppercase font-bold text-gray-500">Prize Pool</span>
              </div>
              <span className="font-orbitron font-bold text-white text-sm tracking-wider">
                {competition.prize}
              </span>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <CreditCard size={14} className="text-cyan-500" />
                <span className="text-[9px] uppercase font-bold text-gray-500">Reg. Fee</span>
              </div>
              <span className="font-orbitron font-bold text-cyan-400 text-sm tracking-wider">
                {competition.registrationFee}
              </span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => onRegister(competition)}
          className="w-full flex items-center justify-center gap-2 bg-transparent border-2 border-cyan-500/50 hover:bg-cyan-500 hover:text-black text-cyan-400 font-bold py-3 rounded-xl transition-all duration-300 uppercase tracking-widest text-xs"
        >
          Register Now <ExternalLink size={14} />
        </button>
      </div>

      {/* Glow highlight */}
      <div className="absolute -inset-[2px] bg-gradient-to-r from-cyan-500 to-purple-500 rounded-2xl -z-10 opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>
    </div>
  );
};

export default CompetitionCard;
