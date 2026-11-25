import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import client from '../api/client';

export default function AdminManageBrandsPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const loadBrands = async () => {
    try {
      const res = await client.get('/api/admin/brands');
      setBrands(res.data);
    } catch {
      setError('Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Do you want to delete')) return;
    setError('');
    setMsg('');
    try {
      await client.delete(`/api/admin/brands/${id}`);
      setMsg('Brand deleted successfully');
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to delete brand';
      setError(errorMsg);
    } finally {
      await loadBrands();
      if (typeof window !== 'undefined' && window.scrollTo) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="page-title text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">Manage Brands</h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">All vehicle manufacturers available in the portal</p>
        </div>
        <Link
          to="/create-brand"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lavender-600 hover:bg-lavender-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-zinc-950 text-xs font-semibold transition no-underline self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Brand</span>
        </Link>
      </div>

      {error && <div className="errorWrap"><strong>ERROR</strong>: {error}</div>}
      {msg && <div className="succWrap"><strong>SUCCESS</strong>: {msg}</div>}

      <div className="bento-card overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline dark:border-[#27272A] flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900 dark:text-zinc-100">Listed Brands</span>
          <span className="text-xs text-slate-400 tabular-nums">{brands.length} total</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-slate-500 dark:text-zinc-400">Loading brands...</p>
          ) : (
            <table id="zctb" className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-[#1C1C1F] text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-hairline dark:border-[#27272A]">
                <tr>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Brand Name</th>
                  <th className="px-4 py-3 font-semibold">Creation Date</th>
                  <th className="px-4 py-3 font-semibold">Updation date</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline dark:divide-[#27272A]">
                {brands.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No brands found
                    </td>
                  </tr>
                ) : (
                  brands.map((b, idx) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-[#1C1C1F]/70">
                      <td className="px-4 py-3 tabular-nums text-slate-500 dark:text-zinc-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-zinc-100">{b.BrandName}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-zinc-300 tabular-nums">
                        {b.CreationDate ? new Date(b.CreationDate).toLocaleString() : ''}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-zinc-300 tabular-nums">
                        {b.UpdationDate ? new Date(b.UpdationDate).toLocaleString() : ''}
                      </td>
                      <td className="action-links px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Link to={`/edit-brand/${b.id}`} title="Edit" className="text-lavender-600 dark:text-amber-400 hover:text-lavender-700">
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <a
                            href="#delete"
                            title="Delete"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDelete(b.id);
                            }}
                            className="text-rose-600 dark:text-rose-400 hover:text-rose-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </a>
                        </div>
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
