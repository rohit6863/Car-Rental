import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import client from '../api/client';
import { useSearch } from '../context/SearchContext';
import { useToast } from '../context/ToastContext';
import StatusPill from '../components/StatusPill';

const STATUS_SEQUENCE = ['Available', 'Rented', 'Maintenance'];

export default function AdminManageVehiclesPage() {
  const { searchQuery } = useSearch();
  const { showToast } = useToast();
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

  const filteredVehicles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(
      (v) =>
        (v.VehiclesTitle || '').toLowerCase().includes(q) ||
        (v.BrandName || '').toLowerCase().includes(q) ||
        (v.FuelType || '').toLowerCase().includes(q) ||
        (v.RegistrationPlate || '').toLowerCase().includes(q) ||
        (v.HubLocation || '').toLowerCase().includes(q)
    );
  }, [vehicles, searchQuery]);

  const handleCycleStatus = async (v) => {
    const cur = v.vehicle_status || 'Available';
    const nextStatus = STATUS_SEQUENCE[(STATUS_SEQUENCE.indexOf(cur) + 1) % STATUS_SEQUENCE.length];
    try {
      await client.patch(`/api/admin/vehicles/${v.id}/status`, { status: nextStatus });
      showToast(`${v.VehiclesTitle} marked as ${nextStatus}`, 'indigo');
      loadVehicles();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this vehicle?')) return;
    setError('');
    setMsg('');
    try {
      await client.delete(`/api/admin/vehicles/${id}`);
      setMsg('Vehicle and related bookings deleted successfully');
      showToast('Vehicle deleted', 'rose');
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
          <h2 className="page-title text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Manage Vehicles
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            View, edit, cycle availability, or remove vehicles from the active rental fleet
          </p>
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
        <div className="px-5 py-4 border-b border-hairline dark:border-slate-800 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-900 dark:text-white">All Vehicles</span>
          <span className="text-xs text-slate-400 tabular-nums">{filteredVehicles.length} total</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-slate-500 dark:text-slate-400">Loading vehicles...</p>
          ) : (
            <table id="vehicleTable" className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/70 text-slate-500 dark:text-slate-300 uppercase tracking-wider border-b border-hairline dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Vehicle &amp; Plate</th>
                  <th className="px-4 py-3 font-semibold">Brand</th>
                  <th className="px-4 py-3 font-semibold">Hub</th>
                  <th className="px-4 py-3 font-semibold">Price/Day</th>
                  <th className="px-4 py-3 font-semibold">Fuel / Trans</th>
                  <th className="px-4 py-3 font-semibold">Year</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline dark:divide-slate-800">
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                      No vehicles found
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((v, idx) => (
                    <tr key={v.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 tabular-nums text-slate-500 dark:text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">
                        <div>{v.VehiclesTitle}</div>
                        <div className="text-[11px] font-normal text-slate-400 tabular-nums">
                          {v.RegistrationPlate || `MH 12 WW ${String(v.id).padStart(4, '0')}`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{v.BrandName}</td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{v.HubLocation || 'Pune Koregaon Park'}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white tabular-nums">
                        Rs. {v.PricePerDay}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium">
                          {v.FuelType}
                        </span>
                        <span className="ml-1.5 text-[11px] text-slate-400">{v.Transmission || 'Automatic'}</span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-300">{v.ModelYear}</td>
                      <td className="px-4 py-3">
                        <StatusPill status={v.vehicle_status || 'Available'} className="status-label" />
                      </td>
                      <td className="action-links px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Link
                            to={`/edit-vehicle/${v.id}`}
                            className="text-lavender-600 dark:text-indigo-400 hover:text-lavender-700"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleCycleStatus(v)}
                            title="Cycle Status"
                            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 cursor-pointer"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <a
                            href="#delete"
                            className="text-rose-600 dark:text-rose-400 hover:text-rose-700"
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
