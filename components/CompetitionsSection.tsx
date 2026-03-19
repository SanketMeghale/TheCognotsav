
import React, { useEffect, useState } from 'react';
import { COMPETITIONS } from '../constants';
import { EventCategory, Competition } from '../types';
import CompetitionCard from './CompetitionCard';
import { subscribeToGlobalMetrics } from '../firebaseConfig';

interface Props {
  onRegister: (comp: Competition) => void;
}

const CompetitionsSection: React.FC<Props> = ({ onRegister }) => {
  const [filter, setFilter] = useState<EventCategory>(EventCategory.ALL);
  const [competitionStats, setCompetitionStats] = useState<Record<string, { verified?: number; pending?: number }>>({});

  useEffect(() => {
    const unsubscribe = subscribeToGlobalMetrics((metrics) => {
      setCompetitionStats((metrics.competitions as Record<string, { verified?: number; pending?: number }>) || {});
    });

    return () => unsubscribe();
  }, []);

  const filteredCompetitions = COMPETITIONS.filter(comp => 
    filter === EventCategory.ALL || comp.category === filter
  );

  return (
    <section id="events" className="py-24 bg-black px-6 scroll-mt-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div>
            <span className="font-orbitron bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent font-bold uppercase tracking-[0.3em] mb-4 block">Main Attractions</span>
            <h2 className="text-4xl md:text-5xl font-black text-white font-orbitron">
              Featured <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Competitions</span>
            </h2>
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2 md:gap-4 p-2 bg-white/5 rounded-2xl border border-white/10">
            {Object.values(EventCategory).map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-6 py-2 rounded-xl font-bold uppercase tracking-widest text-xs transition-all duration-300 ${
                  filter === cat 
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-white portal-glow-cyan' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5 hover:border-cyan-400/30'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-all duration-500">
          {filteredCompetitions.length > 0 ? (
            filteredCompetitions.map((comp) => (
              <div key={comp.id} className="animate-in fade-in zoom-in-95 duration-500">
                <CompetitionCard
                  competition={comp}
                  onRegister={onRegister}
                  registeredTeams={(competitionStats[comp.name]?.verified || 0) + (competitionStats[comp.name]?.pending || 0)}
                  slotsLeft={typeof comp.maxSlots === 'number'
                    ? Math.max(comp.maxSlots - ((competitionStats[comp.name]?.verified || 0) + (competitionStats[comp.name]?.pending || 0)), 0)
                    : undefined}
                />
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <p className="text-gray-500 italic">No events found in this category. Stay tuned!</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default CompetitionsSection;
