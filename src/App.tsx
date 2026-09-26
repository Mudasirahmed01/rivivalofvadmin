import { FormEvent, useEffect, useState } from 'react';
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import AdminDashboard from './components/AdminDashboard';
import { supabase } from './lib/supabaseClient';

const requiredVariables = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_CLOUDINARY_CLOUD_NAME',
  'VITE_CLOUDINARY_UPLOAD_PRESET',
] as const;

export default function AdminApp() {
  const [session, setSession] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const missingVariables = requiredVariables.filter((name) => !import.meta.env[name]);

  useEffect(() => {
    if (missingVariables.length) {
      setChecking(false);
      return;
    }

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) setError(sessionError.message);
      const currentSession = data.session;
      if (currentSession?.user.app_metadata?.role === 'admin') setSession(currentSession);
      setChecking(false);
    }).catch((sessionError: unknown) => {
      setError(sessionError instanceof Error ? sessionError.message : 'Unable to restore session.');
      setChecking(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession?.user.app_metadata?.role === 'admin' ? nextSession : null);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (loginError) {
      setError(loginError.message);
      return;
    }
    if (data.user?.app_metadata?.role !== 'admin') {
      await supabase.auth.signOut();
      setError('This account is not authorized as an admin.');
      return;
    }
    setSession(data.session);
  };

  if (missingVariables.length) {
    return <MessageScreen title="Admin site needs configuration" detail={`Add these Vercel environment variables and redeploy: ${missingVariables.join(', ')}`} />;
  }

  if (checking) return <MessageScreen title="Checking your session" detail="Connecting securely to Supabase." />;
  if (session) return <AdminDashboard onBack={() => { void supabase.auth.signOut(); setSession(null); }} />;

  return <main className="min-h-screen bg-[#f4f6f2] px-4 py-10 md:px-8">
    <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(23,33,29,0.12)] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden min-h-170 flex-col justify-between overflow-hidden bg-[#193d30] p-12 text-white lg:flex">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(135deg, transparent 35%, #9cbd9d 35%, #9cbd9d 36%, transparent 36%), linear-gradient(45deg, transparent 65%, #d0a56f 65%, #d0a56f 66%, transparent 66%)', backgroundSize: '76px 76px' }} />
        <div className="relative flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10"><ShieldCheck size={22} /></div><span className="text-sm font-bold uppercase tracking-[0.18em]">REVIVAL OF V</span></div>
        <div className="relative max-w-lg"><p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[#c6d8c8]">Private store console</p><h1 className="text-5xl font-bold leading-[1.08]">Everything your store needs. In one place.</h1><p className="mt-6 max-w-md text-base leading-7 text-white/70">Manage products, orders, homepage content and store pricing from a dedicated admin site.</p></div>
        <p className="relative text-xs text-white/50">Protected by Supabase authentication and database policies.</p>
      </section>
      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <form onSubmit={handleLogin} className="w-full max-w-md">
          <div className="mb-8 grid h-12 w-12 place-items-center rounded-2xl bg-[#e8f0e9] text-[#225b45]"><LockKeyhole size={22} /></div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#648072]">Admin access</p>
          <h2 className="mt-2 text-3xl font-bold text-[#17211d]">Sign in to your store</h2>
          <p className="mt-2 text-sm leading-6 text-[#68766e]">Use the Supabase account whose app metadata role is set to admin.</p>
          <label className="mt-8 block text-sm font-semibold text-[#24342b]">Email</label>
          <div className="mt-2 flex items-center gap-3 rounded-xl border border-[#dce5dd] bg-[#fbfcfa] px-4 focus-within:border-[#548269]"><Mail size={17} className="text-[#74867b]" /><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" className="h-12 w-full bg-transparent text-sm outline-none" /></div>
          <label className="mt-5 block text-sm font-semibold text-[#24342b]">Password</label>
          <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" className="mt-2 h-12 w-full rounded-xl border border-[#dce5dd] bg-[#fbfcfa] px-4 text-sm outline-none focus:border-[#548269]" />
          {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#225b45] text-sm font-bold text-white transition hover:bg-[#194533] disabled:opacity-60">{busy ? 'Signing in...' : 'Continue'} {!busy && <ArrowRight size={16} />}</button>
          <p className="mt-8 text-xs leading-5 text-[#75847b]">This is the separate administration site. Customer storefront access is not provided here.</p>
        </form>
      </section>
    </div>
  </main>;
}

function MessageScreen({ title, detail }: { title: string; detail: string }) {
  return <main className="grid min-h-screen place-items-center bg-[#f4f6f2] p-6"><section className="max-w-lg rounded-2xl bg-white p-8 shadow-xl"><h1 className="text-xl font-bold text-[#17211d]">{title}</h1><p className="mt-3 wrap-break-word text-sm leading-6 text-[#68766e]">{detail}</p></section></main>;
}
