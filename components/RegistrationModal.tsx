import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, CheckCircle2, Copy, Check, Ban, Download, ShieldCheck, Sparkles } from 'lucide-react';
import { Competition, Participant } from '../types';
import { submitRegistration, subscribeToCompSettings } from '../firebaseConfig';
import { UPI_MAPPING } from '../constants';
import ContactSupport from './ContactSupport.tsx';

interface Props {
  competition: Competition;
  onClose: () => void;
}

type FormState = {
  teamName: string;
  leaderName: string;
  email: string;
  mobile: string;
  collegeType: string;
  otherCollege: string;
  members: Participant[];
  transactionId: string;
};

type SubmissionReceipt = {
  teamId: string;
  competitionName: string;
  leaderName: string;
  teamName: string;
  email: string;
  amountPaid: number;
  transactionId: string;
  submittedAt: string;
};

const createEmptyMembers = (count: number) =>
  Array.from({ length: Math.max(count, 0) }, () => ({ name: '', email: '', mobile: '' }));

const createDefaultFormData = (competition: Competition): FormState => ({
  teamName: '',
  leaderName: '',
  email: '',
  mobile: '',
  collegeType: 'DVVPOE',
  otherCollege: '',
  members: createEmptyMembers(competition.minMembers - 1),
  transactionId: ''
});

const getDraftKey = (competitionId: string) => `cognotsav_registration_draft_${competitionId}`;

const getSavedDraft = (competition: Competition): { squadSize: number; formData: FormState } | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(getDraftKey(competition.id));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { squadSize?: number; formData?: Partial<FormState> };
    const savedSize = Math.min(
      Math.max(parsed.squadSize || competition.minMembers, competition.minMembers),
      competition.maxMembers
    );
    const defaults = createDefaultFormData(competition);

    return {
      squadSize: savedSize,
      formData: {
        ...defaults,
        ...parsed.formData,
        members: Array.isArray(parsed.formData?.members)
          ? [...parsed.formData.members, ...createEmptyMembers(savedSize - 1)].slice(0, savedSize - 1)
          : createEmptyMembers(savedSize - 1)
      }
    };
  } catch (error) {
    console.error('Failed to restore registration draft:', error);
    return null;
  }
};

