import React from 'react';
import { Megaphone, Pin } from 'lucide-react';
import type { PortalAnnouncement } from './types';

type Props = {
  announcement: PortalAnnouncement | null;
};

export const AnnouncementBanner: React.FC<Props> = ({ announcement }) => {
  if (!announcement) {
    return null;
  }

  return (
    <section className="px-4 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1320px]">
        <div className="portal-glow-card overflow-hidden rounded-[1.8rem] border border-yellow-300/18 bg-[linear-gradient(135deg,rgba(251,191,36,0.16),rgba(59,130,246,0.12),rgba(236,72,153,0.14))] px-5 py-4 shadow-[0_18px_60px_rgba(251,191,36,0.12)] backdrop-blur-xl md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-yellow-300/25 bg-yellow-400/16 p-3 text-yellow-100">
                <Megaphone size={18} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-yellow-300/20 bg-yellow-400/14 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-yellow-100">
                    Pinned update
                  </span>
                  {announcement.event_name ? (
                    <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/80">
                      {announcement.event_name}
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-3 text-lg font-bold text-white md:text-xl">{announcement.title}</h2>
                <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-100/90">{announcement.message}</p>
              </div>
            </div>

            <a
              href="#announcement-archive"
              className="magnetic-button inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm font-semibold text-white"
            >
              <Pin size={16} />
              View archive
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
