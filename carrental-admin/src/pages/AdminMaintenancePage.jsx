import React, { useState, useEffect, useCallback } from 'react';
import { Wrench, Plus, CheckCircle2, Trash2 } from 'lucide-react';
import client from '../api/client';
import { useToast } from '../context/ToastContext';
import AdminModal from '../components/AdminModal';
import StatusPill from '../components/StatusPill';

export default function AdminMaintenancePage() {
  const { showToast } = useToast();
  const [tasks, setTasks] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    vehicleId: '',
    taskTitle: '',
    dueDate: new Date().toISOString().split('T')[0],
    estimatedCost: '0',
    status: 'Scheduled',
  });

  const loadData = useCallback(async () => {
    try {
      const [maintRes, vehRes] = await Promise.all([
        client.get('/api/admin/maintenance'),
        client.get('/api/admin/vehicles'),
      ]);
      setTasks(Array.isArray(maintRes.data) ? maintRes.data : []);
      const vList = Array.isArray(vehRes.data) ? vehRes.data : [];
      setVehicles(vList);
      if (vList.length > 0 && !form.vehicleId) {
        setForm((prev) => ({ ...prev, vehicleId: String(vList[0].id) }));
      }
    } catch {
      setError('Failed to load maintenance schedule');
    } finally {
      setLoading(false);
    }
  }, [form.vehicleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await client.post('/api/admin/maintenance', {
        ...form,
        vehicleId: Number(form.vehicleId),
        estimatedCost: Number(form.estimatedCost || 0),
      });
      setModalOpen(false);
      setForm((prev) => ({ ...prev, taskTitle: '', estimatedCost: '0', status: 'Scheduled' }));
      showToast('Maintenance task scheduled', 'emerald');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to schedule maintenance', 'rose');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkDone = async (task) => {
    try {
      await client.patch(`/api/admin/maintenance/${task.id}`, { status: 'Completed' });
      showToast(`Service SRV-${task.id} marked completed`, 'emerald');
      loadData();
    } catch {
      showToast('Failed to update task', 'rose');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this maintenance log?')) return;
    try {
      await client.delete(`/api/admin/maintenance/${id}`);
      showToast('Maintenance record deleted', 'rose');
      loadData();
    } catch {
      showToast('Failed to delete record', 'rose');
    }
  };

  const pendingCount = tasks.filter((t) => t.Status !== 'Completed').length;
  const completedCount = tasks.filter((t) => t.Status === 'Completed').length;
  const totalEstCost = tasks.reduce((sum, t) => sum + Number(t.EstimatedCost || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
            Maintenance &amp; Service Schedule
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Preventive inspection, sanitization, and insurance renewal logs
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lavender-600 hover:bg-lavender-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-zinc-950 text-xs font-semibold transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Service</span>
        </button>
      </div>

      {error && <div className="errorWrap">{error}</div>}

      {/* Summary Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bento-card p-4">
          <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Open Service Tasks</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100 tabular-nums mt-1">
            {pendingCount}
          </div>
          <StatusPill status="Pending" className="mt-2" />
        </div>
        <div className="bento-card p-4">
          <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Completed Inspections</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100 tabular-nums mt-1">
            {completedCount}
          </div>
          <StatusPill status="Completed" className="mt-2" />
        </div>
        <div className="bento-card p-4">
          <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Scheduled Cost Budget</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100 tabular-nums mt-1">
            ₹{totalEstCost.toLocaleString('en-IN')}
          </div>
          <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-lavender-600 dark:text-amber-400">
            <Wrench className="w-3 h-3" /> All Hubs
          </span>
        </div>
      </div>

      <div className="bento-card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <p className="p-6 text-sm text-slate-500 dark:text-zinc-400">Loading maintenance records...</p>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/80 dark:bg-[#1C1C1F] text-slate-500 dark:text-zinc-300 uppercase tracking-wider border-b border-hairline dark:border-[#27272A]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Service ID</th>
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 font-semibold">Inspection / Task</th>
                  <th className="px-4 py-3 font-semibold">Due Date</th>
                  <th className="px-4 py-3 font-semibold">Est. Cost</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline dark:divide-[#27272A]">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No service logs recorded yet
                    </td>
                  </tr>
                ) : (
                  tasks.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-[#1C1C1F]/70">
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-zinc-100 tabular-nums">
                        SRV-{String(m.id).padStart(3, '0')}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-lavender-600 dark:text-amber-400">
                          {m.BrandName ? `${m.BrandName} ` : ''}{m.VehiclesTitle}
                        </div>
                        <div className="text-[11px] text-slate-400 tabular-nums">
                          {m.RegistrationPlate || ''}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700 dark:text-zinc-200">{m.TaskTitle}</td>
                      <td className="px-4 py-3.5 tabular-nums text-slate-500 dark:text-zinc-400">
                        {m.DueDate ? new Date(m.DueDate).toLocaleDateString('en-GB') : '-'}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-zinc-100 tabular-nums">
                        ₹{Number(m.EstimatedCost || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusPill status={m.Status} />
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {m.Status !== 'Completed' ? (
                            <button
                              type="button"
                              onClick={() => handleMarkDone(m)}
                              className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Mark Done
                            </button>
                          ) : (
                            <span className="text-slate-400 font-medium">Verified</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(m.id)}
                            aria-label="Delete service record"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      <AdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Schedule Maintenance Task"
        subtitle="Preventive Care"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
              Select Vehicle *
            </label>
            <select
              value={form.vehicleId}
              onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
              required
              className="w-full bg-white dark:bg-[#1C1C1F] border border-slate-200 dark:border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-lavender-600 dark:focus:border-amber-500"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.BrandName ? `${v.BrandName} ` : ''}{v.VehiclesTitle} ({v.RegistrationPlate || `#${v.id}`})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
              Inspection / Task Description *
            </label>
            <input
              type="text"
              value={form.taskTitle}
              onChange={(e) => setForm({ ...form, taskTitle: e.target.value })}
              placeholder="e.g. Brake Pad & Synthetic Oil Service"
              required
              className="w-full bg-white dark:bg-[#1C1C1F] border border-slate-200 dark:border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-lavender-600 dark:focus:border-amber-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
                Due Date *
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                required
                className="w-full bg-white dark:bg-[#1C1C1F] border border-slate-200 dark:border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-lavender-600 dark:focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
                Est. Cost (INR)
              </label>
              <input
                type="number"
                min="0"
                value={form.estimatedCost}
                onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })}
                className="w-full bg-white dark:bg-[#1C1C1F] border border-slate-200 dark:border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-zinc-100 tabular-nums outline-none focus:border-lavender-600 dark:focus:border-amber-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#27272A] text-xs font-semibold text-slate-700 dark:text-zinc-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-lavender-600 hover:bg-lavender-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-zinc-950 text-xs font-semibold cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Schedule Task'}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
