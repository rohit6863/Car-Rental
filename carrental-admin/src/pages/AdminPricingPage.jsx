import React, { useState, useEffect } from 'react';
import { Sliders, Check } from 'lucide-react';
import client from '../api/client';
import { useToast } from '../context/ToastContext';

export default function AdminPricingPage() {
  const { showToast } = useToast();
  const [rules, setRules] = useState({
    weekendSurgeEnabled: false,
    weekendSurgePct: 15,
    holidaySurgeEnabled: false,
    holidaySurgePct: 20,
  });
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [simDays, setSimDays] = useState(3);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [pricingRes, vehiclesRes] = await Promise.all([
          client.get('/api/admin/pricing'),
          client.get('/api/admin/vehicles'),
        ]);
        if (pricingRes.data) setRules(pricingRes.data);
        const list = Array.isArray(vehiclesRes.data) ? vehiclesRes.data : [];
        setVehicles(list);
        if (list.length > 0) setSelectedVehicleId(String(list[0].id));
      } catch {
        showToast('Failed to load pricing rules', 'rose');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showToast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await client.put('/api/admin/pricing', {
        weekendSurgeEnabled: Boolean(rules.weekendSurgeEnabled),
        weekendSurgePct: Number(rules.weekendSurgePct),
        holidaySurgeEnabled: Boolean(rules.holidaySurgeEnabled),
        holidaySurgePct: Number(rules.holidaySurgePct),
      });
      setRules(res.data);
      showToast('Dynamic pricing rules saved to database', 'emerald');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save pricing rules', 'rose');
    } finally {
      setSaving(false);
    }
  };

  const selectedVehicle = vehicles.find((v) => String(v.id) === String(selectedVehicleId)) || vehicles[0];
  const basePrice = Number(selectedVehicle?.PricePerDay || 3500);
  const multiplier =
    1 +
    (rules.weekendSurgeEnabled ? Number(rules.weekendSurgePct || 0) / 100 : 0) +
    (rules.holidaySurgeEnabled ? Number(rules.holidaySurgePct || 0) / 100 : 0);
  const simulatedDaily = Math.round(basePrice * multiplier);
  const simulatedTotal = simulatedDaily * simDays;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Dynamic Pricing &amp; Tariff Simulator
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure weekend and peak-holiday surge multipliers and simulate rental totals
        </p>
      </div>

      {loading ? (
        <div className="bento-card p-6 text-sm text-slate-500 dark:text-slate-400">Loading pricing engine...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Rules Config */}
          <div className="lg:col-span-2 bento-card p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-hairline dark:border-slate-800">
              <Sliders className="w-4 h-4 text-lavender-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Surge Multiplier Rules</h3>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800">
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  Weekend Surge Pricing (+{rules.weekendSurgePct}%)
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Applies Friday 6:00 PM through Sunday 11:59 PM
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={rules.weekendSurgePct}
                  onChange={(e) => setRules({ ...rules, weekendSurgePct: Number(e.target.value) })}
                  className="w-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold tabular-nums text-slate-900 dark:text-white outline-none"
                />
                <input
                  type="checkbox"
                  checked={rules.weekendSurgeEnabled}
                  onChange={(e) => setRules({ ...rules, weekendSurgeEnabled: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  aria-label="Enable Weekend Surge"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800">
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  Peak Holiday Multiplier (+{rules.holidaySurgePct}%)
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Triggers when regional fleet utilization exceeds 80%
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={rules.holidaySurgePct}
                  onChange={(e) => setRules({ ...rules, holidaySurgePct: Number(e.target.value) })}
                  className="w-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold tabular-nums text-slate-900 dark:text-white outline-none"
                />
                <input
                  type="checkbox"
                  checked={rules.holidaySurgeEnabled}
                  onChange={(e) => setRules({ ...rules, holidaySurgeEnabled: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600 cursor-pointer"
                  aria-label="Enable Peak Holiday Surge"
                />
              </div>
            </div>
          </div>

          {/* Interactive Tariff Simulator */}
          <div className="bento-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Checkout Rate Preview</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Base Vehicle
              </label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white outline-none"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.VehiclesTitle} (₹{Number(v.PricePerDay).toLocaleString('en-IN')}/day)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                Rental Duration: <span className="tabular-nums font-bold">{simDays} Day{simDays > 1 ? 's' : ''}</span>
              </label>
              <input
                type="range"
                min="1"
                max="14"
                value={simDays}
                onChange={(e) => setSimDays(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span>Simulated Daily Rate</span>
                <span className="font-bold tabular-nums">₹{simulatedDaily.toLocaleString('en-IN')}/day</span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-indigo-100 dark:border-indigo-900">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Dynamic Total</span>
                <span className="text-lg font-extrabold text-lavender-600 dark:text-indigo-300 tabular-nums">
                  ₹{simulatedTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Publish Pricing Rules'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
