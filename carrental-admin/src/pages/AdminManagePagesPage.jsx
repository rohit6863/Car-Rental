import React, { useState, useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';
import { FileText, Check } from 'lucide-react';
import client from '../api/client';

const PAGE_NAMES = {
  terms: 'Terms and Conditions',
  privacy: 'Privacy And Policy',
  aboutus: 'About US',
  faqs: 'FAQs',
};

export default function AdminManagePagesPage() {
  const [selectedType, setSelectedType] = useState('terms');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const editorContainerRef = useRef(null);
  const quillInstanceRef = useRef(null);

  useEffect(() => {
    if (editorContainerRef.current && !quillInstanceRef.current) {
      quillInstanceRef.current = new Quill(editorContainerRef.current, {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['link', 'clean'],
          ],
        },
      });
    }
  }, []);

  useEffect(() => {
    async function fetchPage() {
      if (!selectedType) return;
      setLoading(true);
      setError('');
      try {
        const res = await client.get('/api/admin/pages');
        const found = res.data.find((p) => p.type === selectedType);
        if (quillInstanceRef.current) {
          quillInstanceRef.current.root.innerHTML = DOMPurify.sanitize(found?.detail || '');
        }
      } catch {
        setError('Failed to load page content');
      } finally {
        setLoading(false);
      }
    }
    fetchPage();
  }, [selectedType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    if (!selectedType) {
      setError('Please select a page');
      return;
    }

    const rawDetail = quillInstanceRef.current ? quillInstanceRef.current.root.innerHTML : '';
    const detail = DOMPurify.sanitize(rawDetail);

    setSubmitting(true);
    try {
      await client.put(`/api/admin/pages/${selectedType}`, { detail });
      setMsg('Page data updated successfully');
    } catch (err) {
      if (err.response?.data?.details && Array.isArray(err.response.data.details) && err.response.data.details.length > 0) {
        setError(err.response.data.details.map((d) => d.message).join('. '));
      } else {
        setError(err.response?.data?.error || 'Failed to update page data');
      }
    } finally {
      setSubmitting(false);
      if (typeof window !== 'undefined' && window.scrollTo) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="page-title text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">Manage Pages</h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Edit Terms, Privacy Policy, About Us, and FAQs content</p>
      </div>

      {error && <div className="errorWrap"><strong>ERROR</strong>: {error}</div>}
      {msg && <div className="succWrap"><strong>SUCCESS</strong>: {msg}</div>}

      <div className="bento-card p-6">
        <div className="flex items-center gap-2 pb-3 mb-4 border-b border-hairline dark:border-[#27272A]">
          <FileText className="w-4 h-4 text-lavender-600 dark:text-amber-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">CMS Page Editor</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <label htmlFor="menu1" className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
                Select Page
              </label>
              <select
                id="menu1"
                name="menu1"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-white dark:bg-[#1C1C1F] border border-slate-200 dark:border-[#27272A] focus:border-lavender-600 dark:focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-zinc-100 outline-none"
              >
                <option value="">***Select One***</option>
                <option value="terms">terms and condition</option>
                <option value="privacy">privacy and policy</option>
                <option value="aboutus">aboutus</option>
                <option value="faqs">FAQs</option>
              </select>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1">Selected Page</div>
              <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1C1C1F] border border-hairline dark:border-[#27272A] text-sm font-bold text-slate-900 dark:text-zinc-100">
                {PAGE_NAMES[selectedType] || 'None'}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">Page Details</label>
            {loading && <p className="text-xs text-slate-400 mb-2">Loading editor...</p>}
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-[#27272A] bg-white dark:bg-[#141416]">
              <div ref={editorContainerRef} style={{ minHeight: '240px' }} />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              name="submit"
              value="Update"
              id="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-lavender-600 hover:bg-lavender-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Check className="w-4 h-4" />
              <span>{submitting ? 'Updating...' : 'Update'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
