import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertTriangle, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(username, password);
      if (data.mustChangePassword) {
        navigate('/change-password', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      if (err.response?.status === 429) {
        const retryHeader = err.response.headers?.['retry-after'];
        const retryAfter = err.response.data?.retryAfter || (retryHeader ? parseInt(retryHeader, 10) : null);
        if (retryAfter) {
          const mins = Math.max(1, Math.ceil(retryAfter / 60));
          setError(`Too many attempts. Try again in ${mins} minute${mins > 1 ? 's' : ''}.`);
          return;
        }
      }
      setError(err.response?.data?.error || 'Invalid Details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F7FE] dark:bg-[#0C0C0E] flex flex-col items-center justify-center p-4 relative transition-colors">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="absolute top-5 right-5 inline-flex items-center h-9 px-1 rounded-full bg-white dark:bg-[#141416] border border-hairline dark:border-[#27272A] shadow-xs transition cursor-pointer"
      >
        <span
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
            !isDark ? 'bg-indigo-600 text-white' : 'text-zinc-400'
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Light</span>
        </span>
        <span
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
            isDark ? 'bg-amber-500 text-zinc-950' : 'text-slate-500'
          }`}
        >
          <Moon className="w-3.5 h-3.5" />
          <span>Dark</span>
        </span>
      </button>

      <div className="w-full max-w-md bento-card p-7 sm:p-8 shadow-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-1 rounded-2xl bg-white border border-hairline dark:border-[#27272A] shadow-xs mb-3">
            <img
              src="/img/logo.JPG"
              alt="WanderWheels"
              className="w-14 h-14 rounded-xl object-cover block"
            />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100">
            Wander<span className="text-rose-600 dark:text-rose-500">Wheels</span> Admin
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
            Sign in to Fleet Operations &amp; Analytics
          </p>
        </div>

        {error && (
          <div className="alert alert-danger mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1.5"
            >
              Your Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="username"
                type="text"
                placeholder="Username"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white dark:bg-[#1C1C1F] border border-slate-200 dark:border-[#27272A] focus:border-lavender-600 dark:focus:border-amber-500 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="password"
                type="password"
                placeholder="Password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white dark:bg-[#1C1C1F] border border-slate-200 dark:border-[#27272A] focus:border-lavender-600 dark:focus:border-amber-500 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition"
                required
              />
            </div>
          </div>

          <button
            className="w-full py-3 px-4 rounded-xl bg-lavender-600 hover:bg-lavender-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-zinc-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-60"
            name="login"
            type="submit"
            disabled={loading}
          >
            {loading ? 'LOGGING IN...' : 'LOGIN'}
          </button>
        </form>
      </div>
    </div>
  );
}
