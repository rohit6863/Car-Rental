import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Upload } from 'lucide-react';
import client, { getVehicleImageUrl } from '../api/client';

export default function AdminChangeImagePage({ fixedNum }) {
  const { id: paramId, num: paramNum } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const id = paramId || searchParams.get('imgid');
  const num = fixedNum || paramNum || 1;

  const [currentImage, setCurrentImage] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadVehicle() {
      if (!id) return;
      try {
        const res = await client.get(`/api/vehicles/${id}`);
        const key = `Vimage${num}`;
        setCurrentImage(res.data[key] || '');
      } catch {
        setError('Failed to load vehicle image');
      } finally {
        setLoading(false);
      }
    }
    loadVehicle();
  }, [id, num]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    if (!file) {
      setError('Please choose an image file to upload');
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('img', file);

      const res = await client.put(`/api/admin/vehicles/${id}/image/${num}`, data);

      setMsg('Image updated successfully');
      setCurrentImage(res.data.filename);
      setFile(null);
      setTimeout(() => {
        navigate(`/edit-vehicle/${id}`);
      }, 1200);
    } catch (err) {
      if (err.response?.data?.details && Array.isArray(err.response.data.details) && err.response.data.details.length > 0) {
        setError(err.response.data.details.map((d) => d.message).join('. '));
      } else {
        setError(err.response?.data?.error || 'Failed to update image');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="page-title text-xl font-bold text-slate-900 tracking-tight">Vehicle Image {num}</h2>
        <p className="text-xs text-slate-500 mt-0.5">Replace vehicle gallery image #{num}</p>
      </div>

      {error && <div className="errorWrap"><strong>ERROR</strong>: {error}</div>}
      {msg && <div className="succWrap"><strong>SUCCESS</strong>: {msg}</div>}

      <div className="bento-card p-6">
        {loading ? (
          <p className="text-sm text-slate-500">Loading image...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Current Image {num}</label>
              {currentImage ? (
                <img
                  src={getVehicleImageUrl(currentImage)}
                  alt={`Image ${num}`}
                  className="w-72 h-48 object-cover rounded-xl border border-hairline"
                />
              ) : (
                <div className="w-72 h-48 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
                  No current image
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5" htmlFor="img">
                Upload New Image {num} <span className="text-rose-500">*</span>
              </label>
              <input
                type="file"
                id="img"
                name="img"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
                className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-lavender-50 file:text-lavender-600 hover:file:bg-lavender-100 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-hairline">
              <Link
                to={`/edit-vehicle/${id}`}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 no-underline"
              >
                Back to Vehicle
              </Link>
              <button
                className="px-5 py-2.5 rounded-xl bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
                name="update"
                type="submit"
                disabled={submitting}
              >
                <Upload className="w-4 h-4" />
                <span>{submitting ? 'Updating...' : 'Update'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
