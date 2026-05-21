'use client';

import { useState } from 'react';
import {
  Connection,
  Remark,
  networkColor,
  planColor,
  companyColor,
  tierMobileClass,
  FancyTier,
} from '@/lib/utils';
import { RemarkModal } from '@/components/RemarkModal';

interface ConnectionsTableProps {
  data: Connection[];
  page: number;
  perPage: number;
  onPageChange: (p: number) => void;
}

function TierBadge({ tier }: { tier: FancyTier | '' }) {
  if (!tier) return <span className='text-xs text-slate-700'>—</span>;
  const styles: Record<number, string> = {
    1: 'bg-violet-950 text-violet-300 border border-violet-800',
    2: 'bg-emerald-950 text-emerald-300 border border-emerald-800',
    3: 'bg-rose-950 text-rose-300 border border-rose-800',
  };
  const labels: Record<number, string> = {
    1: 'T1 Premium',
    2: 'T2 Choice',
    3: 'T3 Notable',
  };
  return (
    <span className={`badge ${styles[tier as number]}`}>
      {labels[tier as number]}
    </span>
  );
}

export function ConnectionsTable({
  data,
  page,
  perPage,
  onPageChange,
}: ConnectionsTableProps) {
  const [remarksOverride, setRemarksOverride] = useState(
    new Map<string, Remark>(),
  );
  const [editingConn, setEditingConn] = useState<Connection | null>(null);

  const totalPages = Math.ceil(data.length / perPage) || 1;
  const slice = data.slice((page - 1) * perPage, page * perPage);

  function handleRemarkSave(id: string, remark: Remark) {
    setRemarksOverride((prev) => new Map(prev).set(id, remark));
    setEditingConn(null);
  }

  function getEffectiveRemark(conn: Connection): Remark {
    if (conn._id && remarksOverride.has(conn._id)) {
      return remarksOverride.get(conn._id)!;
    }
    return conn.remark ?? { assignedTo: '', note: '' };
  }

  return (
    <div>
      <div className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.06)]'>
        <div className='overflow-x-auto'>
          <table className='w-full min-w-[1380px] text-sm'>
            <thead className='sticky top-0 z-10 border-b bg-gradient-to-r from-slate-100 to-slate-50 border-slate-200'>
              <tr>
                {[
                  'Mobile',
                  'Name',
                  'Company',
                  'Department',
                  'Designation',
                  // 'Location',
                  'Network',
                  'Plan',
                  'Paid By',
                  'Fancy Tier',
                  'Remark',
                ].map((head) => (
                  <th
                    key={head}
                    className='px-5 py-4 text-left text-[11px] font-bold tracking-[0.15em] uppercase text-slate-600 whitespace-nowrap'
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className='divide-y divide-slate-100'>
              {slice.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className='py-20 text-sm font-medium text-center text-slate-400'
                  >
                    No connections found
                  </td>
                </tr>
              ) : (
                slice.map((r, i) => {
                  const remark = getEffectiveRemark(r);

                  return (
                    <tr
                      key={`${r.mobile}-${i}`}
                      className='transition-all duration-200 group hover:bg-blue-50/60'
                    >
                      {' '}
                      {/* NAME */}
                      <td className='px-5 py-4'>
                        <div>
                          <p
                            className='max-w-[180px] truncate font-semibold text-slate-800'
                            title={r.name}
                          >
                            {r.name || '—'}
                          </p>
                        </div>
                      </td>
                      {/* MOBILE */}
                      <td className='px-5 py-4 whitespace-nowrap'>
                        <div className='inline-flex items-center px-3 py-2 rounded-xl bg-slate-100'>
                          <span
                            className={`font-mono text-xs font-semibold tracking-wider ${tierMobileClass(
                              r.fancy_tier,
                            )}`}
                          >
                            {r.mobile}
                          </span>
                        </div>
                      </td>
                      {/* COMPANY */}
                      <td className='px-5 py-4 '>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold border ${companyColor(
                            r.company,
                          )}`}
                        >
                          {r.company}
                        </span>
                      </td>
                      {/* DEPARTMENT */}
                      <td className='px-5 py-4'>
                        <span
                          className='block max-w-[160px] truncate text-slate-600'
                          title={r.department}
                        >
                          {r.department || '—'}
                        </span>
                      </td>
                      {/* DESIGNATION */}
                      <td className='px-5 py-4'>
                        <span
                          className='block max-w-[180px] truncate text-slate-700 font-medium'
                          title={r.designation}
                        >
                          {r.designation || '—'}
                        </span>
                      </td>
                      {/* NETWORK */}
                      <td className='px-5 py-4'>
                        {r.network ? (
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold border ${networkColor(
                              r.network,
                            )}`}
                          >
                            {r.network}
                          </span>
                        ) : (
                          <span className='text-slate-400'>—</span>
                        )}
                      </td>
                      {/* PLAN */}
                      <td className='px-5 py-4'>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold border ${planColor(
                            r.plan_type,
                          )}`}
                        >
                          {r.plan_type?.toLowerCase().includes('post')
                            ? 'Postpaid'
                            : r.plan_type?.toLowerCase().includes('pre')
                              ? 'Prepaid'
                              : r.plan_type || '—'}
                        </span>
                      </td>
                      {/* PAID BY */}
                      <td className='px-5 py-4'>
                        <span
                          className='block max-w-[140px] truncate text-slate-500'
                          title={r.paid_by}
                        >
                          {r.paid_by || '—'}
                        </span>
                      </td>
                      {/* FANCY TIER */}
                      <td className='px-5 py-4'>
                        <TierBadge tier={r.fancy_tier} />
                      </td>
                      {/* REMARK */}
                      <td className='px-5 py-4'>
                        <div className='flex items-start gap-2'>
                          <div className='flex-1 min-w-0'>
                            {remark.assignedTo ? (
                              <>
                                <p className='text-xs font-semibold text-blue-600 truncate'>
                                  {remark.assignedTo}
                                </p>

                                {remark.note && (
                                  <p
                                    className='mt-1 text-xs leading-relaxed line-clamp-2 text-slate-500'
                                    title={remark.note}
                                  >
                                    {remark.note}
                                  </p>
                                )}
                              </>
                            ) : remark.note ? (
                              <p
                                className='text-xs leading-relaxed line-clamp-2 text-slate-500'
                                title={remark.note}
                              >
                                {remark.note}
                              </p>
                            ) : (
                              <span className='text-slate-400'>—</span>
                            )}
                          </div>

                          {r._id && (
                            <button
                              onClick={() => setEditingConn(r)}
                              className='flex items-center justify-center transition-all bg-white border shadow-sm h-9 w-9 rounded-xl border-slate-200 text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600'
                            >
                              <svg
                                className='w-4 h-4'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth={2}
                                viewBox='0 0 24 24'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z'
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className='flex flex-col gap-4 px-6 py-4 border-t border-slate-200 bg-slate-50 md:flex-row md:items-center md:justify-between'>
          <p className='text-sm text-slate-600'>
            Showing{' '}
            <span className='font-semibold text-slate-900'>
              {data.length === 0 ? 0 : (page - 1) * perPage + 1}–
              {Math.min(page * perPage, data.length)}
            </span>{' '}
            of{' '}
            <span className='font-semibold text-slate-900'>{data.length}</span>{' '}
            connections
          </p>

          <div className='flex items-center gap-2'>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className='px-4 py-2 text-sm font-medium transition bg-white border shadow-sm rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40'
            >
              ← Previous
            </button>

            <div className='px-4 py-2 text-sm font-semibold text-white bg-blue-600 shadow rounded-xl'>
              {page} / {totalPages}
            </div>

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className='px-4 py-2 text-sm font-medium transition bg-white border shadow-sm rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40'
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Remark edit modal */}
      {editingConn && (
        <RemarkModal
          connectionId={editingConn._id!}
          mobile={editingConn.mobile}
          name={editingConn.name}
          currentRemark={getEffectiveRemark(editingConn)}
          onClose={() => setEditingConn(null)}
          onSave={handleRemarkSave}
        />
      )}
    </div>
  );
}
