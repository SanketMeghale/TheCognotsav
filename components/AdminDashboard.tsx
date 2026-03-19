
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  LogOut, 
  LayoutDashboard, 
  Users, 
  Search, 
  CheckCircle, 
  XCircle, 
  ShieldCheck,
  Trash2,
  Phone,
  Building,
  ChevronDown,
  BarChart3,
  Activity,
  Mail,
  X,
  CheckSquare,
  Square,
  Power,
  Download,
  IndianRupee,
  Clock
} from 'lucide-react';
import { 
  logoutAdmin, 
  auth, 
  getRegistrations, 
  getAllVerifiedRegistrations,
  getGlobalMetrics,
  recalculateGlobalStats,
  updateRegistrationStatus, 
  deleteRegistrationWithStats,
  subscribeToCompSettings,
  setCompetitionStatus
} from '../firebaseConfig.ts';
import { COMPETITIONS } from '../constants.tsx';
import { Registration, PaymentStatus } from '../types.ts';
import * as XLSX from 'xlsx';
import { RefreshCw, Plus } from 'lucide-react';

interface Props {
  onLogout: () => void;
}

const AdminDashboard: React.FC<Props> = ({ onLogout }) => {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [compSettings, setCompSettings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const lastVisibleRef = useRef<unknown>(null);
  const [hasMore, setHasMore] = useState(false);
  const [globalStats, setGlobalStats] = useState({
    totalVerifiedRevenue: 0,
    totalVerifiedRegistrations: 0,
    totalParticipants: 0,
    totalPendingRegistrations: 0,
    totalGlobalRegistrations: 0,
    totalGlobalParticipants: 0,
    competitions: {}
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [compFilter, setCompFilter] = useState('All Streams');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toggleConfirm, setToggleConfirm] = useState<{name: string, status: boolean} | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const isAllEvents = compFilter === 'All Streams';
      const filters = isAllEvents 
        ? { statuses: ['pending', 'rejected'] as PaymentStatus[] }
        : { competition: compFilter };

      const [regData, metricData] = await Promise.all([
        getRegistrations(null, 100, filters),
        getGlobalMetrics()
      ]);
      
      setRegistrations(regData.registrations);
      lastVisibleRef.current = regData.lastVisible;
      setHasMore(regData.hasMore);
      setGlobalStats(metricData as Record<string, unknown>);
    } catch (error) {
      if (error instanceof Error && error.message.includes('permission')) {
        throw error;
      }
      console.error("Load failed");
    } finally {
      setLoading(false);
    }
  }, [compFilter]);

  const loadMore = async () => {
    if (!lastVisibleRef.current || isFetchingMore) return;
    setIsFetchingMore(true);
    try {
      const filters = compFilter === 'All Streams' 
        ? { statuses: ['pending', 'rejected'] as PaymentStatus[] }
        : { competition: compFilter };

      const data = await getRegistrations(lastVisibleRef.current, 100, filters);
      setRegistrations(prev => [...prev, ...data.registrations]);
      lastVisibleRef.current = data.lastVisible;
      setHasMore(data.hasMore);
    } catch (error) {
      if (error instanceof Error && error.message.includes('permission')) {
        throw error;
      }
      console.error("Load more failed");
    } finally {
      setIsFetchingMore(false);
    }
  };

  const handleSyncStats = async () => {
    setIsSyncing(true);
    try {
      await recalculateGlobalStats();
      await loadData();
    } catch (error) {
      if (error instanceof Error && error.message.includes('permission')) {
        throw error;
      }
      alert("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [compFilter, loadData]);

  useEffect(() => {
    const unsubSettings = subscribeToCompSettings((settings) => {
      setCompSettings(settings);
    });

    return () => {
      unsubSettings();
    };
  }, []);

  const filteredRegs = useMemo(() => {
    return registrations
      .filter(r => {
        const matchesSearch = 
          r.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.leaderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.transactionId?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesComp = compFilter === 'All Streams' || r.competition === compFilter;
        return matchesSearch && matchesComp;
      })
      .sort((a, b) => {
        const timeA = a.submittedAt?.toMillis?.() || a.submittedAt?.seconds * 1000 || 0;
        const timeB = b.submittedAt?.toMillis?.() || b.submittedAt?.seconds * 1000 || 0;
        return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [searchTerm, compFilter, sortOrder, registrations]);

  const eventStats = useMemo(() => {
    if (compFilter === 'All Streams') return { totalCount: 0, verifiedRevenue: 0 };
    const stats = (globalStats.competitions as Record<string, Record<string, number>>)?.[compFilter] || { verified: 0, pending: 0, rejected: 0, revenue: 0 };
    return {
      totalCount: stats.verified + stats.pending + stats.rejected,
      verifiedRevenue: stats.revenue
    };
  }, [globalStats.competitions, compFilter]);

  const metrics = useMemo(() => {
    const isFiltered = compFilter !== 'All Streams';
    
    // Local metrics for the currently loaded/filtered view
    return filteredRegs.reduce((acc, reg) => {
      const teamSize = reg.teamSize || (reg.members?.length || 0) + 1;
      acc.localParticipants += teamSize;
      
      if (reg.paymentStatus === 'verified') {
        acc.localRevenue += Number(reg.amountPaid || 0);
        acc.localApproved += 1;
      } else if (reg.paymentStatus === 'pending') {
        acc.localPending += 1;
      }
      
      return acc;
    }, {
      localParticipants: 0,
      localTeams: filteredRegs.length,
      localRevenue: 0,
      localPending: 0,
      localApproved: 0,
      isFiltered
    });
  }, [filteredRegs, compFilter]);

  const handleLogout = async () => {
    try {
      await logoutAdmin();
      onLogout();
    } catch {
      console.error("Logout error");
    }
  };

  const handleToggleStatus = async () => {
    if (!toggleConfirm) return;
    try {
      await setCompetitionStatus(toggleConfirm.name, !toggleConfirm.status);
      setToggleConfirm(null);
    } catch {
      alert("Failed to update status");
    }
  };

  const updateStatus = async (id: string, status: PaymentStatus) => {
    const reg = registrations.find(r => r.id === id);
    if (!reg) return;
    
    try {
      await updateRegistrationStatus(reg, status);
      // Update local state instead of re-fetching immediately
      setRegistrations(prev => prev.map(r => r.id === id ? { ...r, paymentStatus: status } : r));
      // Optionally update global stats locally too, but loadData() on refresh will handle it accurately.
      // For now, let's just update the local status so it stays in the list.
    } catch {
      alert("Update failed");
    }
  };

  const confirmDelete = async () => {
    if (deleteIds.length === 0) return;
    setLoading(true);
    try {
      for (const id of deleteIds) {
        const reg = registrations.find(r => r.id === id);
        if (reg) await deleteRegistrationWithStats(reg);
      }
      setDeleteIds([]);
      setSelectedIds(new Set());
      loadData();
    } catch {
      alert("Deletion failed.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRegs.length && filteredRegs.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRegs.map(r => r.id)));
    }
  };

  const exportToExcel = () => {
    const verifiedRegs = filteredRegs.filter(r => r.paymentStatus === 'verified');
    
    if (verifiedRegs.length === 0) {
      alert("No verified registrations found to export.");
      return;
    }

    const dataToExport = verifiedRegs.map(r => ({
      Competition: r.competition,
      Team: r.teamName || 'N/A',
      Leader: r.leaderName,
      Participants: r.teamSize || (r.members?.length || 0) + 1,
      College: r.college || (r.collegeType === 'Other' ? r.otherCollege : r.collegeType),
      TransactionID: r.transactionId || 'N/A',
      Amount: r.amountPaid || 0,
      Status: r.paymentStatus,
      Date: r.submittedAt?.seconds ? new Date(r.submittedAt.seconds * 1000).toLocaleString() : 'N/A'
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `Cognotsav_Export_${new Date().getTime()}.xlsx`);
  };

  const exportAllVerifiedPlayersToExcel = async () => {
    setLoading(true);
    try {
      const verifiedRegs = await getAllVerifiedRegistrations();

      if (verifiedRegs.length === 0) {
        alert("No verified registrations found to export.");
        return;
      }

      const playerRows: Record<string, string | number>[] = [];

      verifiedRegs.forEach(reg => {
        const commonData = {
          "Competition Name": reg.competition,
          "Team Name": reg.teamName || 'Solo Entry',
          "Total Number of Participants": reg.teamSize || (reg.members?.length || 0) + 1,
          "college": reg.college || (reg.collegeType === 'Other' ? reg.otherCollege : 'Dr. Vithalrao Vikhe Patil College of Engineering'),
          "trascation ID": reg.transactionId || 'N/A',
          "amount paid": reg.amountPaid || 0,
          "status": reg.paymentStatus,
          "date": reg.submittedAt?.seconds ? new Date(reg.submittedAt.seconds * 1000).toLocaleString() : 'N/A',
          "Team ID": reg.id
        };

        // Step 1: Add Team Leader
        playerRows.push({
          ...commonData,
          "Participant Name": reg.leaderName,
          "Participant Email": reg.email,
          "Participant Mobile": reg.mobile,
          "Role": "Leader"
        });

        // Step 2: Add Members
        if (reg.members && Array.isArray(reg.members)) {
          reg.members.forEach(member => {
            if (member.name && member.name.trim() !== "") {
              playerRows.push({
                ...commonData,
                "Participant Name": member.name,
                "Participant Email": member.email,
                "Participant Mobile": member.mobile,
                "Role": "Member"
              });
            }
          });
        }
      });

      // Step 6: Sorting
      playerRows.sort((a, b) => {
        const compCompare = a["Competition Name"].localeCompare(b["Competition Name"]);
        if (compCompare !== 0) return compCompare;
        return a["Team Name"].localeCompare(b["Team Name"]);
      });

      // Step 7: File Generation
      const worksheet = XLSX.utils.json_to_sheet(playerRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Verified Players");
      XLSX.writeFile(workbook, "cognotsav_all_verified_players.xlsx");

    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export all verified players.");
    } finally {
      setLoading(false);
    }
  };

  const user = auth.currentUser;
  const competitionNames = COMPETITIONS.map(c => c.name);

  return (
    <div className="min-h-screen bg-[#020202] text-white flex font-inter">
      <aside className="w-72 border-r border-white/5 bg-[#050505] hidden lg:flex flex-col p-6 sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <div>
            <span className="font-orbitron font-black text-lg tracking-tighter block leading-none uppercase">Cognotsav</span>
            <span className="text-[9px] uppercase tracking-[0.3em] text-cyan-500 font-bold">Admin Panel</span>
          </div>
        </div>
        <nav className="space-y-1 flex-grow">
          <NavItem icon={<LayoutDashboard size={18}/>} label="System Overview" active />
        </nav>
        <div className="mt-auto pt-6 border-t border-white/5">
          <button onClick={() => setShowLogoutConfirm(true)} className="w-full flex items-center justify-between text-gray-500 hover:text-red-500 transition-all p-4 rounded-2xl">
            <span className="text-xs font-bold uppercase tracking-widest">Logout Session</span>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="flex-grow flex flex-col min-w-0 bg-[#020202]">
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-6 md:px-8 bg-black/50 backdrop-blur-xl sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <div className="h-4 w-1 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
            <h2 className="text-[10px] md:text-xs font-orbitron font-bold tracking-[0.4em] text-white uppercase opacity-70">Metric_Dashboard</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 md:px-4 py-2 bg-white/5 rounded-full border border-white/5 flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] md:text-[10px] font-mono text-gray-400 uppercase tracking-widest">{user?.email || 'Authenticated Admin'}</span>
            </div>
            {/* Mobile/Tablet Logout Button */}
            <button 
              onClick={() => setShowLogoutConfirm(true)} 
              className="lg:hidden p-2.5 bg-red-500/10 text-red-500 rounded-full border border-red-500/20 hover:bg-red-500/20 transition-all active:scale-95"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-[1600px] mx-auto w-full pb-32">
          {/* Main Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <StatCard 
              label={metrics.isFiltered ? "Event Participants" : "Total Participants"} 
              value={Math.max(0, metrics.isFiltered ? eventStats.totalCount : globalStats.totalGlobalParticipants).toString()} 
              sub={metrics.isFiltered ? "Each Team = 1" : "Global Individual Heads"} 
              color="cyan" 
              icon={<Users />} 
            />
            <StatCard 
              label={metrics.isFiltered ? "Event Revenue" : "Total Revenue"} 
              value={`₹${Math.max(0, metrics.isFiltered ? eventStats.verifiedRevenue : globalStats.totalVerifiedRevenue).toLocaleString()}`} 
              sub={metrics.isFiltered ? "Verified Collections" : "Global Verified Collections"} 
              color="green" 
              icon={<IndianRupee />} 
            />
            <StatCard 
              label={metrics.isFiltered ? "Event Pending" : "Total Pending"} 
              value={Math.max(0, metrics.isFiltered ? metrics.localPending : globalStats.totalPendingRegistrations).toString()} 
              sub={metrics.isFiltered ? "Awaiting Verification" : "Global Awaiting Verification"} 
              color="yellow" 
              icon={<Clock />} 
            />
            <StatCard 
              label={metrics.isFiltered ? "Event Registrations" : "Total Registrations"} 
              value={Math.max(0, metrics.isFiltered ? eventStats.totalCount : globalStats.totalGlobalRegistrations).toString()} 
              sub={metrics.isFiltered ? "Total Entries" : "Global Registry Count"} 
              color="blue" 
              icon={<CheckCircle />} 
            />
          </div>

          <div className="bg-[#080808] border border-white/5 p-6 md:p-8 rounded-[2rem] relative overflow-hidden group">
            <div className="flex items-center gap-3 mb-8">
              <BarChart3 className="text-cyan-500" size={20} />
              <h3 className="text-xs font-orbitron font-bold tracking-widest text-gray-400 uppercase">Event_Performance_Matrix</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
              {COMPETITIONS.map((comp) => {
                const stats = (globalStats.competitions as Record<string, Record<string, number>>)?.[comp.name] || { verified: 0, pending: 0 };
                const total = stats.verified + stats.pending;
                const totalGlobal = globalStats.totalVerifiedRegistrations + globalStats.totalPendingRegistrations;
                const percentage = totalGlobal > 0 ? (total / totalGlobal) * 100 : 0;
                const isEnabled = compSettings[comp.name] !== false;
                
                return (
                  <div key={comp.name} className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl hover:border-cyan-500/40 transition-all group/card relative">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[8px] md:text-[9px] font-black text-gray-500 uppercase tracking-widest truncate group-hover/card:text-cyan-400">{comp.name}</p>
                      <button onClick={() => setToggleConfirm({name: comp.name, status: isEnabled})} className={`p-1 rounded-md transition-all ${isEnabled ? 'text-green-500' : 'text-red-500'}`}><Power size={12} /></button>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-2xl md:text-3xl font-orbitron font-bold text-white tracking-tighter">{total}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold text-green-500">V: {stats.verified}</span>
                        <span className="text-[9px] font-bold text-yellow-500">P: {stats.pending}</span>
                      </div>
                    </div>
                    <div className={`text-[8px] font-black uppercase mt-2 ${isEnabled ? 'text-green-500/60' : 'text-red-500/60'}`}>{isEnabled ? 'Open' : 'Closed'}</div>
                    <div className="w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                      <div className="h-full bg-cyan-500" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-4 items-stretch justify-between bg-white/[0.02] p-4 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="flex flex-col lg:flex-row gap-3 flex-grow">
              <div className="relative flex-grow min-w-[200px]">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
                <input 
                  type="text" 
                  placeholder="Search Team, Leader or TxID..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="w-full bg-black/40 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-sm outline-none focus:border-cyan-500/50 placeholder:text-gray-700" 
                />
              </div>
              <div className="relative min-w-[240px]">
                <select value={compFilter} onChange={(e) => setCompFilter(e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-3 text-sm appearance-none font-bold text-gray-300">
                  <option value="All Streams">Pending Queue (All Events)</option>
                  {competitionNames.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={14} />
              </div>
              <div className="relative min-w-[160px]">
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')} className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-3 text-sm appearance-none font-bold text-gray-300">
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
                <Clock className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" size={14} />
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button 
                onClick={handleSyncStats} 
                disabled={isSyncing}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 text-cyan-500 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:bg-white/10 border border-white/5 disabled:opacity-50"
                title="Recalculate Global Stats"
              >
                <Activity size={16} className={isSyncing ? 'animate-pulse' : ''} /> 
                <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
              </button>
              <button 
                onClick={() => loadData(true)} 
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 text-gray-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:bg-white/10 border border-white/5"
                title="Refresh Data"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button 
                onClick={exportAllVerifiedPlayersToExcel} 
                className="flex items-center justify-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:bg-green-500"
                title="Download All Verified Players"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Universal Download</span>
              </button>
              <button 
                onClick={exportToExcel} 
                className="flex items-center justify-center gap-2 px-5 py-3 bg-cyan-600 text-black rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:bg-cyan-500"
                title="Download Excel"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          <div className="bg-[#050505] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
            <div className="px-6 md:px-10 py-5 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
              <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.4em] text-gray-400">
                {compFilter === 'All Streams' ? 'Pending_Queue' : `${compFilter.replace(/\s+/g, '_')}_Ledger`} 
                <span className="text-cyan-500 ml-2">{filteredRegs.length} NODES</span>
              </h3>
              <button onClick={toggleSelectAll} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-cyan-500">
                {selectedIds.size === filteredRegs.length && filteredRegs.length > 0 ? <><CheckSquare size={14} className="text-cyan-500" /> Clear</> : <><Square size={14} /> Select All</>}
              </button>
            </div>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto custom-scrollbar">
              {loading ? (
                <div className="p-32 flex flex-col items-center justify-center gap-6 bg-white/[0.01]">
                  <div className="w-16 h-16 border-4 border-cyan-500/10 border-t-cyan-500 rounded-full animate-spin shadow-[0_0_30px_rgba(6,182,212,0.1)]"></div>
                  <div className="space-y-2 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.5em] text-cyan-500 animate-pulse">Establishing_Data_Link</p>
                    <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Synchronizing Registry Nodes...</p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[1100px]">
                  <thead>
                    <tr className="bg-white/[0.01]">
                      <th className="w-16 px-6 md:px-10 py-5"></th>
                      <th className="px-6 md:px-10 py-5 text-[9px] font-black uppercase tracking-widest text-gray-600">Context</th>
                      <th className="px-6 md:px-10 py-5 text-[9px] font-black uppercase tracking-widest text-gray-600">Identity</th>
                      <th className="px-6 md:px-10 py-5 text-[9px] font-black uppercase tracking-widest text-gray-600">Fee</th>
                      <th className="px-6 md:px-10 py-5 text-[9px] font-black uppercase tracking-widest text-gray-600">Status</th>
                      <th className="px-6 md:px-10 py-5 text-[9px] font-black uppercase tracking-widest text-gray-600 text-right">Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredRegs.map((reg) => (
                      <tr key={reg.id} className={`hover:bg-white/[0.01] group cursor-pointer ${selectedIds.has(reg.id) ? 'bg-cyan-500/[0.03]' : ''}`} onClick={() => setSelectedReg(reg)}>
                        <td className="px-6 md:px-10 py-6" onClick={(e) => { e.stopPropagation(); toggleSelectOne(reg.id); }}>
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedIds.has(reg.id) ? 'bg-cyan-500 border-cyan-500' : 'border-white/10 group-hover:border-cyan-500/50'}`}>
                            {selectedIds.has(reg.id) && <CheckSquare size={14} className="text-black" />}
                          </div>
                        </td>
                        <td className="px-6 md:px-10 py-6"><span className="text-[10px] font-black text-cyan-500/50 uppercase tracking-widest">{reg.competition}</span></td>
                        <td className="px-6 md:px-10 py-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-white uppercase">{reg.teamName || 'Solo Entry'}</span>
                            <span className="text-[10px] text-gray-500">{reg.leaderName} ({reg.teamSize || (reg.members?.length || 0) + 1} Pax)</span>
                          </div>
                        </td>
                        <td className="px-6 md:px-10 py-6">
                          <span className="text-xs font-mono text-gray-400">₹{reg.amountPaid || 0}</span>
                        </td>
                        <td className="px-6 md:px-10 py-6"><StatusBadge status={reg.paymentStatus} /></td>
                        <td className="px-6 md:px-10 py-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => updateStatus(reg.id, 'verified')} className="p-2 text-green-500 hover:bg-green-500/10 rounded-xl"><CheckCircle size={18} /></button>
                            <button onClick={() => updateStatus(reg.id, 'rejected')} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl"><XCircle size={18} /></button>
                            <button onClick={() => setDeleteIds([reg.id])} className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl"><Trash2 size={18} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              
              {hasMore && !loading && (
                <div className="p-8 border-t border-white/5 flex justify-center">
                  <button 
                    onClick={loadMore} 
                    disabled={isFetchingMore}
                    className="flex items-center gap-3 px-12 py-4 bg-white/5 hover:bg-white/10 text-cyan-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] border border-white/5 transition-all disabled:opacity-50"
                  >
                    {isFetchingMore ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Plus size={16} />
                    )}
                    {isFetchingMore ? 'Loading_More...' : 'Load_More_Nodes'}
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-white/5">
              {loading ? (
                <div className="p-20 flex flex-col items-center justify-center gap-4">
                  <div className="w-10 h-10 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500/50">Syncing_Nodes...</p>
                </div>
              ) : filteredRegs.length === 0 ? (
                <div className="p-10 text-center text-gray-600 text-xs uppercase tracking-widest font-black">No matching nodes found</div>
              ) : (
                filteredRegs.map((reg) => (
                  <div 
                    key={reg.id} 
                    className={`p-6 space-y-4 active:bg-white/[0.02] transition-colors cursor-pointer ${selectedIds.has(reg.id) ? 'bg-cyan-500/[0.03]' : ''}`}
                    onClick={() => setSelectedReg(reg)}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex gap-3">
                        <div 
                          className="mt-1"
                          onClick={(e) => { e.stopPropagation(); toggleSelectOne(reg.id); }}
                        >
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedIds.has(reg.id) ? 'bg-cyan-500 border-cyan-500' : 'border-white/10'}`}>
                            {selectedIds.has(reg.id) && <CheckSquare size={14} className="text-black" />}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-white uppercase leading-tight">{reg.teamName || 'Solo Entry'}</h4>
                          <p className="text-[10px] text-gray-500 font-medium">{reg.leaderName} • {reg.teamSize || (reg.members?.length || 0) + 1} Pax</p>
                        </div>
                      </div>
                      <StatusBadge status={reg.paymentStatus} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="px-2 py-1 bg-cyan-500/10 rounded text-[8px] font-black text-cyan-500 uppercase tracking-widest border border-cyan-500/20">
                        {reg.competition}
                      </div>
                      <div className="text-[10px] font-mono text-gray-500 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                        Fee: ₹{reg.amountPaid || 0}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => updateStatus(reg.id, 'verified')} 
                        className="flex-grow flex items-center justify-center gap-2 py-3 bg-green-500/10 text-green-500 rounded-xl text-[9px] font-black uppercase tracking-widest border border-green-500/20 active:scale-95 transition-transform"
                      >
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button 
                        onClick={() => updateStatus(reg.id, 'rejected')} 
                        className="flex-grow flex items-center justify-center gap-2 py-3 bg-red-500/10 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest border border-red-500/20 active:scale-95 transition-transform"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                      <button 
                        onClick={() => setDeleteIds([reg.id])} 
                        className="p-3 bg-white/5 text-gray-500 rounded-xl border border-white/5 active:scale-95 transition-transform"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[90] w-full max-w-2xl px-6">
            <div className="bg-[#111] border border-white/10 rounded-full p-2 px-6 flex items-center justify-between backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-cyan-500 text-black flex items-center justify-center font-black text-sm">{selectedIds.size}</div>
                <p className="text-[10px] font-black uppercase text-cyan-500">Nodes Selected</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelectedIds(new Set())} className="px-6 py-3 text-[10px] font-black uppercase text-gray-400">Cancel</button>
                <button onClick={() => setDeleteIds(Array.from(selectedIds))} className="bg-red-600 text-white px-8 py-3 rounded-full text-[10px] font-black uppercase">Purge Batch</button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Confirmation Modals */}
      {toggleConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 p-8 rounded-[2.5rem] text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${toggleConfirm.status ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}><Power size={32} /></div>
            <h3 className="text-xl font-black text-white uppercase mb-2">{toggleConfirm.status ? 'Close Portal?' : 'Open Portal?'}</h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">Modify accessibility for <b>{toggleConfirm.name}</b></p>
            <div className="space-y-3">
              <button onClick={handleToggleStatus} className={`w-full py-4 font-black rounded-xl uppercase text-xs ${toggleConfirm.status ? 'bg-red-600 text-white' : 'bg-green-600 text-black'}`}>Execute State Change</button>
              <button onClick={() => setToggleConfirm(null)} className="w-full py-4 bg-white/5 text-gray-500 font-black rounded-xl uppercase text-xs">Abort</button>
            </div>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 p-8 rounded-[2.5rem] text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><LogOut size={32} /></div>
            <h3 className="text-xl font-black text-white uppercase mb-6">Terminate Session?</h3>
            <div className="space-y-3">
              <button onClick={handleLogout} className="w-full py-4 bg-red-600 text-white font-black rounded-xl uppercase text-xs">Disconnect Now</button>
              <button onClick={() => setShowLogoutConfirm(false)} className="w-full py-4 bg-white/5 text-gray-500 font-black rounded-xl uppercase text-xs">Stay Connected</button>
            </div>
          </div>
        </div>
      )}

      {deleteIds.length > 0 && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 p-8 rounded-[2.5rem] text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={32} /></div>
            <h3 className="text-xl font-black text-white uppercase mb-2">Confirm Purge?</h3>
            <p className="text-xs text-gray-600 mb-8 uppercase tracking-widest">{deleteIds.length} Data Points to be Erased</p>
            <div className="space-y-3">
              <button onClick={confirmDelete} className="w-full py-4 bg-red-600 text-white font-black rounded-xl uppercase text-xs">Execute Wipe</button>
              <button onClick={() => setDeleteIds([])} className="w-full py-4 bg-white/5 text-gray-500 font-black rounded-xl uppercase text-xs">Abort Operation</button>
            </div>
          </div>
        </div>
      )}

      {selectedReg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl" onClick={() => setSelectedReg(null)}>
          <div className="w-full max-w-4xl bg-[#080808] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="h-32 bg-gradient-to-br from-cyan-950 to-blue-950 p-8 relative">
              <button onClick={() => setSelectedReg(null)} className="absolute top-6 right-6 p-2 bg-black/30 rounded-full hover:bg-black/50 transition-all text-white"><X size={24} /></button>
              <div className="flex flex-col h-full justify-end">
                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.5em] mb-2">{selectedReg.competition}</span>
                <h3 className="text-2xl font-black font-orbitron text-white uppercase">{selectedReg.teamName || 'Solo Entry'}</h3>
              </div>
            </div>
            <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12 overflow-y-auto max-h-[60vh] custom-scrollbar">
              <div className="space-y-8">
                <DetailBox label="Mission Leader" value={selectedReg.leaderName} sub={`${selectedReg.email} | ${selectedReg.mobile}`} icon={<Users size={16}/>} />
                <DetailBox label="Institution" value={selectedReg.college || (selectedReg.collegeType === 'Other' ? selectedReg.otherCollege || 'External' : 'Dr. Vithalrao Vikhe Patil COE')} icon={<Building size={16}/>} />
                <div className="p-6 bg-white/[0.02] rounded-3xl border border-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-gray-700 uppercase">Financial_Node</h4>
                    <StatusBadge status={selectedReg.paymentStatus} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Registration Fee</p>
                      <p className="text-xl font-orbitron font-bold text-white">₹{selectedReg.amountPaid || 0}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Transaction ID</p>
                      <p className="text-lg font-mono text-cyan-400 tracking-wider break-all">{selectedReg.transactionId || 'NOT_FOUND'}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-gray-700 uppercase flex items-center gap-2"><Activity size={14}/> Squad_Roster</h4>
                <div className="space-y-3">
                  {selectedReg.members?.length > 0 ? selectedReg.members.map((m, i) => (
                    <div key={i} className="p-4 bg-white/[0.03] border border-white/5 rounded-2xl flex flex-col gap-1">
                      <p className="text-[11px] font-black text-white uppercase">{m.name}</p>
                      <div className="flex items-center gap-3 text-[9px] font-mono text-gray-500">
                        <span className="flex items-center gap-1"><Mail size={10}/> {m.email}</span>
                        <span className="flex items-center gap-1"><Phone size={10}/> {m.mobile}</span>
                      </div>
                    </div>
                  )) : <p className="text-xs text-gray-700 italic">No additional nodes detected.</p>}
                </div>
              </div>
            </div>
            <div className="px-8 pb-8 flex gap-4">
              <button onClick={() => { updateStatus(selectedReg.id, 'verified'); setSelectedReg(null); }} className="flex-grow py-4 bg-green-600 text-black font-black uppercase text-[10px] rounded-xl">Authorize Payment</button>
              <button onClick={() => { updateStatus(selectedReg.id, 'rejected'); setSelectedReg(null); }} className="flex-grow py-4 bg-white/5 text-red-500 font-black uppercase text-[10px] rounded-xl">Reject Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailBox: React.FC<{ label: string, value: string, sub?: string, icon: React.ReactNode }> = ({ label, value, sub, icon }) => (
  <div className="space-y-2">
    <p className="text-[10px] font-black text-gray-700 uppercase flex items-center gap-2">{icon} {label}</p>
    <p className="text-sm font-bold text-white uppercase">{value}</p>
    {sub && <p className="text-[10px] font-mono text-gray-600">{sub}</p>}
  </div>
);

const NavItem: React.FC<{ icon: React.ReactNode, label: string, active?: boolean }> = ({ icon, label, active }) => (
  <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all cursor-pointer ${active ? 'bg-cyan-500 text-black font-bold shadow-xl shadow-cyan-500/30' : 'text-gray-600 hover:text-white hover:bg-white/5'}`}>
    {icon}
    <span className="text-[11px] uppercase tracking-[0.3em] font-black">{label}</span>
  </div>
);

const StatCard: React.FC<{ label: string, value: string, sub: string, color: string, icon: React.ReactNode }> = ({ label, value, sub, color, icon }) => (
  <div className="p-4 md:p-7 rounded-[2.5rem] border bg-white/5 border-white/5 group hover:-translate-y-1 transition-all">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-gray-700 text-[8px] md:text-[10px] uppercase font-black tracking-[0.4em]">{label}</h3>
      <div className={`text-${color}-500 opacity-40 group-hover:opacity-100 transition-opacity`}>{icon}</div>
    </div>
    <p className="text-2xl md:text-4xl font-orbitron font-bold mb-1 tracking-tighter text-white">{value}</p>
    <p className="text-[8px] md:text-[9px] uppercase tracking-widest text-gray-600 font-bold truncate">{sub}</p>
  </div>
);

const StatusBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  const cfg = {
    verified: 'bg-green-500/10 text-green-500 border-green-500/20',
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
  };
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-widest ${cfg[status]}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${status === 'verified' ? 'bg-green-500' : status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
      {status === 'verified' ? 'Approved' : status}
    </div>
  );
};

export default AdminDashboard;
