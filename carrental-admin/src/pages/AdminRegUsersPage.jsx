import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck } from 'lucide-react';
import client from '../api/client';
import AdminModal from '../components/AdminModal';
import StatusPill from '../components/StatusPill';
import { useSearch } from '../context/SearchContext';
import { useToast } from '../context/ToastContext';

export default function AdminRegUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedUser, setSelectedUser] = useState(null);
  const [kycStatus, setKycStatus] = useState('Verified');
  const [dlNumber, setDlNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const { searchQuery } = useSearch();
  const { showToast } = useToast();

  const loadUsers = async () => {
    try {
      const res = await client.get('/api/admin/users');
      setUsers(res.data);
    } catch {
      setError('Failed to load registered users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.FullName, u.EmailId, u.ContactNo, u.City, u.DrivingLicenseNo, u.KycStatus]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  const openKycModal = (user) => {
    setSelectedUser(user);
    setKycStatus(user.KycStatus === 'Rejected' ? 'Rejected' : 'Verified');
    setDlNumber(user.DrivingLicenseNo || '');
  };

  const handleSaveKyc = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSaving(true);
    try {
      await client.patch(`/api/admin/users/${selectedUser.id}/kyc`, {
        kycStatus,
        drivingLicenseNo: dlNumber.trim() || null,
      });
      showToast(`KYC marked ${kycStatus} for ${selectedUser.FullName}`, 'emerald');
      setSelectedUser(null);
      await loadUsers();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to update KYC status';
      showToast(msg, 'rose');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="page-title text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">Registered Users</h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
          Customer accounts, trip activity, and driving license KYC verification
        </p>
      </div>

      {error && <div className="errorWrap"><strong>ERROR</strong>: {error}</div>}

      <div className="bento-card overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline dark:border-[#27272A] flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900 dark:text-zinc-100">Reg Users</span>
          <span className="text-xs text-slate-400 tabular-nums">{filteredUsers.length} total</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-slate-500 dark:text-zinc-400">Loading registered users...</p>
          ) : (
            <table id="zctb" className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-[#1C1C1F] text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-hairline dark:border-[#27272A]">
                <tr>
                  <th className="px-3.5 py-3 font-semibold">#</th>
                  <th className="px-3.5 py-3 font-semibold">Name</th>
                  <th className="px-3.5 py-3 font-semibold">Email</th>
                  <th className="px-3.5 py-3 font-semibold">Contact no</th>
                  <th className="px-3.5 py-3 font-semibold">DOB</th>
                  <th className="px-3.5 py-3 font-semibold">Address</th>
                  <th className="px-3.5 py-3 font-semibold">City</th>
                  <th className="px-3.5 py-3 font-semibold">Country</th>
                  <th className="px-3.5 py-3 font-semibold">Reg Date</th>
                  <th className="px-3.5 py-3 font-semibold">Driving License</th>
                  <th className="px-3.5 py-3 font-semibold">KYC Status</th>
                  <th className="px-3.5 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline dark:divide-[#27272A]">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                      No registered users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, idx) => (
                    <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-[#1C1C1F]/70">
                      <td className="px-3.5 py-3 tabular-nums text-slate-500 dark:text-zinc-400">{idx + 1}</td>
                      <td className="px-3.5 py-3">
                        <div className="font-semibold text-slate-900 dark:text-zinc-100">{u.FullName}</div>
                        <div className="text-[11px] text-slate-400 tabular-nums">{u.tripCount || 0} trips</div>
                      </td>
                      <td className="px-3.5 py-3 text-slate-700 dark:text-zinc-300">{u.EmailId}</td>
                      <td className="px-3.5 py-3 tabular-nums text-slate-600 dark:text-zinc-300">{u.ContactNo}</td>
                      <td className="px-3.5 py-3 tabular-nums text-slate-600 dark:text-zinc-300">{u.dob || '-'}</td>
                      <td className="px-3.5 py-3 text-slate-600 dark:text-zinc-300">{u.Address || '-'}</td>
                      <td className="px-3.5 py-3 text-slate-600 dark:text-zinc-300">{u.City || '-'}</td>
                      <td className="px-3.5 py-3 text-slate-600 dark:text-zinc-300">{u.Country || '-'}</td>
                      <td className="px-3.5 py-3 tabular-nums text-slate-500 dark:text-zinc-400">
                        {u.RegDate ? new Date(u.RegDate).toLocaleDateString() : ''}
                      </td>
                      <td className="px-3.5 py-3 font-mono text-[11px] text-slate-700 dark:text-zinc-300">
                        {u.DrivingLicenseNo || 'Not Provided'}
                      </td>
                      <td className="px-3.5 py-3">
                        <StatusPill status={u.KycStatus || 'Pending'} />
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openKycModal(u)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-lavender-50 dark:bg-amber-500/15 text-lavender-600 dark:text-amber-400 hover:bg-lavender-100 dark:hover:bg-amber-500/25 font-semibold transition cursor-pointer"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>{u.KycStatus === 'Verified' ? 'Review KYC' : 'Approve KYC'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AdminModal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title="Driver KYC Verification"
        subtitle={selectedUser ? selectedUser.EmailId : ''}
      >
        {selectedUser && (
          <form onSubmit={handleSaveKyc} className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1C1C1F] border border-hairline dark:border-[#27272A] text-xs space-y-1">
              <div className="font-semibold text-slate-900 dark:text-zinc-100">{selectedUser.FullName}</div>
              <div className="text-slate-500 dark:text-zinc-400">
                Phone: {selectedUser.ContactNo || '-'} &bull; Trips: {selectedUser.tripCount || 0}
              </div>
            </div>

            <div>
              <label
                htmlFor="kyc-dl"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1.5"
              >
                Driving License Number
              </label>
              <input
                id="kyc-dl"
                type="text"
                value={dlNumber}
                onChange={(e) => setDlNumber(e.target.value)}
                placeholder="e.g. MH12-20190012345"
                className="w-full px-3.5 py-2.5 rounded-xl border border-hairline dark:border-[#27272A] bg-white dark:bg-[#1C1C1F] text-slate-900 dark:text-zinc-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-lavender-600 dark:focus:ring-amber-500"
              />
            </div>

            <div>
              <label
                htmlFor="kyc-status"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1.5"
              >
                KYC Decision
              </label>
              <select
                id="kyc-status"
                value={kycStatus}
                onChange={(e) => setKycStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-hairline dark:border-[#27272A] bg-white dark:bg-[#1C1C1F] text-slate-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-lavender-600 dark:focus:ring-amber-500"
              >
                <option value="Verified">Verified</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-xl border border-hairline dark:border-[#27272A] text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-[#1C1C1F] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-lavender-600 hover:bg-lavender-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-zinc-950 text-xs font-semibold transition cursor-pointer disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save KYC Decision'}
              </button>
            </div>
          </form>
        )}
      </AdminModal>
    </div>
  );
}
