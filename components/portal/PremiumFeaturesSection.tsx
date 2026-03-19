import React from 'react';
import {
  BadgeCheck,
  Download,
  FileSpreadsheet,
  LifeBuoy,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
} from 'lucide-react';
import { shellClassName } from './utils';

const features = [
  {
    icon: Sparkles,
    title: 'Poster-Led Discovery',
    detail: 'Each competition now has a visual-first event card with richer motion, category styling, and clearer decision-making.',
    tone: 'from-fuchsia-400/14 to-transparent',
  },
  {
    icon: Search,
    title: 'Smart Event Discovery',
    detail: 'Category filters and quick search help participants jump to the right event instead of scanning every card manually.',
    tone: 'from-cyan-400/14 to-transparent',
  },
  {
    icon: Users,
    title: 'Adaptive Team Rules',
    detail: 'Solo, fixed-team, and flexible-team events adjust the participant form and team validation automatically.',
    tone: 'from-amber-400/14 to-transparent',
  },
  {
    icon: QrCode,
    title: 'Live UPI QR Payments',
    detail: 'Each event shows a dedicated payment QR, payee details, and quick copy/open actions for faster completion.',
    tone: 'from-emerald-400/14 to-transparent',
  },
  {
    icon: BadgeCheck,
    title: 'Proof-Ready Payments',
    detail: 'Participants can attach payment screenshots and UTR references so organizers can verify entries faster.',
    tone: 'from-fuchsia-400/14 to-transparent',
  },
  {
    icon: Ticket,
    title: 'Instant Confirmation Pass',
    detail: 'Successful registrations generate a printable pass with event details, lead contact info, and registration code.',
    tone: 'from-cyan-400/14 to-transparent',
  },
  {
    icon: ShieldCheck,
    title: 'Status Tracking',
    detail: 'Teams can look up their registration later using code or email without contacting the organizers first.',
    tone: 'from-amber-400/14 to-transparent',
  },
  {
    icon: LifeBuoy,
    title: 'Support Contact Blocks',
    detail: 'Event-specific coordinators and support references reduce confusion when participants need quick help.',
    tone: 'from-cyan-400/14 to-transparent',
  },
  {
    icon: Download,
    title: 'CSV + Excel Exports',
    detail: 'Organizers can export registrations directly from the portal instead of rebuilding participant sheets by hand.',
    tone: 'from-emerald-400/14 to-transparent',
  },
  {
    icon: FileSpreadsheet,
    title: 'Database-Backed Admin Flow',
    detail: 'Payment status, participant records, and registration lookup now live in PostgreSQL instead of a brochure-only frontend.',
    tone: 'from-fuchsia-400/14 to-transparent',
  },
];

export const PremiumFeaturesSection: React.FC = () => {
  return (
    <section className={`${shellClassName} py-4 md:py-8`}>
      <div className="rounded-[2.2rem] border border-fuchsia-300/10 bg-[linear-gradient(145deg,rgba(22,14,36,0.92),rgba(9,20,36,0.9))] p-6 shadow-[0_30px_120px_rgba(2,8,23,0.32)] md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-200/80">Premium Additions</p>
            <h3 className="mt-2 font-orbitron text-3xl font-black uppercase bg-gradient-to-r from-white via-amber-100 to-fuchsia-200 bg-clip-text text-transparent">
              Ten standout features for a flagship fest portal
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">
              This pass adds deeper participant UX and organizer tooling instead of only repainting the UI.
            </p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100">
            Premium, payment-ready, export-ready
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className={`floating-card rounded-[1.6rem] border border-white/10 bg-gradient-to-br ${feature.tone} p-5`}
                style={{ animationDelay: `${index * 0.12}s` }}
              >
                <div className="inline-flex rounded-2xl border border-white/10 bg-white/6 p-3 text-white">
                  <Icon size={18} />
                </div>
                <h4 className="mt-4 text-lg font-bold text-white">{feature.title}</h4>
                <p className="mt-2 text-sm leading-7 text-slate-200">{feature.detail}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
