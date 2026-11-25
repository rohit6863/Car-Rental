import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapPin, RefreshCw, Pencil, Radar } from 'lucide-react';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import AdminModal from '../components/AdminModal';
import StatusPill from '../components/StatusPill';

function getHubCoords(hubLocation = '', index = 0) {
  const hub = hubLocation.toLowerCase();
  const jitterX = ((index % 3) - 1) * 7;
  const jitterY = ((Math.floor(index / 3) % 3) - 1) * 6;
  if (hub.includes('hinjewadi')) return { top: `${24 + jitterY}%`, left: `${22 + jitterX}%` };
  if (hub.includes('airport')) return { top: `${26 + jitterY}%`, left: `${76 + jitterX}%` };
  if (hub.includes('baner')) return { top: `${72 + jitterY}%`, left: `${24 + jitterX}%` };
  if (hub.includes('koregaon') || hub.includes('kp')) return { top: `${70 + jitterY}%`, left: `${74 + jitterX}%` };
  const slots = [
    { top: '34%', left: '46%' },
    { top: '54%', left: '60%' },
    { top: '48%', left: '34%' },
    { top: '64%', left: '50%' },
  ];
  return slots[index % slots.length];
}

export default function AdminTelematicsPage() {
  const { showToast } = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadVehicles = useCallback(async (notify = false) => {
    try {
      const res = await client.get('/api/admin/vehicles');
      const list = Array.isArray(res.data) ? res.data : [];
      setVehicles(list);
      if (list.length > 0) {
        setSelectedId((prev) => prev ?? list[0].id);
      }
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

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedId) || vehicles[0] || null,
    [vehicles, selectedId]
  );

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
          <h1 className="page-title text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <Radar className="w-5 h-5 text-indigo-600 dark:text-amber-400" />
            <span>Fleet Telematics &amp; Hub Locations</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Live geo-fence hub radar, odometer, fuel/battery diagnostics, and hub assignments
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadVehicles(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-zinc-950 text-xs font-bold transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Telemetry</span>
        </button>
      </div>

      {/* Live Geo-Fence Radar & Selected Unit Diagnostics */}
      {!loading && vehicles.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 bento-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                Pune Metropolitan Geo-Fence Radar
              </span>
              <div className="flex items-center gap-3 text-[11px] font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Hub Parked
                </span>
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Live Trip
                </span>
              </div>
            </div>

            <div className="relative h-[320px] rounded-xl theme-subtle border telemetry-grid overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 rounded-full border border-indigo-500/15 dark:border-amber-500/20" />
                <div className="w-80 h-80 rounded-full border border-indigo-500/10 dark:border-amber-500/15 absolute" />
              </div>

              <span className="absolute top-3.5 left-3.5 px-2 py-1 rounded theme-surface border text-[10px] font-bold text-slate-500 dark:text-zinc-400">
                Hinjewadi IT Park
              </span>
              <span className="absolute top-3.5 right-3.5 px-2 py-1 rounded theme-surface border text-[10px] font-bold text-slate-500 dark:text-zinc-400">
                Pune Airport Terminal
              </span>
              <span className="absolute bottom-3.5 left-3.5 px-2 py-1 rounded theme-surface border text-[10px] font-bold text-slate-500 dark:text-zinc-400">
                Baner High Street
              </span>
              <span className="absolute bottom-3.5 right-3.5 px-2 py-1 rounded theme-surface border text-[10px] font-bold text-slate-500 dark:text-zinc-400">
                Koregaon Park Lounge
              </span>

              {vehicles.slice(0, 12).map((v, idx) => {
                const coords = getHubCoords(v.HubLocation || '', idx);
                const isSel = selectedVehicle?.id === v.id;
                const status = v.vehicle_status || 'Available';
                const pinColor =
                  status === 'Rented'
                    ? 'text-rose-500'
                    : status === 'Maintenance'
                    ? 'text-amber-500'
                    : 'text-emerald-500';
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedId(v.id)}
                    style={{ top: coords.top, left: coords.left }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none z-10 cursor-pointer"
                  >
                    <div className="relative flex flex-col items-center">
                      <span
                        className={`pin-pulse relative w-3.5 h-3.5 rounded-full bg-current ${pinColor} ring-4 ring-white dark:ring-[#141416] shadow-md`}
                      />
                      <span
                        className={`mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm whitespace-nowrap transition ${
                          isSel
                            ? 'bg-indigo-600 text-white dark:bg-amber-500 dark:text-zinc-950'
                            : 'theme-surface border text-slate-800 dark:text-zinc-100'
                        }`}
                      >
                        {v.VehiclesTitle}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedVehicle && (
            <div className="lg:col-span-4 bento-card p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between pb-3 border-b border-hairline dark:border-[#27272A]">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-amber-400">
                      Unit #{selectedVehicle.id} Diagnostics
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-100 mt-0.5">
                      {selectedVehicle.BrandName ? `${selectedVehicle.BrandName} ` : ''}
                      {selectedVehicle.VehiclesTitle}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                      {selectedVehicle.RegistrationPlate || `MH 12 WW ${String(selectedVehicle.id).padStart(4, '0')}`} &bull;{' '}
                      {selectedVehicle.HubLocation || 'Pune Koregaon Park'}
                    </p>
                  </div>
                  <StatusPill status={selectedVehicle.vehicle_status || 'Available'} />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                  <div className="p-3 rounded-xl theme-subtle border">
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">Odometer</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-zinc-100 tabular-nums mt-0.5 block">
                      {Number(selectedVehicle.OdometerKm ?? 0).toLocaleString('en-IN')} km
                    </span>
                  </div>
                  <div className="p-3 rounded-xl theme-subtle border">
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">Fuel / Charge</span>
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5 block">
                      {selectedVehicle.FuelChargePct ?? 100}%
                    </span>
                  </div>
                  <div className="p-3 rounded-xl theme-subtle border">
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">Powertrain</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-zinc-100 mt-0.5 block">
                      {selectedVehicle.FuelType || 'Petrol'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl theme-subtle border">
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">Geo-Fence</span>
                    <span className="text-sm font-extrabold text-indigo-600 dark:text-amber-400 mt-0.5 block">
                      Inside Zone
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openEditModal(selectedVehicle)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-zinc-950 text-xs font-bold transition cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Update Unit Telemetry</span>
              </button>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="bento-card p-6 text-sm text-slate-500 dark:text-zinc-400">Loading telemetry cards...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <div key={v.id} className="bento-card p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                    {v.BrandName ? `${v.BrandName} ` : ''}{v.VehiclesTitle}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 tabular-nums mt-0.5">
                    {v.RegistrationPlate || `MH 12 WW ${String(v.id).padStart(4, '0')}`}
                  </p>
                </div>
                <StatusPill status={v.vehicle_status || 'Available'} />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div className="p-2.5 rounded-lg theme-subtle border">
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">Odometer</span>
                  <span className="font-bold text-slate-800 dark:text-zinc-100 tabular-nums">
                    {Number(v.OdometerKm ?? 0).toLocaleString('en-IN')} km
                  </span>
                </div>
                <div className="p-2.5 rounded-lg theme-subtle border">
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 block">Fuel / Charge</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {v.FuelChargePct ?? 100}%
                  </span>
                </div>
              </div>

              <div className="pt-2.5 border-t border-hairline dark:border-[#27272A] flex items-center justify-between text-xs text-slate-600 dark:text-zinc-300">
                <span className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-amber-400 shrink-0" />
                  <span className="truncate">{v.HubLocation || 'Pune Koregaon Park'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => openEditModal(v)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-amber-400 hover:underline cursor-pointer shrink-0 ml-2"
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
              <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
                Registration Plate
              </label>
              <input
                type="text"
                value={editing.registrationPlate}
                onChange={(e) => setEditing({ ...editing, registrationPlate: e.target.value })}
                className="w-full bg-white dark:bg-[#1C1C1F] border border-slate-200 dark:border-[#27272A] rounded-xl px-3.5 py-2 text-xs uppercase text-slate-900 dark:text-zinc-100 outline-none focus:border-indigo-500 dark:focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
                Assigned Hub Location *
              </label>
              <input
                type="text"
                value={editing.hubLocation}
                onChange={(e) => setEditing({ ...editing, hubLocation: e.target.value })}
                required
                className="w-full bg-white dark:bg-[#1C1C1F] border border-slate-200 dark:border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-indigo-500 dark:focus:border-amber-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
                  Odometer (km)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editing.odometerKm}
                  onChange={(e) => setEditing({ ...editing, odometerKm: e.target.value })}
                  required
                  className="w-full bg-white dark:bg-[#1C1C1F] border border-slate-200 dark:border-[#27272A] rounded-xl px-3.5 py-2 text-xs tabular-nums text-slate-900 dark:text-zinc-100 outline-none focus:border-indigo-500 dark:focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
                  Fuel / Charge (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editing.fuelChargePct}
                  onChange={(e) => setEditing({ ...editing, fuelChargePct: e.target.value })}
                  required
                  className="w-full bg-white dark:bg-[#1C1C1F] border border-slate-200 dark:border-[#27272A] rounded-xl px-3.5 py-2 text-xs tabular-nums text-slate-900 dark:text-zinc-100 outline-none focus:border-indigo-500 dark:focus:border-amber-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#27272A] text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-[#1C1C1F] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-zinc-950 text-xs font-bold cursor-pointer disabled:opacity-60"
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
