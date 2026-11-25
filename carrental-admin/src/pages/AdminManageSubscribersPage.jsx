import React, { useState, useEffect } from 'react';
import client from '../api/client';

export default function AdminManageSubscribersPage() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSubscribers() {
      try {
        const res = await client.get('/api/admin/subscribers');
        setSubscribers(res.data);
      } catch {
        setError('Failed to load subscribers');
      } finally {
        setLoading(false);
      }
    }
    loadSubscribers();
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="page-title text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">Manage Subscribers</h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Newsletter subscribers from the customer portal</p>
      </div>

      {error && <div className="errorWrap"><strong>ERROR</strong>: {error}</div>}

      <div className="bento-card overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline dark:border-[#27272A] flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900 dark:text-zinc-100">Subscribers Details</span>
          <span className="text-xs text-slate-400 tabular-nums">{subscribers.length} total</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-slate-500 dark:text-zinc-400">Loading subscribers...</p>
          ) : (
            <table id="zctb" className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-[#1C1C1F] text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-hairline dark:border-[#27272A]">
                <tr>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Email Id</th>
                  <th className="px-4 py-3 font-semibold">Subscription Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline dark:divide-[#27272A]">
                {subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                      No subscribers found
                    </td>
                  </tr>
                ) : (
                  subscribers.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-[#1C1C1F]/70">
                      <td className="px-4 py-3 tabular-nums text-slate-500 dark:text-zinc-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-zinc-100">{s.SubscriberEmail}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-500 dark:text-zinc-400">
                        {s.PostingDate ? new Date(s.PostingDate).toLocaleString() : ''}
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
