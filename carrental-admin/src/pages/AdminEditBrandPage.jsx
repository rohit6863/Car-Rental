import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Award, Check } from 'lucide-react';
import client from '../api/client';

export default function AdminEditBrandPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [brand, setBrand] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadBrand() {
      try {
        const res = await client.get('/api/admin/brands');
        const found = res.data.find((b) => String(b.id) === String(id));
        if (found) {
          setBrand(found.BrandName);
        } else {
          setError('Brand not found');
        }
      } catch {
        setError('Failed to fetch brand details');
      } finally {
        setLoading(false);
      }
    }
    loadBrand();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    setSubmitting(true);

    try {
      await client.put(`/api/admin/brands/${id}`, { brand });
      setMsg('Brand updated successfully');
      setTimeout(() => {
        navigate('/manage-brands');
      }, 1200);
    } catch (err) {
      if (err.response?.data?.details && Array.isArray(err.response.data.details) && err.response.data.details.length > 0) {
        setError(err.response.data.details.map((d) => d.message).join('. '));
      } else {
        setError(err.response?.data?.error || 'Failed to update brand');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="page-title text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">Edit Brand</h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Update manufacturer name</p>
        </div>
        <Link to="/manage-brands" className="text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-lavender-600 dark:hover:text-amber-300 no-underline">
          &larr; Manage Brands
        </Link>
      </div>

      {error && <div className="errorWrap"><strong>ERROR</strong>: {error}</div>}
      {msg && <div className="succWrap"><strong>SUCCESS</strong>: {msg}</div>}

      <div className="bento-card p-6">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-hairline dark:border-[#27272A]">
          <Award className="w-4 h-4 text-lavender-600 dark:text-amber-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">Brand Details</h3>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 dark:text-zinc-400">Loading brand data...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="brand" className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
                Brand Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                className="w-full bg-white dark:bg-[#1C1C1F] border border-slate-200 dark:border-[#27272A] focus:border-lavender-600 dark:focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-zinc-100 outline-none"
                name="brand"
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                required
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                className="px-5 py-2.5 rounded-xl bg-lavender-600 hover:bg-lavender-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
                name="submit"
                type="submit"
                disabled={submitting}
              >
                <Check className="w-4 h-4" />
                <span>{submitting ? 'Updating...' : 'Submit'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
