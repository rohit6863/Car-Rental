import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, FileImage } from 'lucide-react';
import client from '../api/client';
import AdminModal from '../components/AdminModal';
import StatusPill from '../components/StatusPill';
import { useSearch } from '../context/SearchContext';
import { useToast } from '../context/ToastContext';

function getDisplayKycStatus(user) {
  if (user.KycStatus === 'Verified') return 'Verified';
  if (user.KycStatus === 'Rejected') return 'Rejected';
  if (user.KycSubmittedAt) return 'Pending Review';
  return 'Not Submitted';
}

export default function AdminRegUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedUser, setSelectedUser] = useState(null);
  const [dlNumber, setDlNumber] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [docPreviewUrl, setDocPreviewUrl] = useState('');
  const [docLoading, setDocLoading] = useState(false);
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

  useEffect(() => {
    let active = true;
    let objectUrl = '';

    async function loadDoc() {
      if (!selectedUser || !selectedUser.hasKycDocument) {
        setDocPreviewUrl('');
        setDocLoading(false);
        return;
      }
      setDocLoading(true);
      try {
        const res = await client.get(`/api/admin/users/${selectedUser.id}/kyc-document`, {
          responseType: 'blob',
        });
        if (!active) return;
        objectUrl = URL.createObjectURL(res.data);
        setDocPreviewUrl(objectUrl);
      } catch {
        if (active) setDocPreviewUrl('');
      } finally {
        if (active) setDocLoading(false);
      }
    }

    loadDoc();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedUser]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [
        u.FullName,
        u.EmailId,
        u.ContactNo,
        u.City,
        u.DrivingLicenseNo,
        getDisplayKycStatus(u),
      ]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q))
    );
  }, [users, searchQuery]);

  const openKycModal = (user) => {
    setSelectedUser(user);
    setDlNumber(user.DrivingLicenseNo || '');
    setRejectionReason(user.KycRejectionReason || '');
  };

  const handleDecision = async (decisionStatus) => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await client.patch(`/api/admin/users/${selectedUser.id}/kyc`, {
        status: decisionStatus,
        drivingLicenseNo: dlNumber.trim() || null,
        rejectionReason: decisionStatus === 'Rejected' ? rejectionReason.trim() || null : null,
      });
      showToast(`KYC marked ${decisionStatus} for ${selectedUser.FullName}`, decisionStatus === 'Verified' ? 'emerald' : 'rose');
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
          <span className="text-xs text-slate-400 dark:text-zinc-400 tabular-nums">{filteredUsers.length} total</span>
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
                  filteredUsers.map((u, idx) => {
                    const displayStatus = getDisplayKycStatus(u);
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-[#1C1C1F]/70">
                        <td className="px-3.5 py-3 tabular-nums text-slate-500 dark:text-zinc-400">{idx + 1}</td>
                        <td className="px-3.5 py-3">
                          <div className="font-semibold text-slate-900 dark:text-zinc-100">{u.FullName}</div>
                          <div className="text-[11px] text-slate-400 dark:text-zinc-500 tabular-nums">{u.tripCount || 0} trips</div>
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
                          <StatusPill status={displayStatus} />
                          {u.KycSubmittedAt && (
                            <div className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 tabular-nums">
                              Received {new Date(u.KycSubmittedAt).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openKycModal(u)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-lavender-50 dark:bg-amber-500/15 text-lavender-600 dark:text-amber-400 hover:bg-lavender-100 dark:hover:bg-amber-500/25 font-semibold transition cursor-pointer"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Inspect KYC</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AdminModal
        isOpen={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title="Driver KYC Inspection"
        subtitle={selectedUser ? selectedUser.EmailId : ''}
        maxWidth="max-w-lg"
      >
        {selectedUser && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1C1C1F] border border-hairline dark:border-[#27272A] flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="font-bold text-sm text-slate-900 dark:text-zinc-100">{selectedUser.FullName}</div>
                <div className="text-slate-500 dark:text-zinc-400">
                  Phone: {selectedUser.ContactNo || '-'} &bull; Trips: {selectedUser.tripCount || 0}
                </div>
                <div className="text-slate-500 dark:text-zinc-400 tabular-nums">
                  {selectedUser.KycSubmittedAt
                    ? `Received on ${new Date(selectedUser.KycSubmittedAt).toLocaleString()}`
                    : 'Customer has not submitted KYC yet'}
                </div>
              </div>
              <StatusPill status={getDisplayKycStatus(selectedUser)} />
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
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1.5">
                Uploaded Driving License Document
              </div>
              {docLoading ? (
                <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-[#27272A] text-center text-slate-400 dark:text-zinc-500">
                  Loading document preview...
                </div>
              ) : docPreviewUrl ? (
                <div className="rounded-xl overflow-hidden border border-hairline dark:border-[#27272A] bg-slate-50 dark:bg-[#1C1C1F] p-2">
                  <img
                    src={docPreviewUrl}
                    alt={`${selectedUser.FullName} Driving License`}
                    className="w-full max-h-64 object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="p-5 rounded-xl border border-dashed border-slate-200 dark:border-[#27272A] bg-slate-50/50 dark:bg-[#1C1C1F] flex items-center justify-center gap-2 text-slate-400 dark:text-zinc-500">
                  <FileImage className="w-4 h-4" />
                  <span>No document image uploaded</span>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="kyc-reject-reason"
                className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-300 mb-1.5"
              >
                Rejection Reason (optional if rejecting)
              </label>
              <input
                id="kyc-reject-reason"
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. License photo blurry or expired"
                className="w-full px-3.5 py-2 rounded-xl border border-hairline dark:border-[#27272A] bg-white dark:bg-[#1C1C1F] text-slate-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-lavender-600 dark:focus:ring-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-hairline dark:border-[#27272A]">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 rounded-xl border border-hairline dark:border-[#27272A] text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-[#1C1C1F] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleDecision('Rejected')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-60"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject KYC</span>
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleDecision('Verified')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-60"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve KYC</span>
              </button>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
