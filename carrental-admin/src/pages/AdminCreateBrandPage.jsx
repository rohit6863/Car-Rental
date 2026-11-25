import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Check } from 'lucide-react';
import client from '../api/client';

export default function AdminCreateBrandPage() {
  const [brand, setBrand] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    setSubmitting(true);

    try {
      await client.post('/api/admin/brands', { brand });
      setMsg('Brand Created successfully');
      setBrand('');
    } catch (err) {
      if (err.response?.data?.details && Array.isArray(err.response.data.details) && err.response.data.details.length > 0) {
        setError(err.response.data.details.map((d) => d.message).join('. '));
      } else {
        setError(err.response?.data?.error || 'Something went wrong. Please try again');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="page-title text-xl font-bold text-slate-900 tracking-tight">Create Brand</h2>
          <p className="text-xs text-slate-500 mt-0.5">Add a new vehicle manufacturer to the fleet catalog</p>
        </div>
        <Link to="/manage-brands" className="text-xs font-semibold text-slate-600 hover:text-lavender-600 no-underline">
          &larr; Manage Brands
        </Link>
      </div>

      {error && <div className="errorWrap"><strong>ERROR</strong>: {error}</div>}
      {msg && <div className="succWrap"><strong>SUCCESS</strong>: {msg}</div>}

      <div className="bento-card p-6">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-hairline">
          <Award className="w-4 h-4 text-lavender-600" />
          <h3 className="text-sm font-bold text-slate-900">Brand Details</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="brand" className="block text-xs font-semibold text-slate-600 mb-1.5">
              Brand Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              className="w-full bg-white border border-slate-200 focus:border-lavender-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none"
              name="brand"
              id="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Porsche"
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
              <span>{submitting ? 'Submitting...' : 'Submit'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
