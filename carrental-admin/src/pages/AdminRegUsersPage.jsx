import React, { useState, useEffect } from 'react';
import client from '../api/client';

export default function AdminRegUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await client.get('/api/admin/users');
        setUsers(res.data);
      } catch {
        setError('Failed to load registered users');
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="page-title text-xl font-bold text-slate-900 tracking-tight">Registered Users</h2>
        <p className="text-xs text-slate-500 mt-0.5">Customer accounts registered on the WanderWheels portal</p>
      </div>

      {error && <div className="errorWrap"><strong>ERROR</strong>: {error}</div>}

      <div className="bento-card overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900">Reg Users</span>
          <span className="text-xs text-slate-400 tabular-nums">{users.length} total</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-slate-500">Loading registered users...</p>
          ) : (
            <table id="zctb" className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider border-b border-hairline">
                <tr>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Contact no</th>
                  <th className="px-4 py-3 font-semibold">DOB</th>
                  <th className="px-4 py-3 font-semibold">Address</th>
                  <th className="px-4 py-3 font-semibold">City</th>
                  <th className="px-4 py-3 font-semibold">Country</th>
                  <th className="px-4 py-3 font-semibold">Reg Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                      No registered users found
                    </td>
                  </tr>
                ) : (
                  users.map((u, idx) => (
                    <tr key={u.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 tabular-nums text-slate-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{u.FullName}</td>
                      <td className="px-4 py-3 text-slate-700">{u.EmailId}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-600">{u.ContactNo}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-600">{u.dob || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{u.Address || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{u.City || '-'}</td>
                      <td className="px-4 py-3 text-slate-600">{u.Country || '-'}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-500">
                        {u.RegDate ? new Date(u.RegDate).toLocaleDateString() : ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
