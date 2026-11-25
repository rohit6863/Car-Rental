import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
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
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bento-card p-7 sm:p-8 shadow-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src="/img/logo.JPG"
            alt="WanderWheels"
            className="w-14 h-14 rounded-2xl object-cover border border-hairline shadow-xs mb-3"
          />
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
            Wander<span className="text-rose-600">Wheels</span> Admin
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Sign in to Fleet Operations & Analytics
          </p>
        </div>

        {error && (
          <div className="alert alert-danger mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5"
            >
              Your Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="username"
                type="text"
                placeholder="Username"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-lavender-600 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 outline-none transition"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="password"
                type="password"
                placeholder="Password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-lavender-600 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 outline-none transition"
                required
              />
            </div>
          </div>

          <button
            className="w-full py-3 px-4 rounded-xl bg-lavender-600 hover:bg-lavender-700 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer disabled:opacity-60"
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
