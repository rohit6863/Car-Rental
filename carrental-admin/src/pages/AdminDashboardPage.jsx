import React, { useState, useEffect, useMemo } from 'react';
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
  ArrowRight,
  Plus,
} from 'lucide-react';
import client from '../api/client';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    regUsers: 0,
    listedVehicles: 0,
    totalBookings: 0,
    listedBrands: 0,
    subscribers: 0,
    queries: 0,
  });
  const [vehicles, setVehicles] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [statsRes, vehiclesRes, bookingsRes] = await Promise.all([
          client.get('/api/admin/stats'),
          client.get('/api/admin/vehicles').catch(() => ({ data: [] })),
          client.get('/api/admin/bookings').catch(() => ({ data: [] })),
        ]);
        setStats(statsRes.data);
        setVehicles(Array.isArray(vehiclesRes.data) ? vehiclesRes.data : []);
        setBookings(Array.isArray(bookingsRes.data) ? bookingsRes.data : []);
      } catch {
        setError('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const fuelChartData = useMemo(() => {
    const counts = { Petrol: 0, Diesel: 0, Electric: 0, CNG: 0, Hybrid: 0 };
    vehicles.forEach((v) => {
      const f = v.FuelType || 'Petrol';
      counts[f] = (counts[f] || 0) + 1;
    });
    const labels = Object.keys(counts);
    return {
      labels,
      datasets: [
        {
          data: labels.map((l) => counts[l]),
          backgroundColor: ['#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EC4899'],
          borderWidth: 0,
        },
      ],
    };
  }, [vehicles]);

  const bookingChartData = useMemo(() => {
    let confirmed = 0;
    let pending = 0;
    let cancelled = 0;
    bookings.forEach((b) => {
      if (b.Status === 1) confirmed++;
      else if (b.Status === 2) cancelled++;
      else pending++;
    });
    return {
      labels: ['Confirmed', 'Pending', 'Cancelled'],
      datasets: [
        {
          label: 'Bookings',
          data: [confirmed, pending, cancelled],
          backgroundColor: ['#10B981', '#F59E0B', '#F43F5E'],
          borderRadius: 8,
          barThickness: 36,
        },
      ],
    };
  }, [bookings]);

  const statCards = [
    {
      title: 'REG USERS',
      value: stats.regUsers,
      to: '/reg-users',
      icon: Users,
      pill: 'bg-indigo-50 text-indigo-600',
      sub: 'Registered customers',
    },
    {
      title: 'LISTED VEHICLES',
      value: stats.listedVehicles,
      to: '/manage-vehicles',
      icon: Car,
      pill: 'bg-emerald-50 text-emerald-600',
      sub: 'Active fleet units',
    },
    {
      title: 'TOTAL BOOKINGS',
      value: stats.totalBookings,
      to: '/manage-bookings',
      icon: CalendarCheck,
      pill: 'bg-sky-50 text-sky-600',
      sub: 'All reservations',
    },
    {
      title: 'LISTED BRANDS',
      value: stats.listedBrands,
      to: '/manage-brands',
      icon: Award,
      pill: 'bg-amber-50 text-amber-600',
      sub: 'Partner manufacturers',
    },
    {
      title: 'SUBSCRIBERS',
      value: stats.subscribers,
      to: '/manage-subscribers',
      icon: Mail,
      pill: 'bg-violet-50 text-violet-600',
      sub: 'Newsletter opt-ins',
    },
    {
      title: 'QUERIES',
      value: stats.queries,
      to: '/manage-contactusquery',
      icon: MessageSquare,
      pill: 'bg-rose-50 text-rose-600',
      sub: 'Support inquiries',
    },
  ];

  const recentBookings = bookings.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="page-title text-xl font-bold text-slate-900 tracking-tight">
            Fleet Performance & Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Live overview of fleet inventory, bookings, and customer operations
          </p>
        </div>
        <Link
          to="/post-vehicle"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold transition no-underline self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Post a Vehicle</span>
        </Link>
      </div>

      {error && (
        <div className="errorWrap">{error}</div>
      )}

      {/* 6 Bento Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bento-card p-5 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="stat-panel-title text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {card.title}
                  </div>
                  <div className="stat-panel-number text-3xl font-extrabold text-slate-900 tabular-nums mt-2">
                    {loading ? '...' : card.value}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{card.sub}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.pill}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between">
                <Link
                  to={card.to}
                  className="text-xs font-semibold text-lavender-600 hover:text-lavender-700 inline-flex items-center gap-1.5 no-underline"
                >
                  <span>Full Detail</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 bento-card p-5">
          <h3 className="text-sm font-bold text-slate-900">Fleet Powertrain Mix</h3>
          <p className="text-xs text-slate-400 mt-0.5">Live fuel distribution across {vehicles.length} vehicles</p>
          <div className="h-56 flex items-center justify-center mt-4">
            <Doughnut
              data={fuelChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
                },
              }}
            />
          </div>
        </div>

        <div className="lg:col-span-7 bento-card p-5">
          <h3 className="text-sm font-bold text-slate-900">Booking Pipeline Status</h3>
          <p className="text-xs text-slate-400 mt-0.5">Live reservation status breakdown ({bookings.length} total)</p>
          <div className="h-56 mt-4">
            <Bar
              data={bookingChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, ticks: { precision: 0 } },
                  x: { grid: { display: false } },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent Bookings Snapshot */}
      <div className="bento-card overflow-hidden">
        <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Reservations</h3>
            <p className="text-xs text-slate-400 mt-0.5">Latest 5 customer booking requests</p>
          </div>
          <Link
            to="/manage-bookings"
            className="text-xs font-semibold text-lavender-600 hover:underline no-underline"
          >
            View All &rarr;
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider border-b border-hairline">
              <tr>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Vehicle</th>
                <th className="px-5 py-3 font-semibold">Dates</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-slate-400">
                    No bookings recorded yet
                  </td>
                </tr>
              ) : (
                recentBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-semibold text-slate-900">{b.FullName || b.userEmail}</td>
                    <td className="px-5 py-3 text-slate-700">
                      {b.BrandName ? `${b.BrandName}, ` : ''}{b.VehiclesTitle}
                    </td>
                    <td className="px-5 py-3 text-slate-500 tabular-nums">
                      {b.FromDate} &rarr; {b.ToDate}
                    </td>
                    <td className="px-5 py-3">
                      {b.Status === 1 ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Confirmed
                        </span>
                      ) : b.Status === 2 ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Cancelled
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Not Confirmed yet
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
