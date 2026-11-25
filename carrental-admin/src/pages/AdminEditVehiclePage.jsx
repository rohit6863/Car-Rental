import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Car, Fuel, Sparkles, Shield, Image as ImageIcon, Check } from 'lucide-react';
import client, { getVehicleImageUrl } from '../api/client';
import {
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_CATEGORIES,
  MODERN_FEATURES,
  CORE_ACCESSORIES,
  INITIAL_VEHICLE_FORM,
} from '../utils/vehicleOptions';

export default function AdminEditVehiclePage() {
  const { id } = useParams();

  const [brands, setBrands] = useState([]);
  const [formData, setFormData] = useState(INITIAL_VEHICLE_FORM);
  const [images, setImages] = useState({ vimage1: '', vimage2: '', vimage3: '', vimage4: '', vimage5: '' });
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [brandsRes, vehicleRes] = await Promise.all([
          client.get('/api/admin/brands'),
          client.get(`/api/vehicles/${id}`),
        ]);
        setBrands(brandsRes.data);
        const v = vehicleRes.data;
        setFormData({
          vehicletitle: v.VehiclesTitle || '',
          brandname: v.VehiclesBrand || '',
          vehicalorcview: v.VehiclesOverview || '',
          priceperday: v.PricePerDay || '',
          fueltype: v.FuelType || '',
          transmission: v.Transmission || 'Automatic',
          category: v.Category || 'Sedan',
          modelyear: v.ModelYear || '',
          seatingcapacity: v.SeatingCapacity || '',
          airconditioner: v.AirConditioner || 0,
          powerdoorlocks: v.PowerDoorLocks || 0,
          antilockbrakingsys: v.AntiLockBrakingSystem || 0,
          brakeassist: v.BrakeAssist || 0,
          powersteering: v.PowerSteering || 0,
          driverairbag: v.DriverAirbag || 0,
          passengerairbag: v.PassengerAirbag || 0,
          powerwindow: v.PowerWindows || 0,
          cdplayer: v.CDPlayer || 0,
          centrallocking: v.CentralLocking || 0,
          crashcensor: v.CrashSensor || 0,
          leatherseats: v.LeatherSeats || 0,
          sunroof: v.Sunroof || 0,
          applecarplay: v.AppleCarPlay || 0,
          reversecamera: v.ReverseCamera || 0,
          cruisecontrol: v.CruiseControl || 0,
          keylessentry: v.KeylessEntry || 0,
          gpsnavigation: v.GPSNavigation || 0,
          fastcharging: v.FastCharging || 0,
        });
        setImages({
          vimage1: v.Vimage1 || '',
          vimage2: v.Vimage2 || '',
          vimage3: v.Vimage3 || '',
          vimage4: v.Vimage4 || '',
          vimage5: v.Vimage5 || '',
        });
      } catch {
        setError('Failed to load vehicle data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (checked ? 1 : 0) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    setSubmitting(true);

    try {
      await client.put(`/api/admin/vehicles/${id}`, formData);
      setMsg('Data updated successfully');
    } catch (err) {
      if (err.response?.data?.details && Array.isArray(err.response.data.details) && err.response.data.details.length > 0) {
        setError(err.response.data.details.map((d) => d.message).join('. '));
      } else {
        setError(err.response?.data?.error || 'Failed to update vehicle');
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
          <h2 className="page-title text-xl font-bold text-slate-900 tracking-tight">Edit Vehicle</h2>
          <p className="text-xs text-slate-500 mt-0.5">Update vehicle specifications, powertrain, features, and gallery images</p>
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

      {loading ? (
        <div className="bento-card p-6 text-sm text-slate-500">Loading vehicle data...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
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
              <ImageIcon className="w-4 h-4 text-sky-600" />
              <h3 className="text-sm font-bold text-slate-900">Vehicle Images</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5].map((num) => {
                const imgVal = images[`vimage${num}`];
                return (
                  <div key={num} className="p-3 rounded-xl border border-hairline bg-slate-50/50 space-y-2">
                    <div className="text-xs font-semibold text-slate-700">Image {num}</div>
                    {imgVal ? (
                      <img
                        src={getVehicleImageUrl(imgVal)}
                        alt={`Image ${num}`}
                        className="w-full h-36 object-cover rounded-lg border border-hairline"
                      />
                    ) : (
                      <div className="w-full h-36 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
                        No image uploaded
                      </div>
                    )}
                    <Link
                      to={`/change-image/${id}/${num}`}
                      className="inline-block text-xs font-semibold text-lavender-600 hover:underline no-underline"
                    >
                      Change Image {num}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
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
      )}
    </div>
  );
}