const RegistrationModal: React.FC<Props> = ({ competition, onClose }) => {
  const restoredDraft = getSavedDraft(competition);
  const [loading, setLoading] = useState(false);
  const [squadSize, setSquadSize] = useState<number>(restoredDraft?.squadSize ?? competition.minMembers);
  const [copied, setCopied] = useState(false);
  const [copiedTeamId, setCopiedTeamId] = useState(false);
  const [isCompEnabled, setIsCompEnabled] = useState<boolean | null>(null);
  const [submissionReceipt, setSubmissionReceipt] = useState<SubmissionReceipt | null>(null);
  const [formData, setFormData] = useState<FormState>(restoredDraft?.formData ?? createDefaultFormData(competition));
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const unsub = subscribeToCompSettings((settings) => {
      const status = settings[competition.name];
      setIsCompEnabled(status !== false);
    });
    return () => unsub();
  }, [competition.name]);

  useEffect(() => {
    if (submissionReceipt || typeof window === 'undefined') return;

    window.localStorage.setItem(
      getDraftKey(competition.id),
      JSON.stringify({ squadSize, formData })
    );
  }, [competition.id, formData, squadSize, submissionReceipt]);

  const sizeOptions = useMemo(() => {
    const options = [];
    for (let i = competition.minMembers; i <= competition.maxMembers; i++) {
      options.push(i);
    }
    return options;
  }, [competition]);

  const calculatedFee = useMemo(() => {
    if (competition.pricing.team) return competition.pricing.team;
    if (competition.pricing.person) return competition.pricing.person * squadSize;
    return competition.pricing[squadSize] || 0;
  }, [competition, squadSize]);

  const upiDetails = UPI_MAPPING[competition.id] || { id: 'sahilbhatti292005@okaxis', payee: 'Cognotsav 2026' };
  const upiId = upiDetails.id;

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyTeamId = () => {
    if (!submissionReceipt) return;
    navigator.clipboard.writeText(submissionReceipt.teamId);
    setCopiedTeamId(true);
    setTimeout(() => setCopiedTeamId(false), 2000);
  };

  const handleSizeChange = (size: number) => {
    setSquadSize(size);
    const additionalCount = size - 1;
    const newMembers = [...formData.members];

    if (newMembers.length < additionalCount) {
      for (let i = newMembers.length; i < additionalCount; i++) {
        newMembers.push({ name: '', email: '', mobile: '' });
      }
    } else {
      newMembers.splice(additionalCount);
    }

    setFormData((prev) => ({ ...prev, members: newMembers }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMemberChange = (index: number, field: keyof Participant, value: string) => {
    const newMembers = [...formData.members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setFormData((prev) => ({ ...prev, members: newMembers }));
  };

  const openPrintablePass = () => {
    if (!submissionReceipt) return;

    const printWindow = window.open('', '_blank', 'width=920,height=760');
    if (!printWindow) return;

    const passHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Cognotsav Confirmation Pass</title>
          <style>
            body { font-family: Arial, sans-serif; background: #05070b; color: #f8fafc; margin: 0; padding: 40px; }
            .card { max-width: 820px; margin: 0 auto; border-radius: 28px; padding: 36px; border: 1px solid rgba(103,232,249,0.25); background: linear-gradient(135deg, rgba(8,47,73,0.9), rgba(15,23,42,0.95)); box-shadow: 0 25px 80px rgba(0,0,0,0.35); }
            .eyebrow { letter-spacing: 0.35em; text-transform: uppercase; color: #67e8f9; font-size: 12px; font-weight: 700; }
            h1 { margin: 12px 0 8px; font-size: 42px; }
            p { color: #cbd5e1; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-top: 28px; }
            .cell { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 18px; }
            .label { font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px; }
            .value { font-size: 20px; font-weight: 700; color: #fff; word-break: break-word; }
            .footer { margin-top: 28px; padding: 18px; border-radius: 18px; background: rgba(34,211,238,0.08); color: #cffafe; }
            @media print { body { background: white; color: black; padding: 0; } .card { box-shadow: none; border: 1px solid #d4d4d8; color: black; background: white; } .value { color: black; } p, .footer { color: #111827; background: #f8fafc; } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="eyebrow">Cognotsav 2026 Confirmation Pass</div>
            <h1>${submissionReceipt.competitionName}</h1>
            <p>Your registration has been submitted successfully. Keep this pass for verification and future status tracking.</p>
            <div class="grid">
              <div class="cell"><div class="label">Team ID</div><div class="value">${submissionReceipt.teamId}</div></div>
              <div class="cell"><div class="label">Team Name</div><div class="value">${submissionReceipt.teamName}</div></div>
              <div class="cell"><div class="label">Leader</div><div class="value">${submissionReceipt.leaderName}</div></div>
              <div class="cell"><div class="label">Email</div><div class="value">${submissionReceipt.email}</div></div>
              <div class="cell"><div class="label">Amount Paid</div><div class="value">Rs. ${submissionReceipt.amountPaid}</div></div>
              <div class="cell"><div class="label">Transaction ID</div><div class="value">${submissionReceipt.transactionId}</div></div>
            </div>
            <div class="footer">Submitted on ${submissionReceipt.submittedAt}. Track your status anytime using your team ID or email on the Cognotsav portal.</div>
          </div>
          <script>window.onload = function(){ window.print(); }</script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(passHtml);
    printWindow.document.close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCompEnabled === false) return;

    if (competition.teamType !== 'solo' && !formData.teamName) {
      alert('Team Name is required.');
      return;
    }
    if (!formData.leaderName || !formData.email || !formData.mobile) {
      alert('Leader details are required.');
      return;
    }
    if (formData.collegeType === 'Other' && !formData.otherCollege) {
      alert('Please enter your college name.');
      return;
    }

    const allMembersFilled = formData.members.every((member) => member.name && member.email && member.mobile);
    if (!allMembersFilled && squadSize > 1) {
      alert('All team member details are mandatory.');
      return;
    }
    if (!formData.transactionId) {
      alert('Please enter the Transaction ID.');
      return;
    }

    setLoading(true);
    try {
      const submissionData = {
        ...formData,
        email: formData.email.toLowerCase(),
        teamSize: squadSize,
        amountPaid: calculatedFee,
        college: formData.collegeType === 'DVVPOE'
          ? 'Dr. Vithalrao Vikhe Patil College of Engineering'
          : formData.otherCollege
      };
      const result = await submitRegistration(competition.name, submissionData);
      setLoading(false);

      if (result.success && result.teamId) {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(getDraftKey(competition.id));
        }

        setSubmissionReceipt({
          teamId: result.teamId,
          competitionName: competition.name,
          leaderName: formData.leaderName,
          teamName: formData.teamName || 'Solo Entry',
          email: formData.email,
          amountPaid: calculatedFee,
          transactionId: formData.transactionId,
          submittedAt: new Date().toLocaleString()
        });
      } else {
        alert('Registration failed.');
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit registration.');
      setLoading(false);
    }
  };

  const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiDetails.payee)}&am=${calculatedFee}&cu=INR&tn=${encodeURIComponent(competition.name)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}`;

  if (submissionReceipt) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
        <div className="w-full max-w-3xl overflow-hidden rounded-[2.5rem] border border-cyan-400/30 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.25),transparent_35%),linear-gradient(180deg,#07090d_0%,#050505_100%)]">
          <div className="border-b border-white/5 px-8 py-7">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 size={34} />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-cyan-300/80">Registration Confirmed</p>
            <h2 className="mt-3 text-3xl font-orbitron font-black uppercase text-white">Your Pass Is Ready</h2>
            <p className="mt-3 max-w-2xl text-gray-400">
              Your registration for {competition.name} has been submitted for organizer verification. Save your team ID and use it in the tracker section anytime.
            </p>
          </div>

          <div className="grid gap-6 p-8 md:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-6">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.35em] text-cyan-300/70">Team Identity</p>
                  <h3 className="mt-2 text-2xl font-black text-white">{submissionReceipt.teamName}</h3>
                </div>
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-right">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-200/70">Current Status</p>
                  <p className="mt-1 text-sm font-black uppercase text-cyan-100">Pending Verification</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-white/8 bg-black/30 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Team ID</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-xl font-orbitron font-black text-white">{submissionReceipt.teamId}</p>
                    <button
                      type="button"
                      onClick={handleCopyTeamId}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-200"
                    >
                      {copiedTeamId ? <Check size={14} /> : <Copy size={14} />}
                      {copiedTeamId ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <ReceiptCell label="Leader" value={submissionReceipt.leaderName} />
                  <ReceiptCell label="Email" value={submissionReceipt.email} />
                  <ReceiptCell label="Amount" value={`\u20B9${submissionReceipt.amountPaid}`} />
                  <ReceiptCell label="Transaction" value={submissionReceipt.transactionId} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[2rem] border border-white/8 bg-white/[0.03] p-6">
                <div className="flex items-center gap-3 mb-4 text-cyan-200">
                  <Sparkles size={18} />
                  <p className="text-[11px] font-black uppercase tracking-[0.35em]">Next Steps</p>
                </div>
                <div className="space-y-3 text-sm text-gray-400">
                  <p>Keep your team ID safe for status tracking and event-day verification.</p>
                  <p>Use the tracker section on the homepage to see when your payment gets approved.</p>
                  <p>Reach out to support if your payment remains pending for too long.</p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-emerald-500/15 bg-emerald-500/10 p-6 text-sm text-emerald-100">
                <div className="flex items-center gap-3 mb-3">
                  <ShieldCheck size={18} />
                  <p className="text-[11px] font-black uppercase tracking-[0.35em]">Autosave Complete</p>
                </div>
                <p>Your draft has been cleared because the registration was submitted successfully.</p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 bg-black/40 px-8 py-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={openPrintablePass}
              className="flex-1 inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 px-6 py-4 font-black uppercase tracking-[0.25em] text-black shadow-lg shadow-cyan-500/25"
            >
              <Download size={18} />
              Download Pass
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                window.location.hash = 'tracker';
              }}
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-black uppercase tracking-[0.25em] text-white"
            >
              Open Tracker
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 md:p-4">
      <ContactSupport
        type="event"
        eventId={competition.id}
        context={isCompEnabled === false ? 'default' : (formData.transactionId ? 'payment' : 'registration')}
        autoOpen={isCompEnabled === false}
      />

      <div className="relative w-full h-full md:h-auto md:max-h-[95vh] md:max-w-6xl bg-[#050505] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white/5">
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-black/80 backdrop-blur-lg z-30">
          <div>
            <h2 className="text-xl md:text-3xl font-black text-white font-orbitron uppercase">{competition.name}</h2>
            <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-cyan-300/70 font-black">Draft autosaves on this device</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 bg-white/5 rounded-full"><X size={24} /></button>
        </div>

        {isCompEnabled === false && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-8 text-center">
            <div className="max-w-md space-y-6">
              <Ban size={40} className="text-red-500 mx-auto" />
              <h3 className="text-3xl font-black text-white font-orbitron uppercase">Registration Terminated</h3>
              <p className="text-gray-400">Registration slots are full for this event.</p>
              <button onClick={onClose} className="px-10 py-4 bg-white/5 text-gray-400 rounded-xl">Close Terminal</button>
            </div>
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className={`flex-grow overflow-y-auto custom-scrollbar flex flex-col lg:flex-row bg-black pb-24 md:pb-0 ${isCompEnabled === false ? 'pointer-events-none opacity-50 grayscale' : ''}`}>
          <div className="flex-[1.5] p-6 md:p-12 space-y-12">
            <div className="rounded-[2rem] border border-cyan-500/10 bg-cyan-500/5 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-200/70">Registration Experience</p>
                  <h3 className="mt-2 text-xl font-black text-white">Fast checkout with recovery and pass generation</h3>
                </div>
                <span className="rounded-full border border-cyan-500/20 bg-black/30 px-4 py-2 text-[11px] font-black uppercase tracking-[0.25em] text-cyan-200">
                  Team size: {squadSize}
                </span>
              </div>
            </div>

            {(competition.id === 'utopia' || competition.id === 'tech-kbc') && (
              <div className="space-y-3 pb-4 border-b border-white/5">
                <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
                  Information About {competition.id === 'utopia' ? 'UTOPIA' : 'TECH KBC'}
                </h4>
                <a
                  href={competition.id === 'utopia'
                    ? 'https://drive.google.com/uc?export=view&id=18JCSkDBrDgIVGTi5z_LrtUS0uSyh_pbr'
                    : 'https://drive.google.com/uc?export=download&id=1_h4F8OaJ96gNIwKdNJqeKz98F1SJfV_U'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black text-white uppercase tracking-widest transition-all"
                >
                  View Handbook
                </a>
              </div>
            )}

            <div className="space-y-6">
              <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">College_Affiliation</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select
                  name="collegeType"
                  value={formData.collegeType}
                  onChange={handleInputChange}
                  className="w-full h-14 bg-[#0a0a0a] border border-white/10 rounded-xl px-5 text-white outline-none focus:border-cyan-500/50"
                >
                  <option value="DVVPOE">DVVPOE (Dr. Vithalrao Vikhe Patil College of Engineering)</option>
                  <option value="Other">Other College</option>
                </select>
                {formData.collegeType === 'Other' && (
                  <input
                    required
                    name="otherCollege"
                    value={formData.otherCollege}
                    onChange={handleInputChange}
                    placeholder="Enter Your College Name"
                    className="w-full h-14 bg-[#0a0a0a] border border-white/10 rounded-xl px-5 text-white focus:border-cyan-500/50 outline-none"
                  />
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">Squad_Configuration</h4>
                {competition.teamType === 'flexible' ? (
                  <select
                    value={squadSize}
                    onChange={(e) => handleSizeChange(parseInt(e.target.value, 10))}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-xs text-cyan-400 outline-none"
                  >
                    {sizeOptions.map((num) => <option key={num} value={num}>{num} Members</option>)}
                  </select>
                ) : (
                  <span className="text-xs font-bold text-cyan-500 uppercase tracking-widest">
                    {competition.teamType === 'solo' ? 'Solo Entry' : `${competition.maxMembers} Members Fixed`}
                  </span>
                )}
              </div>

              {competition.teamType !== 'solo' ? (
                <input
                  required
                  name="teamName"
                  value={formData.teamName}
                  onChange={handleInputChange}
                  placeholder="Team Name"
                  className="w-full h-14 bg-[#0a0a0a] border border-white/10 rounded-xl px-5 text-white focus:border-cyan-500/50 outline-none"
                />
              ) : (
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold ml-1">Individual Registration Protocol Active</p>
              )}
            </div>

            <div className="space-y-6">
              <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">
                {competition.teamType === 'solo' ? 'Participant_Identity' : 'Member 1 (Team Leader)'}
              </h4>
              <input
                required
                name="leaderName"
                value={formData.leaderName}
                onChange={handleInputChange}
                placeholder={competition.teamType === 'solo' ? 'Enter Your Full Name' : 'Full Name (Team Leader)'}
                className="w-full h-14 bg-[#0a0a0a] border border-white/10 rounded-xl px-5 text-white focus:border-cyan-500/50 outline-none"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input required type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Email Address" className="w-full h-14 bg-[#0a0a0a] border border-white/10 rounded-xl px-5 text-white focus:border-cyan-500/50 outline-none" />
                <input required type="tel" name="mobile" value={formData.mobile} onChange={handleInputChange} placeholder="Mobile Number" className="w-full h-14 bg-[#0a0a0a] border border-white/10 rounded-xl px-5 text-white focus:border-cyan-500/50 outline-none" />
              </div>
            </div>

            {formData.members.map((member, idx) => (
              <div key={idx} className="p-6 bg-white/[0.02] border-l-2 border-cyan-500/50 rounded-r-2xl space-y-6 animate-in slide-in-from-left-2">
                <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">Member {idx + 2}_Identity</h4>
                <input required placeholder="Full Name" value={member.name} onChange={(e) => handleMemberChange(idx, 'name', e.target.value)} className="w-full h-12 bg-black border border-white/5 rounded-lg px-4 text-white focus:border-cyan-500/50 outline-none" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input required type="email" placeholder="Email Address" value={member.email} onChange={(e) => handleMemberChange(idx, 'email', e.target.value)} className="w-full h-12 bg-black border border-white/5 rounded-lg px-4 text-white focus:border-cyan-500/50 outline-none" />
                  <input required type="tel" placeholder="Mobile Number" value={member.mobile} onChange={(e) => handleMemberChange(idx, 'mobile', e.target.value)} className="w-full h-12 bg-black border border-white/5 rounded-lg px-4 text-white focus:border-cyan-500/50 outline-none" />
                </div>
              </div>
            ))}
          </div>

          <div id="payment-section" className="flex-1 bg-[#0a0a0a] border-t lg:border-t-0 lg:border-l border-white/5 p-8 flex flex-col items-center justify-center">
            <h3 className="text-[10px] font-black text-gray-600 uppercase mb-2 tracking-widest">Registration_Fee</h3>
            <p className="text-5xl font-black text-white font-orbitron mb-8 tracking-tighter">\u20B9{calculatedFee}</p>

            <div className="w-full rounded-[2rem] border border-white/8 bg-white/[0.03] p-4 mb-8">
              <p className="text-[10px] font-black text-cyan-300 uppercase tracking-[0.25em]">Draft Recovery</p>
              <p className="mt-2 text-sm text-gray-400">Your registration progress is being saved automatically on this device until you submit successfully.</p>
            </div>

            <div className="text-center mb-8">
              <p className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-4">Scan & Pay \u20B9{calculatedFee}</p>
              <div className="bg-white p-6 rounded-[2.5rem] inline-block shadow-[0_0_50px_rgba(6,182,212,0.1)]">
                <img src={qrUrl} alt="Payment QR" className="w-48 h-48" />
              </div>
            </div>

            <div className="w-full space-y-6">
              <div className="text-center">
                <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-4">OR PAY VIA UPI</p>
                <button type="button" onClick={handleCopyUPI} className="w-full p-4 bg-white/[0.03] border border-white/10 rounded-2xl flex justify-between items-center group hover:border-cyan-500/30 transition-all">
                  <span className="text-sm font-mono text-white">{upiId}</span>
                  {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} className="text-gray-500 group-hover:text-cyan-400" />}
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-600 uppercase tracking-widest font-black ml-1">Transaction Confirmation</label>
                  <input
                    required
                    name="transactionId"
                    value={formData.transactionId}
                    onChange={handleInputChange}
                    placeholder="Enter UPI Transaction ID"
                    className="w-full h-14 bg-black border border-purple-500/30 rounded-2xl px-4 text-white text-center font-mono tracking-normal focus:border-cyan-500/50 outline-none"
                  />
                  <p className="text-[9px] text-gray-500 text-center uppercase italic">Mandatory for manual finance verification</p>
                </div>
              </div>
            </div>
          </div>
        </form>

        <div className="p-4 md:p-8 bg-black/90 border-t border-white/5 z-40">
          <button
            onClick={() => formRef.current?.requestSubmit()}
            disabled={loading || isCompEnabled === false}
            className="w-full h-16 md:h-20 bg-cyan-600 hover:bg-cyan-500 text-black font-black rounded-2xl uppercase tracking-[0.3em] disabled:opacity-50 transform active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(6,182,212,0.2)]"
          >
            {loading ? 'Processing...' : isCompEnabled === false ? 'Slots Full' : 'Initialize Submission'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ReceiptCell: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl border border-white/8 bg-black/30 p-4">
    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">{label}</p>
    <p className="mt-2 text-sm font-bold text-white break-words">{value}</p>
  </div>
);

export default RegistrationModal;
