import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Car, Fuel, Sparkles, Shield, ImagePlus, Check } from 'lucide-react';
import client from '../api/client';
import {
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_CATEGORIES,
  MODERN_FEATURES,
  CORE_ACCESSORIES,
  INITIAL_VEHICLE_FORM,
} from '../utils/vehicleOptions';

export default function AdminPostVehiclePage() {
  const navigate = useNavigate();

  const [brands, setBrands] = useState([]);
  const [formData, setFormData] = useState(INITIAL_VEHICLE_FORM);
  const [files, setFiles] = useState({ img1: null, img2: null, img3: null, img4: null, img5: null });
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadBrands() {
      try {
        const res = await client.get('/api/admin/brands');
        setBrands(res.data);
      } catch (err) {
        console.error('Failed to load brands:', err);
      }
    }
    loadBrands();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value,
    }));
  };

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    if (selectedFiles && selectedFiles[0]) {
      setFiles((prev) => ({ ...prev, [name]: selectedFiles[0] }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    if (!files.img1 || !files.img2) {
      setError('Image 1 and Image 2 are required');
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        data.append(key, formData[key]);
      });
      ['img1', 'img2', 'img3', 'img4', 'img5'].forEach((key) => {
        if (files[key]) data.append(key, files[key]);
      });

      await client.post('/api/admin/vehicles', data);
      setMsg('Vehicle posted successfully');
      setTimeout(() => {
        navigate('/manage-vehicles');
      }, 1200);
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

  const renderCheckboxGrid = (items) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((item) => (
        <label
          key={item.id}
          htmlFor={item.id}
          className="flex items-center gap-2.5 p-3 rounded-xl border border-hairline bg-slate-50/70 hover:bg-indigo-50/40 cursor-pointer transition select-none"
        >
          <input
            type="checkbox"
            id={item.id}
            name={item.name}
            checked={formData[item.name] === 1}
            onChange={handleInputChange}
            className="w-4 h-4 rounded text-lavender-600 focus:ring-lavender-600 border-slate-300 cursor-pointer"
          />
          <span className="text-xs font-semibold text-slate-700">{item.label}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="page-title text-xl font-bold text-slate-900 tracking-tight">Post A Vehicle</h2>
          <p className="text-xs text-slate-500 mt-0.5">Onboard a new vehicle with powertrain specs, modern tech, and fleet imagery</p>
        </div>
        <Link
          to="/manage-vehicles"
          className="text-xs font-semibold text-slate-600 hover:text-lavender-600 no-underline"
        >
          &larr; Back to Manage Vehicles
        </Link>
      </div>

      {error && <div className="errorWrap"><strong>ERROR</strong>: {error}</div>}
      {msg && <div className="succWrap"><strong>SUCCESS</strong>: {msg}</div>}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Core Specs */}
        <div className="bento-card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-hairline">
            <Car className="w-4 h-4 text-lavender-600" />
            <h3 className="text-sm font-bold text-slate-900">Core Specifications</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Vehicle Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="vehicletitle"
                value={formData.vehicletitle}
                onChange={handleInputChange}
                placeholder="e.g. Porsche 911 Carrera"
                className="w-full bg-white border border-slate-200 focus:border-lavender-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Select Brand <span className="text-rose-500">*</span>
              </label>
              <select
                name="brandname"
                value={formData.brandname}
                onChange={handleInputChange}
                className="w-full bg-white border border-slate-200 focus:border-lavender-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none"
                required
              >
                <option value="">Select</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.BrandName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Vehicle Overview <span className="text-rose-500">*</span>
            </label>
            <textarea
              name="vehicalorcview"
              rows={3}
              value={formData.vehicalorcview}
              onChange={handleInputChange}
              placeholder="Describe performance, comfort, and key highlights..."
              className="w-full bg-white border border-slate-200 focus:border-lavender-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Price Per Day (INR) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                name="priceperday"
                value={formData.priceperday}
                onChange={handleInputChange}
                placeholder="3500"
                className="w-full bg-white border border-slate-200 focus:border-lavender-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 tabular-nums outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Model Year <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                name="modelyear"
                value={formData.modelyear}
                onChange={handleInputChange}
                placeholder="2024"
                className="w-full bg-white border border-slate-200 focus:border-lavender-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 tabular-nums outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Seating Capacity <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                name="seatingcapacity"
                value={formData.seatingcapacity}
                onChange={handleInputChange}
                placeholder="5"
                className="w-full bg-white border border-slate-200 focus:border-lavender-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 tabular-nums outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* Fuel & Powertrain */}
        <div className="bento-card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-hairline">
            <Fuel className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Fuel & Powertrain</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Select Fuel Type <span className="text-rose-500">*</span>
              </label>
              <select
                name="fueltype"
                value={formData.fueltype}
                onChange={handleInputChange}
                className="w-full bg-white border border-slate-200 focus:border-lavender-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none"
                required
              >
                <option value="">Select</option>
                {FUEL_TYPES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Transmission</label>
              <select
                name="transmission"
                value={formData.transmission}
                onChange={handleInputChange}
                className="w-full bg-white border border-slate-200 focus:border-lavender-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none"
              >
                {TRANSMISSIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Body Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full bg-white border border-slate-200 focus:border-lavender-600 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 outline-none"
              >
                {VEHICLE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Modern Tech & Comfort */}
        <div className="bento-card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-hairline">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">Modern Tech & Comfort Features</h3>
          </div>
          {renderCheckboxGrid(MODERN_FEATURES)}
        </div>

        {/* Safety & Legacy Compatibility */}
        <div className="bento-card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-hairline">
            <Shield className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Safety & Core Equipment</h3>
          </div>
          {renderCheckboxGrid(CORE_ACCESSORIES)}
        </div>

        {/* Vehicle Images */}
        <div className="bento-card p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-hairline">
            <ImagePlus className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">Upload Images</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map((num) => (
              <div key={num} className="p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Image {num} {num <= 2 && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="file"
                  name={`img${num}`}
                  onChange={handleFileChange}
                  accept="image/*"
                  required={num <= 2}
                  className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-lavender-50 file:text-lavender-600 hover:file:bg-lavender-100 cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="reset"
            onClick={() => setFormData(INITIAL_VEHICLE_FORM)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            name="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Check className="w-4 h-4" />
            <span>{submitting ? 'Saving...' : 'Save changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
