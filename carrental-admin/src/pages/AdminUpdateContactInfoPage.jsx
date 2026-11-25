import React, { useState, useEffect } from 'react';
import { Headphones, Check } from 'lucide-react';
import client from '../api/client';

export default function AdminUpdateContactInfoPage() {
  const [formData, setFormData] = useState({
    address: '',
    email: '',
    contactno: '',
  });
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadContactInfo() {
      try {
        const res = await client.get('/api/admin/contact-info');
        if (res.data) {
          setFormData({
            address: res.data.Address || '',
            email: res.data.EmailId || '',
            contactno: res.data.ContactNo || '',
          });
        }
      } catch {
        setError('Failed to load contact information');
      } finally {
        setLoading(false);
      }
    }
    loadContactInfo();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    setSubmitting(true);

    try {
      await client.put('/api/admin/contact-info', formData);
      setMsg('Info Updated successfully');
    } catch (err) {
      if (err.response?.data?.details && Array.isArray(err.response.data.details) && err.response.data.details.length > 0) {
        setError(err.response.data.details.map((d) => d.message).join('. '));
      } else {
        setError(err.response?.data?.error || 'Failed to update contact info');
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
        <h2 className="page-title text-xl font-bold text-slate-900 tracking-tight">Update Contact Info</h2>
        <p className="text-xs text-slate-500 mt-0.5">Configure public support email, helpline number, and office address</p>
      </div>

      {error && <div className="errorWrap"><strong>ERROR</strong>: {error}</div>}
      {msg && <div className="succWrap"><strong>SUCCESS</strong>: {msg}</div>}

      <div className="bento-card p-6">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-hairline">
          <Headphones className="w-4 h-4 text-lavender-600" />
          <h3 className="text-sm font-bold text-slate-900">Contact & Helpline Details</h3>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading contact information...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="address" className="block text-xs font-semibold text-slate-600 mb-1.5">
                Address
              </label>
              <textarea
                className="w-full bg-white border border-slate-200 focus:border-lavender-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none"
                name="address"
                id="address"
                rows={3}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-600 mb-1.5">
                Email id
              </label>
              <input
                type="email"
                className="w-full bg-white border border-slate-200 focus:border-lavender-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none"
                name="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="contactno" className="block text-xs font-semibold text-slate-600 mb-1.5">
                Contact Number
              </label>
              <input
                type="text"
                className="w-full bg-white border border-slate-200 focus:border-lavender-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none"
                name="contactno"
                id="contactno"
                value={formData.contactno}
                onChange={(e) => setFormData({ ...formData, contactno: e.target.value })}
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
                <span>{submitting ? 'Updating...' : 'Update'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
