import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, RefreshCw, Pencil } from 'lucide-react';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import AdminModal from '../components/AdminModal';
import StatusPill from '../components/StatusPill';

export default function AdminTelematicsPage() {
  const { showToast } = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadVehicles = useCallback(async (notify = false) => {
    try {
      const res = await client.get('/api/admin/vehicles');
      const list = Array.isArray(res.data) ? res.data : [];
      setVehicles(list);
      if (notify) {
        showToast(`Telemetry synced for ${list.length} fleet units`, 'emerald');
      }
    } catch {
      showToast('Failed to load telematics', 'rose');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadVehicles(false);
  }, [loadVehicles]);

  const openEditModal = (v) => {
    setEditing({
      id: v.id,
      title: v.VehiclesTitle,
      registrationPlate: v.RegistrationPlate || `MH 12 WW ${String(v.id).padStart(4, '0')}`,
      hubLocation: v.HubLocation || 'Pune Koregaon Park',
      odometerKm: String(v.OdometerKm ?? 0),
      fuelChargePct: String(v.FuelChargePct ?? 100),
    });
  };

  const handleSaveTelematics = async (e) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await client.patch(`/api/admin/vehicles/${editing.id}/telematics`, {
        registrationPlate: editing.registrationPlate,
        hubLocation: editing.hubLocation,
        odometerKm: Number(editing.odometerKm || 0),
        fuelChargePct: Number(editing.fuelChargePct || 100),
      });
      setEditing(null);
      showToast(`Telematics updated for ${editing.title}`, 'emerald');
      loadVehicles(false);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update telematics', 'rose');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Fleet Telematics &amp; Hub Locations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Odometer, fuel/battery diagnostics, and hub assignments across fleet units
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadVehicles(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Telemetry</span>
        </button>
      </div>

      {loading ? (
        <div className="bento-card p-6 text-sm text-slate-500 dark:text-slate-400">Loading telemetry cards...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <div key={v.id} className="bento-card p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {v.BrandName ? `${v.BrandName} ` : ''}{v.VehiclesTitle}
                  </h3>
                  <p className="text-xs text-slate-400 tabular-nums mt-0.5">
                    {v.RegistrationPlate || `MH 12 WW ${String(v.id).padStart(4, '0')}`}
                  </p>
                </div>
                <StatusPill status={v.vehicle_status || 'Available'} />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Odometer</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                    {Number(v.OdometerKm ?? 0).toLocaleString('en-IN')} km
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Fuel / Charge</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {v.FuelChargePct ?? 100}%
                  </span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-hairline dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-lavender-600 dark:text-indigo-400 shrink-0" />
                  <span className="truncate">{v.HubLocation || 'Pune Koregaon Park'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => openEditModal(v)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-lavender-600 dark:text-indigo-400 hover:underline cursor-pointer shrink-0 ml-2"
                >
                  <Pencil className="w-3 h-3" /> Update
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminModal
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing ? `Update Telemetry: ${editing.title}` : 'Update Telemetry'}
        subtitle="Hub & Diagnostics"
        maxWidth="max-w-md"
      >
        {editing && (
          <form onSubmit={handleSaveTelematics} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Registration Plate
              </label>
              <input
                type="text"
                value={editing.registrationPlate}
                onChange={(e) => setEditing({ ...editing, registrationPlate: e.target.value })}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs uppercase text-slate-900 dark:text-white outline-none focus:border-lavender-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Assigned Hub Location *
              </label>
              <input
                type="text"
                value={editing.hubLocation}
                onChange={(e) => setEditing({ ...editing, hubLocation: e.target.value })}
                required
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-lavender-600"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Odometer (km)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editing.odometerKm}
                  onChange={(e) => setEditing({ ...editing, odometerKm: e.target.value })}
                  required
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs tabular-nums text-slate-900 dark:text-white outline-none focus:border-lavender-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Fuel / Charge (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editing.fuelChargePct}
                  onChange={(e) => setEditing({ ...editing, fuelChargePct: e.target.value })}
                  required
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs tabular-nums text-slate-900 dark:text-white outline-none focus:border-lavender-600"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Telemetry'}
              </button>
            </div>
          </form>
        )}
      </AdminModal>
    </div>
  );
}
