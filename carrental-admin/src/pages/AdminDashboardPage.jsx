import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Users,
  Car,
  CalendarCheck,
  Award,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  MapPin,
  Calendar,
  MoreHorizontal,
} from 'lucide-react';
import client from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useSearch } from '../context/SearchContext';
import AdminModal from '../components/AdminModal';
import StatusPill from '../components/StatusPill';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const STATUS_SEQUENCE = ['Available', 'Rented', 'Maintenance'];

const NOTE_BADGE_MAP = {
  Maintenance: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  KYC: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
  'Fleet Ops': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
};

export default function AdminDashboardPage() {
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const { searchQuery, setSearchQuery } = useSearch();

  const [stats, setStats] = useState({
    regUsers: 0,
    listedVehicles: 0,
    totalBookings: 0,
    listedBrands: 0,
    subscribers: 0,
    queries: 0,
  });
  const [analytics, setAnalytics] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [chartPeriod, setChartPeriod] = useState('year');
  const [tableEntries, setTableEntries] = useState(10);

  // Add Note modal state
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteForm, setNoteForm] = useState({ title: '', description: '', category: 'Fleet Ops' });
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  const loadAll = useCallback(async (period = chartPeriod) => {
    try {
      const [statsRes, analyticsRes, vehiclesRes, notesRes] = await Promise.all([
        client.get('/api/admin/stats'),
        client.get(`/api/admin/analytics?period=${period}`).catch(() => ({ data: null })),
        client.get('/api/admin/vehicles').catch(() => ({ data: [] })),
        client.get('/api/admin/notes').catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      setAnalytics(analyticsRes.data);
      setVehicles(Array.isArray(vehiclesRes.data) ? vehiclesRes.data : []);
      setNotes(Array.isArray(notesRes.data) ? notesRes.data : []);
    } catch {
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  }, [chartPeriod]);

  useEffect(() => {
    loadAll(chartPeriod);
  }, [chartPeriod, loadAll]);

  const handleCycleStatus = async (vehicle) => {
    const cur = vehicle.vehicle_status || 'Available';
    const nextStatus = STATUS_SEQUENCE[(STATUS_SEQUENCE.indexOf(cur) + 1) % STATUS_SEQUENCE.length];
    try {
      await client.patch(`/api/admin/vehicles/${vehicle.id}/status`, { status: nextStatus });
      showToast(`${vehicle.VehiclesTitle} marked as ${nextStatus}`, 'indigo');
      loadAll(chartPeriod);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update status', 'rose');
    }
  };

  const handleDeleteVehicle = async (vehicle) => {
    if (!window.confirm(`Permanently delete ${vehicle.VehiclesTitle}?`)) return;
    try {
      await client.delete(`/api/admin/vehicles/${vehicle.id}`);
      showToast(`${vehicle.VehiclesTitle} removed from fleet`, 'rose');
      loadAll(chartPeriod);
    } catch (err) {
      showToast(err.response?.data?.error || 'Deletion failed', 'rose');
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteForm.title.trim()) return;
    setNoteSubmitting(true);
    try {
      await client.post('/api/admin/notes', noteForm);
      setNoteForm({ title: '', description: '', category: 'Fleet Ops' });
      setNoteModalOpen(false);
      showToast('Operations task added', 'indigo');
      loadAll(chartPeriod);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add note', 'rose');
    } finally {
      setNoteSubmitting(false);
    }
  };

  const handleToggleNote = async (note) => {
    try {
      await client.patch(`/api/admin/notes/${note.id}`, { isDone: !note.isDone });
      loadAll(chartPeriod);
    } catch {
      showToast('Failed to update note', 'rose');
    }
  };

  const handleDeleteNote = async (id) => {
    try {
      await client.delete(`/api/admin/notes/${id}`);
      showToast('Note removed', 'rose');
      loadAll(chartPeriod);
    } catch {
      showToast('Failed to delete note', 'rose');
    }
  };

  const kpis = analytics?.kpis || {
    totalRevenue: 0,
    avgBookingValue: 0,
    totalTrips: 0,
    confirmedTrips: 0,
    utilizationPct: 0,
    rentedVehicles: 0,
    availableVehicles: vehicles.length,
    maintenanceVehicles: 0,
    totalVehicles: vehicles.length,
  };

  const health = analytics?.bookingHealth || {
    approvalRate: 100,
    confirmedCount: 0,
    pendingCount: 0,
    cancelledCount: 0,
    totalTrips: 0,
  };

  const readiness = analytics?.readiness || {
    readinessPct: 100,
    completedTasks: 0,
    totalTasks: 0,
    openTasks: 0,
  };

  const topVehicles = analytics?.topVehicles || [];
  const upcomingHandovers = analytics?.upcomingHandovers || [];
  const funnel = analytics?.funnel || {
    registeredDrivers: stats.regUsers,
    kycVerified: 0,
    totalBookings: stats.totalBookings,
    confirmedBookings: 0,
    paidBookings: 0,
    conversionPct: 0,
  };
  const monthlySeries = analytics?.monthlySeries || [];

  const filteredVehicles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(
      (v) =>
        (v.VehiclesTitle || '').toLowerCase().includes(q) ||
        (v.BrandName || '').toLowerCase().includes(q) ||
        (v.FuelType || '').toLowerCase().includes(q) ||
        (v.RegistrationPlate || '').toLowerCase().includes(q) ||
        (v.HubLocation || '').toLowerCase().includes(q) ||
        (v.vehicle_status || 'Available').toLowerCase().includes(q)
    );
  }, [vehicles, searchQuery]);

  const cardBorder = isDark ? '#141416' : '#FFFFFF';
  const axisTickColor = isDark ? '#A1A1AA' : '#64748B';
  const gridLineColor = isDark ? '#27272A' : '#F1F5F9';
  const tooltipStyle = useMemo(
    () => ({
      backgroundColor: isDark ? '#1C1C1F' : '#0F172A',
      titleColor: '#F4F4F5',
      bodyColor: '#F4F4F5',
      borderColor: isDark ? '#323236' : 'transparent',
      borderWidth: isDark ? 1 : 0,
    }),
    [isDark]
  );

  const utilizationChartData = useMemo(() => {
    const rented = kpis.rentedVehicles || 0;
    const idleOrMaint = Math.max(0, (kpis.totalVehicles || 0) - rented);
    const hasData = rented + idleOrMaint > 0;
    return {
      labels: ['Rented', 'Available / Idle'],
      datasets: [
        {
          data: hasData ? [rented, idleOrMaint] : [0, 1],
          backgroundColor: isDark ? ['#F59E0B', '#F43F5E'] : ['#2DD4BF', '#FB7185'],
          borderWidth: 2,
          borderColor: cardBorder,
        },
      ],
    };
  }, [kpis.rentedVehicles, kpis.totalVehicles, cardBorder, isDark]);

  const bookingGaugeData = useMemo(() => {
    const c = health.confirmedCount || 0;
    const p = health.pendingCount || 0;
    const x = health.cancelledCount || 0;
    const hasData = c + p + x > 0;
    return {
      labels: ['Confirmed', 'Pending', 'Cancelled'],
      datasets: [
        {
          data: hasData ? [c, p, x] : [1, 0, 0],
          backgroundColor: isDark ? ['#F59E0B', '#3F3F46', '#F43F5E'] : ['#4F46E5', '#F59E0B', '#F43F5E'],
          borderWidth: 2,
          borderColor: cardBorder,
        },
      ],
    };
  }, [health.confirmedCount, health.pendingCount, health.cancelledCount, cardBorder, isDark]);

  const monthlyBarData = useMemo(
    () => ({
      labels: monthlySeries.map((m) => m.label),
      datasets: [
        {
          label: 'Booking Volume (INR)',
          data: monthlySeries.map((m) => m.revenue),
          backgroundColor: isDark ? '#F59E0B' : '#2DD4BF',
          borderRadius: 5,
          barPercentage: 0.65,
        },
        {
          label: 'Settled Payments (INR)',
          data: monthlySeries.map((m) => m.settled),
          backgroundColor: isDark ? '#F43F5E' : '#4F46E5',
          borderRadius: 5,
          barPercentage: 0.65,
        },
      ],
    }),
    [monthlySeries, isDark]
  );

  const coreStatCards = [
    { title: 'REG USERS', value: stats.regUsers, to: '/reg-users', icon: Users, pill: 'bg-indigo-50 text-indigo-600 dark:bg-amber-500/15 dark:text-amber-400' },
    { title: 'LISTED VEHICLES', value: stats.listedVehicles, to: '/manage-vehicles', icon: Car, pill: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' },
    { title: 'TOTAL BOOKINGS', value: stats.totalBookings, to: '/manage-bookings', icon: CalendarCheck, pill: 'bg-sky-50 text-sky-600 dark:bg-amber-500/15 dark:text-amber-300' },
    { title: 'LISTED BRANDS', value: stats.listedBrands, to: '/manage-brands', icon: Award, pill: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' },
    { title: 'SUBSCRIBERS', value: stats.subscribers, to: '/manage-subscribers', icon: Mail, pill: 'bg-violet-50 text-violet-600 dark:bg-rose-500/15 dark:text-rose-300' },
    { title: 'QUERIES', value: stats.queries, to: '/manage-contactusquery', icon: MessageSquare, pill: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300' },
  ];

  const totalHealthDenominator = Math.max(1, health.totalTrips);

  return (
    <div className="space-y-5">
      {/* Page Title & Breadcrumb Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title text-[20px] font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
            Fleet Performance &amp; Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Live overview of revenue, fleet utilization, bookings, and operations
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/post-vehicle"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-lavender-600 hover:bg-lavender-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-zinc-950 text-xs font-semibold transition no-underline"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post Vehicle</span>
          </Link>
        </div>
      </div>

      {error && <div className="errorWrap">{error}</div>}

      {/* Core Portal Metric Strip (preserves all 6 E2E stat titles) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {coreStatCards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.title}
              to={c.to}
              className="bento-card p-3.5 hover:border-lavender-600/40 dark:hover:border-amber-500/50 transition no-underline block"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="stat-panel-title text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  {c.title}
                </span>
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.pill}`}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="stat-panel-number text-xl font-extrabold text-slate-900 dark:text-zinc-100 tabular-nums mt-2">
                {loading ? '...' : c.value}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Top 4-Column Bento KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {/* Card 1: Total Rental Revenue */}
        <div className="bento-card pt-5 px-5 pb-0 flex flex-col justify-between overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-[13px] font-semibold text-slate-800 dark:text-zinc-100">Total Rental Revenue</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Confirmed rental volume</p>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              Live DB
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100 tabular-nums mt-3 mb-2">
            ₹{Number(kpis.totalRevenue || 0).toLocaleString('en-IN')}
          </div>
          <div className="-mx-5 mt-1">
            <svg className="w-full h-14 block" viewBox="0 0 260 56" preserveAspectRatio="none">
              <defs>
                <linearGradient id="coralGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E07A5F" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#E07A5F" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0,48 C35,48 52,32 82,36 C112,40 132,50 162,40 C192,30 225,18 260,24 L260,56 L0,56 Z" fill="url(#coralGrad)" />
              <path d="M0,48 C35,48 52,32 82,36 C112,40 132,50 162,40 C192,30 225,18 260,24" fill="none" stroke="#E07A5F" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 2: Average Booking Value */}
        <div className="bento-card pt-5 px-5 pb-0 flex flex-col justify-between overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-[13px] font-semibold text-slate-800 dark:text-zinc-100">Average Booking Value</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Mean revenue per confirmed trip</p>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 tabular-nums">
              {kpis.confirmedTrips} Confirmed
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100 tabular-nums mt-3 mb-2">
            ₹{Number(kpis.avgBookingValue || 0).toLocaleString('en-IN')}
          </div>
          <div className="-mx-5 mt-1">
            <svg className="w-full h-14 block" viewBox="0 0 260 56" preserveAspectRatio="none">
              <defs>
                <linearGradient id="indigoSparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818CF8" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#818CF8" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0,26 C35,28 60,46 95,42 C130,38 155,20 190,26 C220,32 242,40 260,34 L260,56 L0,56 Z" fill="url(#indigoSparkGrad)" />
              <path d="M0,26 C35,28 60,46 95,42 C130,38 155,20 190,26 C220,32 242,40 260,34" fill="none" stroke="#818CF8" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 3: Active & Closed Trips */}
        <div className="bento-card pt-5 px-5 pb-0 flex flex-col justify-between overflow-hidden">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-[13px] font-semibold text-slate-800 dark:text-zinc-100">Active &amp; Closed Trips</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Total reservations processed</p>
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-zinc-100 tabular-nums mt-3 mb-2">
            {kpis.totalTrips} Trips
          </div>
          <div className="-mx-5 mt-1">
            <svg className="w-full h-14 block" viewBox="0 0 260 56" preserveAspectRatio="none">
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path d="M0,32 C35,34 65,48 105,40 C145,32 165,18 205,28 C230,34 246,42 260,38 L260,56 L0,56 Z" fill="url(#blueGrad)" />
              <path d="M0,32 C35,34 65,48 105,40 C145,32 165,18 205,28 C230,34 246,42 260,38" fill="none" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 4: Fleet Utilization Rate */}
        <div className="bento-card p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-[13px] font-semibold text-slate-800 dark:text-zinc-100">Fleet Utilization Rate</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Active rented vs idle units</p>
          </div>
          <div className="h-24 w-full flex items-center justify-center my-1">
            <Doughnut
              data={utilizationChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '66%',
                plugins: { legend: { display: false }, tooltip: tooltipStyle },
              }}
            />
          </div>
          <div className="flex items-center justify-center gap-4 text-[11px] font-semibold text-slate-600 dark:text-zinc-300 pt-1 tabular-nums">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400 dark:bg-amber-500" /> Rented - {kpis.utilizationPct}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400 dark:bg-rose-500" /> Idle - {Math.max(0, 100 - kpis.utilizationPct)}%
            </span>
          </div>
        </div>
      </div>

      {/* Middle 3-Column Bento Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left (4 cols): Booking Health Gauge */}
        <div className="lg:col-span-4 bento-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-bold text-slate-900 dark:text-zinc-100">Booking Approval Rate</h3>
            <Link to="/manage-bookings" className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-100">
              <MoreHorizontal className="w-4 h-4" />
            </Link>
          </div>

          <div className="relative h-36 w-full flex items-center justify-center my-2">
            <Doughnut
              data={bookingGaugeData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                rotation: -90,
                circumference: 180,
                cutout: '68%',
                plugins: { legend: { display: false }, tooltip: tooltipStyle },
              }}
            />
            <div className="absolute bottom-3 text-center">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Confirmed</div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-zinc-100 tabular-nums">
                {health.approvalRate}%
              </div>
            </div>
          </div>

          <div className="border border-hairline dark:border-[#27272A] rounded-xl overflow-hidden text-xs mt-2">
            <div className="grid grid-cols-3 bg-slate-50/80 dark:bg-[#1C1C1F] px-3.5 py-2 font-semibold text-slate-500 dark:text-zinc-400 border-b border-hairline dark:border-[#27272A]">
              <span>Status</span>
              <span className="text-center">Share</span>
              <span className="text-right">Count</span>
            </div>
            <div className="divide-y divide-hairline dark:divide-[#27272A]">
              {[
                { label: 'Confirmed', count: health.confirmedCount },
                { label: 'Pending', count: health.pendingCount },
                { label: 'Cancelled', count: health.cancelledCount },
              ].map((row) => (
                <div key={row.label} className="grid grid-cols-3 px-3.5 py-2 text-slate-700 dark:text-zinc-300">
                  <span>{row.label}</span>
                  <span className="text-center tabular-nums">
                    {((row.count / totalHealthDenominator) * 100).toFixed(1)}%
                  </span>
                  <span className="text-right font-semibold tabular-nums">{row.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center (5 cols): Readiness & Top Performing Cars */}
        <div className="lg:col-span-5 bento-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold text-slate-900 dark:text-zinc-100">Fleet Readiness &amp; Top Vehicles</h3>
              <Link to="/manage-vehicles" className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-100">
                <MoreHorizontal className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-5">
              <div className="border border-hairline dark:border-[#27272A] rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">Overall Readiness</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-amber-500/15 text-indigo-600 dark:text-amber-400 tabular-nums">
                    {readiness.readinessPct}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-[#1C1C1F] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all"
                    style={{ width: `${readiness.readinessPct}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  {kpis.maintenanceVehicles} unit(s) currently in maintenance
                </p>
              </div>

              <div className="border border-hairline dark:border-[#27272A] rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">Scheduled Services</span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 tabular-nums">
                    {readiness.completedTasks}/{readiness.totalTasks}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 dark:bg-[#1C1C1F] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-400 rounded-full transition-all"
                    style={{
                      width: `${
                        readiness.totalTasks > 0
                          ? Math.round((readiness.completedTasks / readiness.totalTasks) * 100)
                          : 100
                      }%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  {readiness.openTasks} open service task(s)
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-100">Top Performing Vehicles</span>
              <Link to="/manage-vehicles" className="text-[11px] font-semibold text-lavender-600 dark:text-amber-400 hover:underline no-underline">
                View All
              </Link>
            </div>

            <div className="space-y-2.5">
              {topVehicles.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No vehicles found</p>
              ) : (
                topVehicles.map((car) => {
                  const initials = `${(car.brand || car.title || 'W').slice(0, 1)}${(car.title || 'W').slice(0, 1)}`.toUpperCase();
                  return (
                    <div
                      key={car.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 dark:bg-[#1C1C1F] border border-slate-100 dark:border-[#27272A]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-50 dark:bg-amber-500/15 text-indigo-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                            {car.brand ? `${car.brand} ` : ''}{car.title}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {car.fuelType} &bull; {car.trips} trip(s)
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-bold text-slate-700 dark:text-zinc-200 tabular-nums">
                          ₹{Number(car.revenue || 0).toLocaleString('en-IN')}
                        </div>
                        <StatusPill status={car.status} className="mt-0.5 text-[10px]" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right (3 cols): Upcoming Handovers + Drivers Sparkline */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {upcomingHandovers.length === 0 ? (
            <div className="bento-card p-4 text-xs text-slate-400 text-center">
              No upcoming handovers scheduled
            </div>
          ) : (
            upcomingHandovers.map((h) => (
              <div key={h.bookingId} className="bento-card p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">
                      {h.vehicle}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Driver: {h.customer}
                    </p>
                  </div>
                  <StatusPill status={h.status} />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-hairline dark:border-[#27272A] text-[11px] text-slate-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-lavender-600 dark:text-amber-400 shrink-0" />
                    <span className="truncate">{h.hub}</span>
                  </span>
                  <span className="tabular-nums shrink-0">{h.fromDate}</span>
                </div>
              </div>
            ))
          )}

          {/* Customer Acquisition Card */}
          <div className="bento-card pt-4 px-4 pb-0 flex flex-col justify-between overflow-hidden flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-100">Registered Drivers</h4>
                <p className="text-[10px] text-slate-400">KYC verified vs total drivers</p>
              </div>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 tabular-nums">
                {analytics?.customers?.verifiedUsers || 0} Verified
              </span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-zinc-100 tabular-nums mt-2">
              {stats.regUsers} Drivers
            </div>
            <div className="-mx-4 mt-1">
              <svg className="w-full h-12 block" viewBox="0 0 220 48" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#14B8A6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d="M0,42 C45,38 75,24 115,22 C155,20 185,12 220,10 L220,48 L0,48 Z" fill="url(#tealGrad)" />
                <path d="M0,42 C45,38 75,24 115,22 C155,20 185,12 220,10" fill="none" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Fleet Inventory Table */}
      <div className="bento-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900 dark:text-zinc-100">Fleet Inventory &amp; Live Status</h2>
            <p className="text-xs text-slate-400">
              Plates, hubs, daily tariffs, and one-click operational status cycling
            </p>
          </div>
          <Link
            to="/post-vehicle"
            className="px-3.5 py-2 rounded-lg bg-lavender-600 hover:bg-lavender-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-zinc-950 text-xs font-semibold transition inline-flex items-center gap-1.5 no-underline self-start"
          >
            <Plus className="w-3.5 h-3.5" /> Post Vehicle
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 text-xs text-slate-600 dark:text-zinc-300">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={tableEntries}
              onChange={(e) => setTableEntries(Number(e.target.value))}
              className="bg-white dark:bg-[#1C1C1F] border border-slate-200 dark:border-[#27272A] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-zinc-100 outline-none"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
            <span>entries</span>
          </div>
          <div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vehicle, brand, plate..."
              className="w-full sm:w-60 bg-white dark:bg-[#1C1C1F] border border-slate-200 dark:border-[#27272A] focus:border-lavender-600 dark:focus:border-amber-500 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-zinc-100 placeholder-slate-400 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 dark:bg-[#1C1C1F] border-y border-hairline dark:border-[#27272A] text-[11px] font-bold text-slate-600 dark:text-zinc-300">
                <th className="py-3 px-3.5">Vehicle &amp; Plate</th>
                <th className="py-3 px-3.5">Brand &amp; Fuel</th>
                <th className="py-3 px-3.5">Hub Location</th>
                <th className="py-3 px-3.5">Daily Rate</th>
                <th className="py-3 px-3.5">Fleet Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline dark:divide-[#27272A] text-xs">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No matching vehicles found
                  </td>
                </tr>
              ) : (
                filteredVehicles.slice(0, tableEntries).map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70 dark:hover:bg-[#1C1C1F]/70 transition">
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900 dark:text-zinc-100">{v.VehiclesTitle}</div>
                      <div className="text-[11px] text-slate-400 tabular-nums">
                        {v.RegistrationPlate || `MH 12 WW ${String(v.id).padStart(4, '0')}`}
                      </div>
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="font-semibold text-slate-700 dark:text-zinc-200">{v.BrandName}</span>
                      <span className="ml-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1C1C1F] text-slate-600 dark:text-zinc-300 text-[11px] font-medium">
                        {v.FuelType}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 dark:text-zinc-300">
                      {v.HubLocation || 'Pune Koregaon Park'}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-zinc-100 tabular-nums">
                      ₹{Number(v.PricePerDay || 0).toLocaleString('en-IN')}
                      <span className="text-slate-400 font-normal">/day</span>
                    </td>
                    <td className="py-3 px-3.5">
                      <StatusPill status={v.vehicle_status || 'Available'} />
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          to={`/edit-vehicle/${v.id}`}
                          title="Edit Vehicle"
                          className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleCycleStatus(v)}
                          title="Cycle Availability"
                          className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 transition cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteVehicle(v)}
                          title="Remove Vehicle"
                          className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/15 transition cursor-pointer"
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
        </div>
      </div>

      {/* Bottom 3-Column Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Booking Pipeline Funnel */}
        <div className="lg:col-span-4 bento-card p-5 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-[14px] font-bold text-slate-900 dark:text-zinc-100">Booking Pipeline Funnel</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Live driver verification &amp; paid booking stages</p>
          </div>
          <div className="flex flex-col items-center justify-center space-y-2 my-auto py-2">
            <div className="w-full bg-indigo-500 text-white text-center py-2.5 rounded-lg text-xs font-semibold tabular-nums">
              Registered Drivers: {funnel.registeredDrivers}
            </div>
            <div className="w-[82%] bg-indigo-600 text-white text-center py-2.5 rounded-lg text-xs font-semibold tabular-nums">
              Total Bookings: {funnel.totalBookings}
            </div>
            <div className="w-[64%] bg-blue-600 text-white text-center py-2.5 rounded-lg text-xs font-semibold tabular-nums">
              Confirmed: {funnel.confirmedBookings}
            </div>
            <div className="w-[46%] bg-indigo-800 text-white text-center py-2.5 rounded-lg text-xs font-semibold tabular-nums">
              Paid: {funnel.paidBookings}
            </div>
          </div>
          <div className="pt-3 border-t border-hairline dark:border-[#27272A] flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
            <span>Confirmation Rate</span>
            <span className="font-bold text-lavender-600 dark:text-amber-400 tabular-nums">
              {funnel.conversionPct}%
            </span>
          </div>
        </div>

        {/* Monthly Revenue & Settled Payments Chart */}
        <div className="lg:col-span-5 bento-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div>
              <h3 className="text-[14px] font-bold text-slate-900 dark:text-zinc-100">Monthly Revenue &amp; Settlements</h3>
              <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-400 dark:bg-amber-500" /> Booking Volume
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-rose-500" /> Settled Payments
                </span>
              </div>
            </div>
            <select
              value={chartPeriod}
              onChange={(e) => setChartPeriod(e.target.value)}
              className="bg-white dark:bg-[#1C1C1F] border border-slate-200 dark:border-[#27272A] rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-200 outline-none focus:border-indigo-500 dark:focus:border-amber-500"
            >
              <option value="year">Last 6 Months</option>
              <option value="quarter">Last 4 Weeks</option>
            </select>
          </div>
          <div className="h-56 w-full">
            <Bar
              data={monthlyBarData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: tooltipStyle },
                scales: {
                  x: {
                    grid: { display: false },
                    ticks: { color: axisTickColor, font: { size: 11 } },
                  },
                  y: {
                    beginAtZero: true,
                    grid: { color: gridLineColor },
                    ticks: {
                      color: axisTickColor,
                      font: { size: 10 },
                      callback: (v) => `₹${Number(v).toLocaleString('en-IN')}`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Interactive Operations Notes */}
        <div className="lg:col-span-3 bento-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-[14px] font-bold text-slate-900 dark:text-zinc-100">Operations Notes</h3>
              <button
                type="button"
                onClick={() => setNoteModalOpen(true)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#27272A] hover:bg-slate-50 dark:hover:bg-[#1C1C1F] text-[11px] font-semibold text-slate-700 dark:text-zinc-200 transition cursor-pointer"
              >
                + Add Note
              </button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {notes.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No pending operations tasks</p>
              ) : (
                notes.map((n) => (
                  <div
                    key={n.id}
                    className="pb-3 border-b border-slate-100 dark:border-[#27272A] last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={n.isDone}
                        onChange={() => handleToggleNote(n)}
                        className="mt-0.5 rounded border-slate-300 dark:border-[#3F3F46] text-lavender-600 focus:ring-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-xs font-bold leading-snug ${
                            n.isDone
                              ? 'line-through text-slate-400 dark:text-zinc-500'
                              : 'text-slate-800 dark:text-zinc-100'
                          }`}
                        >
                          {n.title}
                        </div>
                        {n.description && (
                          <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{n.description}</p>
                        )}
                        <div className="flex items-center justify-between mt-2 gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              NOTE_BADGE_MAP[n.category] || NOTE_BADGE_MAP['Fleet Ops']
                            }`}
                          >
                            {n.category}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 inline-flex items-center gap-1 tabular-nums">
                              <Calendar className="w-3 h-3" />
                              {n.createdAt
                                ? new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : 'Today'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteNote(n.id)}
                              aria-label="Delete note"
                              className="text-slate-400 hover:text-rose-500 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Note Accessible Modal */}
      <AdminModal
        isOpen={noteModalOpen}
        onClose={() => setNoteModalOpen(false)}
        title="Add Operations Note"
        subtitle="Hub Coordination"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddNote} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
              Task Title *
            </label>
            <input
              type="text"
              value={noteForm.title}
              onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
              placeholder="e.g. Check Audi R8 tire pressure"
              required
              className="w-full bg-white dark:bg-[#1C1C1F] border border-slate-200 dark:border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-lavender-600 dark:focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
              Details
            </label>
            <input
              type="text"
              value={noteForm.description}
              onChange={(e) => setNoteForm({ ...noteForm, description: e.target.value })}
              placeholder="Short description for hub team..."
              className="w-full bg-white dark:bg-[#1C1C1F] border border-slate-200 dark:border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-lavender-600 dark:focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-300 mb-1.5">
              Category Tag
            </label>
            <select
              value={noteForm.category}
              onChange={(e) => setNoteForm({ ...noteForm, category: e.target.value })}
              className="w-full bg-white dark:bg-[#1C1C1F] border border-slate-200 dark:border-[#27272A] rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-zinc-100 outline-none focus:border-lavender-600 dark:focus:border-amber-500"
            >
              <option value="Fleet Ops">Fleet Ops</option>
              <option value="Maintenance">Maintenance</option>
              <option value="KYC">KYC</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setNoteModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#27272A] text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-[#1C1C1F] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={noteSubmitting}
              className="px-4 py-2 rounded-xl bg-lavender-600 hover:bg-lavender-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-zinc-950 text-xs font-semibold cursor-pointer disabled:opacity-60"
            >
              {noteSubmitting ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}
