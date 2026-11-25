import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import client from '../api/client';

export default function AdminManageVehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const loadVehicles = async () => {
    try {
      const res = await client.get('/api/admin/vehicles');
      setVehicles(res.data);
    } catch {
      setError('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this vehicle?')) return;
    setError('');
    setMsg('');
    try {
      await client.delete(`/api/admin/vehicles/${id}`);
      setMsg('Vehicle and related bookings deleted successfully');
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Deletion failed';
      setError(errorMsg);
    } finally {
      await loadVehicles();
      if (typeof window !== 'undefined' && window.scrollTo) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="page-title text-xl font-bold text-slate-900 tracking-tight">Manage Vehicles</h2>
          <p className="text-xs text-slate-500 mt-0.5">View, edit, or remove vehicles from the active rental fleet</p>
        </div>
        <Link
          to="/post-vehicle"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold transition no-underline self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Vehicle</span>
        </Link>
      </div>

      {error && <div className="errorWrap"><strong>ERROR</strong>: {error}</div>}
      {msg && <div className="succWrap"><strong>SUCCESS</strong>: {msg}</div>}

      <div className="bento-card overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900">All Vehicles</span>
          <span className="text-xs text-slate-400 tabular-nums">{vehicles.length} total</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-slate-500">Loading vehicles...</p>
          ) : (
            <table id="vehicleTable" className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider border-b border-hairline">
                <tr>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 font-semibold">Brand</th>
                  <th className="px-4 py-3 font-semibold">Price/Day</th>
                  <th className="px-4 py-3 font-semibold">Fuel Type</th>
                  <th className="px-4 py-3 font-semibold">Transmission</th>
                  <th className="px-4 py-3 font-semibold">Year</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                      No vehicles found
                    </td>
                  </tr>
                ) : (
                  vehicles.map((v, idx) => (
                    <tr key={v.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 tabular-nums text-slate-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div>{v.VehiclesTitle}</div>
                        {v.Category && (
                          <div className="text-[11px] font-normal text-slate-400">{v.Category}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{v.BrandName}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900 tabular-nums">Rs. {v.PricePerDay}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                          {v.FuelType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{v.Transmission || 'Automatic'}</td>
                      <td className="px-4 py-3 tabular-nums text-slate-600">{v.ModelYear}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`status-label inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            v.vehicle_status === 'Rented'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {v.vehicle_status || 'Available'}
                        </span>
                      </td>
                      <td className="action-links px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Link
                            to={`/edit-vehicle/${v.id}`}
                            className="text-lavender-600 hover:text-lavender-700"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <a
                            href="#delete"
                            className="text-rose-600 hover:text-rose-700"
                            title="Delete"
                            onClick={(e) => {
                              e.preventDefault();
                              handleDelete(v.id);
                            }}
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
