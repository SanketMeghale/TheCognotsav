import React from 'react';
import { shellClassName } from './utils';

const posters = [
  { title: 'TechKBC', image: '/images/techkbc.jpg' },
  { title: 'Ranbhoomi BGMI', image: '/images/bgmi.jpg' },
  { title: 'Ranbhoomi Free Fire', image: '/images/freefire.jpg' },
  { title: 'Squid Game', image: '/images/squidgame.jpg' },
  { title: 'Rangmanch', image: '/images/rangmanch.jpg' },
  { title: 'Tech Treasure Hunt', image: '/images/techtreasurehunt.jpg' },
  { title: 'Techxcelerate', image: '/images/projectexpo.jpg' },
  { title: 'UTOPIA', image: '/images/hackathon.jpg' },
];

export const PosterGallerySection: React.FC = () => {
  const reel = [...posters, ...posters];

  return (
    <section className={`${shellClassName} py-4 md:py-8`}>
      <div className="overflow-hidden rounded-[2.2rem] border border-cyan-300/10 bg-[linear-gradient(145deg,rgba(8,18,33,0.92),rgba(18,12,37,0.88))] p-6 shadow-[0_30px_120px_rgba(2,8,23,0.28)] md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-200/80">Competition Posters</p>
            <h3 className="mt-2 font-orbitron text-3xl font-black uppercase bg-gradient-to-r from-white via-cyan-100 to-fuchsia-200 bg-clip-text text-transparent">
              Event visuals from the original Cognotsav identity
            </h3>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100">
            Premium poster rail
          </div>
        </div>

        <div className="mt-8 overflow-hidden">
          <div className="poster-marquee flex gap-4">
            {reel.map((poster, index) => (
              <div key={`${poster.title}-${index}`} className="min-w-[240px] rounded-[1.5rem] border border-white/10 bg-white/5 p-3">
                <div className="overflow-hidden rounded-[1.2rem]">
                  <img src={poster.image} alt={poster.title} className="h-72 w-full object-cover transition duration-500 hover:scale-105" />
                </div>
                <p className="mt-3 text-sm font-semibold text-white">{poster.title}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
