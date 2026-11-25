import React from 'react';

const STATUS_STYLES = {
  Available: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
  Confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
  Verified: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
  Settled: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
  Read: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
  Rented: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
  Maintenance: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  'Pending Review': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  'Not Submitted': 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-[#1C1C1F] dark:text-zinc-400 dark:border-[#27272A]',
  'Not Confirmed': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
  Scheduled: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
  Cancelled: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30',
  'Needs Refund': 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30',
  Failed: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-[#1C1C1F] dark:text-zinc-300 dark:border-[#27272A]',
};

export default function StatusPill({ status, className = '' }) {
  const cls = STATUS_STYLES[status] || STATUS_STYLES.Failed;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cls} ${className}`}
    >
      {status}
    </span>
  );
}
