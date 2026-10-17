'use client';

import React, { useState } from 'react';
import { NotificationOutbox, NotificationSummary } from '../../lib/api';
import {
  Clock,
  CheckCircle2,
  RotateCw,
  AlertTriangle,
  Search,
  Eye,
  X,
  Copy,
  Check,
  Inbox,
  Filter,
} from 'lucide-react';

interface OutboxViewProps {
  notifications: NotificationOutbox[];
  summary: NotificationSummary | null;
  selectedStatus: string;
  setSelectedStatus: (s: string) => void;
  emailFilter: string;
  setEmailFilter: (e: string) => void;
  onRefresh: () => void;
}

export const OutboxView: React.FC<OutboxViewProps> = ({
  notifications,
  summary,
  selectedStatus,
  setSelectedStatus,
  emailFilter,
  setEmailFilter,
  onRefresh,
}) => {
  const [inspectItem, setInspectItem] = useState<NotificationOutbox | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Transactional Outbox
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Durable PostgreSQL-backed event ledger with lease-based concurrency and exponential retry backoff.
          </p>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Events', val: summary?.total ?? 0, color: 'text-foreground' },
          { label: 'Pending', val: summary?.pending ?? 0, color: 'text-muted-foreground' },
          { label: 'In-Flight Lease', val: summary?.claimed ?? 0, color: 'text-sky-500' },
          { label: 'Retrying (Backoff)', val: summary?.retrying ?? 0, color: 'text-amber-500' },
          { label: 'Delivered (200 OK)', val: summary?.delivered ?? 0, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Failed (Exhausted)', val: summary?.failed ?? 0, color: 'text-rose-500' },
        ].map((stat, idx) => (
          <div key={idx} className="border border-border rounded-lg p-3.5 bg-card">
            <span className="text-[11px] text-muted-foreground font-mono block">{stat.label}</span>
            <span className={`text-2xl font-mono font-semibold tracking-tight mt-1.5 block ${stat.color}`}>
              {stat.val}
            </span>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border border-border rounded-lg p-2.5 bg-card">
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          {['ALL', 'PENDING', 'CLAIMED', 'RETRYING', 'DELIVERED', 'FAILED'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st === 'ALL' ? '' : st)}
              className={`text-xs px-2.5 py-1 rounded-md font-mono transition-colors whitespace-nowrap ${
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
            placeholder="Filter by recipient email..."
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            className="w-full sm:w-64 bg-background border border-border rounded-md pl-8 pr-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
      </div>

      {/* Outbox Event Table or Empty State */}
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
                  <td colSpan={7} className="py-16 text-center">
                    <Inbox className="w-8 h-8 mx-auto text-muted-foreground mb-3 opacity-60" />
                    <p className="text-foreground font-medium text-xs">No outbox events found</p>
                    <p className="text-muted-foreground text-[11px] mt-1 max-w-sm mx-auto">
                      {summary?.total === 0
                        ? 'No events have been dispatched to the outbox yet. Registering a member will generate an atomic outbox event.'
                        : 'No outbox events match your status or recipient filters.'}
                    </p>
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
                      <div className="text-foreground font-sans text-xs">{n.recipient_name}</div>
                      <div className="text-muted-foreground text-[10px]">{n.recipient_email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-foreground">{n.attempt_count}</span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-[10px]">
                      {n.status === 'DELIVERED' && n.delivered_at
                        ? new Date(n.delivered_at).toLocaleTimeString()
                        : n.next_retry_at
                        ? new Date(n.next_retry_at).toLocaleTimeString()
                        : '—'}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      {n.last_error ? (
                        <span
                          className="text-rose-500 truncate block text-[10px]"
                          title={n.last_error}
                        >
                          {n.last_error}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setInspectItem(n)}
                        className="inline-flex items-center space-x-1 text-muted-foreground hover:text-foreground text-[11px] p-1 rounded transition-colors"
                        title="Inspect Event Payload"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Inspection Modal */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-lg w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-semibold text-foreground">Outbox Event Inspector</h3>
                  {getStatusBadge(inspectItem.status)}
                </div>
                <p className="text-[11px] font-mono text-muted-foreground mt-1">ID: {inspectItem.id}</p>
              </div>
              <button
                onClick={() => setInspectItem(null)}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4 overflow-y-auto flex-1 text-xs font-mono">
              {/* Idempotency Key */}
              <div className="p-2.5 rounded border border-border bg-background space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>DETERMINISTIC IDEMPOTENCY KEY</span>
                  <button
                    onClick={() => handleCopy(inspectItem.idempotency_key)}
                    className="flex items-center space-x-1 hover:text-foreground"
                  >
                    {copiedKey ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="text-foreground text-[11px] break-all">{inspectItem.idempotency_key}</div>
              </div>

              {/* Delivery Metadata */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded border border-border bg-background">
                  <span className="text-muted-foreground text-[10px] block">Attempts Count</span>
                  <span className="text-foreground font-semibold">{inspectItem.attempt_count}</span>
                </div>
                <div className="p-2 rounded border border-border bg-background">
                  <span className="text-muted-foreground text-[10px] block">Claimed By Worker</span>
                  <span className="text-foreground truncate block">{inspectItem.claimed_by || 'None (Unclaimed)'}</span>
                </div>
                <div className="p-2 rounded border border-border bg-background">
                  <span className="text-muted-foreground text-[10px] block">Created At</span>
                  <span className="text-foreground">{new Date(inspectItem.created_at).toLocaleString()}</span>
                </div>
                <div className="p-2 rounded border border-border bg-background">
                  <span className="text-muted-foreground text-[10px] block">Next Retry At</span>
                  <span className="text-foreground">
                    {inspectItem.next_retry_at ? new Date(inspectItem.next_retry_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Last Error if any */}
              {inspectItem.last_error && (
                <div className="p-2.5 rounded border border-rose-500/20 bg-rose-500/5 text-rose-500 space-y-1">
                  <span className="text-[10px] font-semibold block">LAST RECORDED ERROR</span>
                  <div className="text-[11px] leading-relaxed break-all">{inspectItem.last_error}</div>
                </div>
              )}

              {/* Serialized JSON Payload */}
              <div>
                <span className="text-muted-foreground text-[10px] block mb-1">DISPATCH PAYLOAD (JSON)</span>
                <pre className="p-3 rounded border border-border bg-background text-[11px] text-foreground overflow-x-auto">
                  {JSON.stringify(inspectItem.payload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-end">
              <button
                onClick={() => setInspectItem(null)}
                className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
