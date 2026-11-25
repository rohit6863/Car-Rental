import React, { useState, useEffect } from 'react';
import client from '../api/client';

export default function AdminManageContactUsQueryPage() {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const loadQueries = async () => {
    try {
      const res = await client.get('/api/admin/queries');
      setQueries(res.data);
    } catch {
      setError('Failed to load queries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueries();
  }, []);

  const handleMarkRead = async (id) => {
    if (!window.confirm('Do you really want to read')) return;
    setError('');
    setMsg('');
    try {
      await client.patch(`/api/admin/queries/${id}/read`);
      setMsg('Query marked as read');
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to update query status';
      setError(errorMsg);
    } finally {
      await loadQueries();
      if (typeof window !== 'undefined' && window.scrollTo) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="page-title text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">Manage Contact Us Queries</h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Review and mark customer support inquiries as read</p>
      </div>

      {error && <div className="errorWrap"><strong>ERROR</strong>: {error}</div>}
      {msg && <div className="succWrap"><strong>SUCCESS</strong>: {msg}</div>}

      <div className="bento-card overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline dark:border-[#27272A] flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900 dark:text-zinc-100">User queries</span>
          <span className="text-xs text-slate-400 tabular-nums">{queries.length} total</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-slate-500 dark:text-zinc-400">Loading queries...</p>
          ) : (
            <table id="zctb" className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-[#1C1C1F] text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-hairline dark:border-[#27272A]">
                <tr>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Contact No</th>
                  <th className="px-4 py-3 font-semibold">Message</th>
                  <th className="px-4 py-3 font-semibold">Posting date</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline dark:divide-[#27272A]">
                {queries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No queries found
                    </td>
                  </tr>
                ) : (
                  queries.map((q, idx) => (
                    <tr key={q.id} className="hover:bg-slate-50/60 dark:hover:bg-[#1C1C1F]/70">
                      <td className="px-4 py-3 tabular-nums text-slate-500 dark:text-zinc-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-zinc-100">{q.name}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-zinc-300">{q.EmailId}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-zinc-300">{q.ContactNumber}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-zinc-300 max-w-[260px]">{q.Message}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-500 dark:text-zinc-400">
                        {q.PostingDate ? new Date(q.PostingDate).toLocaleString() : ''}
                      </td>
                      <td className="px-4 py-3">
                        {q.status === 1 ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30">
                            Read
                          </span>
                        ) : (
                          <a
                            href="#mark-read"
                            onClick={(e) => {
                              e.preventDefault();
                              handleMarkRead(q.id);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-900/60 font-semibold no-underline"
                          >
                            Pending
                          </a>
                        )}
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
