import React, { useEffect, useMemo, useState } from 'react';
import { Search, ShieldCheck, Clock3, Ticket, Sparkles } from 'lucide-react';
import { COMPETITIONS } from '../constants';
import { getRegistrationStatusByQuery, subscribeToGlobalMetrics } from '../firebaseConfig';

type PublicStatus = {
  id: string;
  teamId: string;
  competition: string;
  teamName: string;
  leaderName: string;
  email: string;
  paymentStatus: 'pending' | 'verified' | 'rejected';
  amountPaid?: number;
  teamSize?: number;
};

const statusStyles: Record<PublicStatus['paymentStatus'], { label: string; className: string }> = {
  pending: {
    label: 'Verification Pending',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-300'
  },
  verified: {
    label: 'Registration Verified',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
  },
  rejected: {
    label: 'Payment Rejected',
    className: 'border-rose-500/30 bg-rose-500/10 text-rose-300'
  }
};

const RegistrationHub: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [metrics, setMetrics] = useState<Record<string, unknown>>({
    competitions: {},
    totalGlobalRegistrations: 0,
    totalPendingRegistrations: 0,
    totalVerifiedRegistrations: 0,
  });

  useEffect(() => {
    const unsubscribe = subscribeToGlobalMetrics((nextMetrics) => {
      setMetrics(nextMetrics);
    });

    return () => unsubscribe();
  }, []);

  const competitionStats = useMemo(
    () =>
      (metrics.competitions as Record<
        string,
        { verified?: number; pending?: number; rejected?: number }
      >) || {},
    [metrics.competitions],
  );

  const spotlightEvents = useMemo(() => {
    return COMPETITIONS.map((competition) => {
      const counts = competitionStats[competition.name] || {};
      const registeredTeams = (counts.verified || 0) + (counts.pending || 0);
      const maxSlots = competition.maxSlots || 0;
      const slotsLeft = Math.max(maxSlots - registeredTeams, 0);

      return {
        id: competition.id,
        name: competition.name,
        slotsLeft,
        maxSlots,
        registeredTeams
      };
    })
      .sort((a, b) => a.slotsLeft - b.slotsLeft)
      .slice(0, 3);
  }, [competitionStats]);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setSearched(true);

    try {
      const response = await getRegistrationStatusByQuery(query);
      setResults(response as PublicStatus[]);
    } catch (error) {
      console.error('Status lookup failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="tracker" className="relative px-6 py-24 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_35%),linear-gradient(180deg,#040404_0%,#070b12_45%,#040404_100%)] overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>
      <div className="absolute top-0 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-cyan-500/15 blur-[120px]"></div>

      <div className="relative max-w-7xl mx-auto grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="glass-card rounded-[2rem] p-8 md:p-10 border border-cyan-500/10 shadow-[0_0_60px_rgba(8,145,178,0.08)]">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-300/80 font-black">Registration Hub</p>
              <h2 className="text-3xl md:text-4xl font-orbitron font-black text-white">Track Your Entry Instantly</h2>
            </div>
          </div>

          <p className="max-w-2xl text-gray-400 text-sm md:text-base leading-relaxed mb-8">
            Enter your team ID or registration email to check your live verification status. This section also highlights high-demand events with limited remaining slots.
          </p>

          <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-[1fr_auto]">
            <label className="relative block">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-300/70" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Enter team ID like COG-AB123CD or your email"
                className="h-14 w-full rounded-2xl border border-white/10 bg-black/40 pl-12 pr-4 text-white outline-none transition-all placeholder:text-gray-500 focus:border-cyan-400/50 focus:bg-black/60"
              />
            </label>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="h-14 rounded-2xl bg-cyan-500 px-7 font-black uppercase tracking-[0.25em] text-black transition-all hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Track Now'}
            </button>
          </form>

          <div className="mt-8 space-y-4">
            {results.map((result) => (
              <div key={result.teamId} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-lg font-black uppercase text-white">{result.teamName || 'Solo Entry'}</p>
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] ${statusStyles[result.paymentStatus].className}`}>
                        {statusStyles[result.paymentStatus].label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{result.competition}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>Team ID: {result.teamId}</span>
                      <span>Leader: {result.leaderName}</span>
                      <span>Fee: \u20B9{result.amountPaid || 0}</span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
                    {result.paymentStatus === 'verified' && 'Your payment is approved. You are all set for the event.'}
                    {result.paymentStatus === 'pending' && 'Your payment is awaiting organizer verification.'}
                    {result.paymentStatus === 'rejected' && 'Please contact support with your payment proof for help.'}
                  </div>
                </div>
              </div>
            ))}

            {searched && !loading && results.length === 0 && (
              <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-black/30 p-6 text-center text-sm text-gray-500">
                No registration found for that team ID or email yet.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card rounded-[2rem] p-8 border border-white/8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-purple-300/70 font-black">Live Pulse</p>
                <h3 className="text-2xl font-orbitron font-black text-white">Demand Snapshot</h3>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              <MetricCard
                label="Total Entries"
                value={String(metrics.totalGlobalRegistrations || 0)}
                icon={<Ticket size={18} />}
                tone="cyan"
              />
              <MetricCard
                label="Pending Verifications"
                value={String(metrics.totalPendingRegistrations || 0)}
                icon={<Clock3 size={18} />}
                tone="amber"
              />
              <MetricCard
                label="Confirmed Teams"
                value={String(metrics.totalVerifiedRegistrations || 0)}
                icon={<ShieldCheck size={18} />}
                tone="emerald"
              />
            </div>
          </div>

          <div className="glass-card rounded-[2rem] p-8 border border-white/8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-300/70 font-black">Hottest Events</p>
                <h3 className="text-2xl font-orbitron font-black text-white">Slots Closing Fast</h3>
              </div>
              <a href="#events" className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">
                Explore
              </a>
            </div>

            <div className="space-y-4">
              {spotlightEvents.map((event, index) => (
                <div key={event.id} className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Priority 0{index + 1}</p>
                      <h4 className="text-lg font-black text-white">{event.name}</h4>
                    </div>
                    <span className="rounded-full bg-rose-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-rose-300">
                      {event.slotsLeft} left
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-rose-400"
                      style={{ width: `${event.maxSlots ? (event.registeredTeams / event.maxSlots) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>{event.registeredTeams} teams registered</span>
                    <span>{event.maxSlots} total slots</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const MetricCard: React.FC<{ label: string; value: string; icon: React.ReactNode; tone: 'cyan' | 'amber' | 'emerald' }> = ({
  label,
  value,
  icon,
  tone
}) => {
  const toneClass = {
    cyan: 'from-cyan-500/15 to-cyan-500/5 text-cyan-200 border-cyan-500/10',
    amber: 'from-amber-500/15 to-amber-500/5 text-amber-200 border-amber-500/10',
    emerald: 'from-emerald-500/15 to-emerald-500/5 text-emerald-200 border-emerald-500/10',
  }[tone];

  return (
    <div className={`rounded-[1.5rem] border bg-gradient-to-br p-5 ${toneClass}`}>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.3em] text-white/60">{label}</span>
        <span>{icon}</span>
      </div>
      <p className="text-3xl font-orbitron font-black text-white">{value}</p>
    </div>
  );
};

export default RegistrationHub;
