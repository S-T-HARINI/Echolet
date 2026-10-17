'use client';

import React, { useState } from 'react';
import { NotificationOutbox, NotificationSummary } from '../lib/api';
import { Clock, CheckCircle2, RotateCw, AlertTriangle, Search, Eye, X } from 'lucide-react';

interface OutboxSectionProps {
  notifications: NotificationOutbox[];
  summary: NotificationSummary | null;
  selectedStatus: string;
  setSelectedStatus: (s: string) => void;
  emailFilter: string;
  setEmailFilter: (e: string) => void;
}

export const OutboxSection: React.FC<OutboxSectionProps> = ({
  notifications,
  summary,
  selectedStatus,
  setSelectedStatus,
  emailFilter,
  setEmailFilter,
}) => {
  const [inspectItem, setInspectItem] = useState<NotificationOutbox | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> DELIVERED
          </span>
        );
      case 'RETRYING':
        return (
          <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-500 border-amber-500/20">
            <RotateCw className="w-2.5 h-2.5 mr-1 animate-spin" /> RETRYING
          </span>
        );
      case 'CLAIMED':
        return (
          <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full border bg-sky-500/10 text-sky-500 border-sky-500/20">
            <Clock className="w-2.5 h-2.5 mr-1" /> CLAIMED
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
            <Clock className="w-2.5 h-2.5 mr-1" /> PENDING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full border bg-rose-500/10 text-rose-500 border-rose-500/20">
            <AlertTriangle className="w-2.5 h-2.5 mr-1" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Events', val: summary?.total ?? 0, color: 'text-foreground' },
          { label: 'Pending', val: summary?.pending ?? 0, color: 'text-muted-foreground' },
          { label: 'In-Flight Lease', val: summary?.claimed ?? 0, color: 'text-sky-500' },
          { label: 'Retrying (Backoff)', val: summary?.retrying ?? 0, color: 'text-amber-500' },
          { label: 'Delivered (200 OK)', val: summary?.delivered ?? 0, color: 'text-emerald-500' },
          { label: 'Failed', val: summary?.failed ?? 0, color: 'text-rose-500' },
        ].map((stat, idx) => (
          <div key={idx} className="border border-border rounded-lg p-3 bg-card">
            <span className="text-[11px] text-muted-foreground font-mono block">{stat.label}</span>
            <span className={`text-xl font-mono font-semibold tracking-tight mt-1 block ${stat.color}`}>
              {stat.val}
            </span>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border border-border rounded-lg p-2.5 bg-card">
        <div className="flex items-center space-x-2">
          {['ALL', 'PENDING', 'CLAIMED', 'RETRYING', 'DELIVERED'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st === 'ALL' ? '' : st)}
              className={`text-xs px-2.5 py-1 rounded-md font-mono transition-colors ${
                (st === 'ALL' && !selectedStatus) || selectedStatus === st
                  ? 'bg-foreground text-background font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter by email..."
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            className="w-full sm:w-60 bg-background border border-border rounded-md pl-8 pr-3 py-1 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
      </div>

      {/* Outbox Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium">Event Type</th>
                <th className="py-2.5 px-4 font-medium">Recipient</th>
                <th className="py-2.5 px-4 font-medium">Attempts</th>
                <th className="py-2.5 px-4 font-medium">Next Retry / Delivered</th>
                <th className="py-2.5 px-4 font-medium">Last Error</th>
                <th className="py-2.5 px-4 font-medium text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-[11px]">
              {notifications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    No notifications match current filters.
                  </td>
                </tr>
              ) : (
                notifications.map((n) => (
                  <tr key={n.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">{getStatusBadge(n.status)}</td>
                    <td className="py-3 px-4 text-foreground font-medium">
                      {n.event_type === 'WORKSHOP_REGISTRATION_CONFIRMATION'
                        ? 'CONFIRMATION'
                        : 'CANCELLATION'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-foreground">{n.recipient_name}</div>
                      <div className="text-muted-foreground text-[10px]">{n.recipient_email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-foreground">{n.attempt_count}</span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-[10px]">
                      {n.delivered_at
                        ? new Date(n.delivered_at).toLocaleTimeString()
                        : n.status === 'RETRYING'
                        ? `in ${Math.max(
                            0,
                            Math.round(
                              (new Date(n.next_retry_at).getTime() - Date.now()) / 1000
                            )
                          )}s`
                        : 'Immediate'}
                    </td>
                    <td className="py-3 px-4 max-w-[200px] truncate text-rose-400 text-[10px]">
                      {n.last_error || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setInspectItem(n)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                        title="View payload & lease info"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Item Modal */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-lg w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground font-mono">
                  Outbox Event: {inspectItem.id.slice(0, 13)}...
                </h3>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Idempotency Key: {inspectItem.idempotency_key}
                </span>
              </div>
              <button
                onClick={() => setInspectItem(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2 text-[11px] bg-muted/40 p-3 rounded border border-border">
                <div>
                  <span className="text-muted-foreground block">Status:</span>
                  <span className="text-foreground font-semibold">{inspectItem.status}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Attempts:</span>
                  <span className="text-foreground font-semibold">{inspectItem.attempt_count}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Claimed By:</span>
                  <span className="text-foreground">{inspectItem.claimed_by || 'Unclaimed'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Lease Expiry:</span>
                  <span className="text-foreground">
                    {inspectItem.claim_expires_at
                      ? new Date(inspectItem.claim_expires_at).toLocaleTimeString()
                      : 'None'}
                  </span>
                </div>
              </div>

              {inspectItem.last_error && (
                <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px]">
                  <span className="font-semibold block">Last Error:</span>
                  {inspectItem.last_error}
                </div>
              )}

              <div>
                <span className="text-muted-foreground text-[11px] block mb-1">Payload:</span>
                <pre className="bg-background border border-border rounded p-3 text-[10px] text-foreground overflow-x-auto max-h-48">
                  {JSON.stringify(inspectItem.payload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-border flex justify-end">
              <button
                onClick={() => setInspectItem(null)}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-foreground text-background"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
