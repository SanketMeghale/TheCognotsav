
import React, { useState } from 'react';
import { Lock, ArrowLeft, ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { loginAdmin, checkAdminRole } from '../firebaseConfig.ts';

interface Props {
  onBack: () => void;
  onSuccess: () => void;
}

const AdminLogin: React.FC<Props> = ({ onBack, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Authenticate with Firebase Auth
      const userCredential = await loginAdmin(email, password);
      
      // 2. Check Role in Firestore 'roles' collection
      const isAdmin = await checkAdminRole(userCredential.user.uid);
      
      if (isAdmin) {
        onSuccess();
      } else {
        setError("Account Found, but 'admin' role is missing in Firestore 'roles' collection for UID: " + userCredential.user.uid);
      }
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      console.error("Firebase Auth Error:", firebaseError.code, firebaseError.message);
      
      if (firebaseError.code === 'auth/invalid-credential') {
        setError("Invalid email or password. IMPORTANT: You must manually add this user in your Firebase Console > Authentication tab before logging in.");
      } else if (firebaseError.code === 'auth/user-not-found') {
        setError("No user found with this email. Please add this user in your Firebase Console.");
      } else if (firebaseError.code === 'auth/wrong-password') {
        setError("Incorrect password for this admin account.");
      } else if (firebaseError.code === 'auth/network-request-failed') {
        setError("Network error. Please check your connection.");
      } else {
        setError(firebaseError.message || "An authentication error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="w-full max-w-md relative z-10">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest">Return to Home</span>
        </button>

        <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
          <header className="text-center mb-10">
            <div className="w-20 h-20 bg-cyan-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
              <ShieldCheck size={40} className="text-cyan-400" />
            </div>
            <h1 className="font-orbitron text-2xl font-black text-white tracking-tighter uppercase">
              Admin <span className="text-cyan-400 italic">Auth</span>
            </h1>
            <p className="text-gray-500 text-[10px] mt-2 uppercase tracking-[0.3em] font-bold">Secure Command Uplink</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-600 uppercase tracking-widest font-black ml-1">Identity (Email)</label>
                <input 
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@ceasfest.com"
                  className="w-full bg-black border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-cyan-500/50 outline-none transition-all placeholder:text-gray-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-gray-600 uppercase tracking-widest font-black ml-1">Security Key</label>
                <div className="relative">
                  <input 
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-cyan-500/50 outline-none transition-all placeholder:text-gray-800"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-700 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex flex-col gap-2 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl text-red-400 text-xs animate-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <AlertCircle size={18} className="shrink-0" />
                  <p className="font-semibold">{error}</p>
                </div>
                <p className="text-[9px] text-gray-500 mt-1 uppercase italic">Check Firebase Console &gt; Auth to verify user exists.</p>
              </div>
            )}

            <button 
              disabled={loading}
              type="submit"
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-black font-black py-4 rounded-2xl shadow-lg shadow-cyan-500/10 transform active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-xs"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
              ) : (
                <>Establish Connection <Lock size={16} /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
