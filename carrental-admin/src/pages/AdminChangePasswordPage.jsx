import React, { useState } from 'react';
import { KeyRound, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  'qwertyuiop',
  'asdfghjkl',
  'asdfghjkl1',
  'admin123456',
  'administrator',
  'letmein123',
  'welcome1234',
  'iloveyou123',
  'changeme123',
]);

export default function AdminChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { changePassword, mustChangePassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    if (!currentPassword) {
      setError('Current password is required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 12) {
      setError('New password must be at least 12 characters');
      return;
    }

    if (newPassword.length > 128) {
      setError('Password cannot exceed 128 characters');
      return;
    }

    if (COMMON_PASSWORDS.has(newPassword.toLowerCase())) {
      setError('Password is too common or easily guessed. Please choose a stronger password.');
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      setMsg('Your Password successfully changed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      if (err.response?.data?.details && Array.isArray(err.response.data.details) && err.response.data.details.length > 0) {
        setError(err.response.data.details.map((d) => d.message).join('. '));
      } else {
        setError(err.response?.data?.error || 'Your current password is not valid.');
      }
    } finally {
      setSubmitting(false);
      if (typeof window !== 'undefined' && window.scrollTo) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="page-title text-xl font-bold text-slate-900 dark:text-white tracking-tight">Change Password</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Update administrator credentials (minimum 12 characters)</p>
      </div>

      {mustChangePassword && (
        <div className="alert alert-warning">
          <strong>Security Notice:</strong> You must change the default password before proceeding.
        </div>
      )}

      {error && <div className="errorWrap"><strong>ERROR</strong>: {error}</div>}
      {msg && <div className="succWrap"><strong>SUCCESS</strong>: {msg}</div>}

      <div className="bento-card p-6">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-hairline dark:border-slate-800">
          <KeyRound className="w-4 h-4 text-lavender-600 dark:text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Password Settings</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-lavender-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
              name="password"
              id="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="newpassword" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              New Password
            </label>
            <input
              type="password"
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-lavender-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
              name="newpassword"
              id="newpassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="confirmpassword" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-lavender-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none"
              name="confirmpassword"
              id="confirmpassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              className="px-5 py-2.5 rounded-xl bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
              name="submit"
              type="submit"
              disabled={submitting}
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'Saving...' : 'Save changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
