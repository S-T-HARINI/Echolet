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
          <span className="inline-flex items-center text-[11px] font-medium px-2.5 py-0.5 rounded-full border bg-status-success-bg text-status-success-text border-status-success-border">
            <CheckCircle2 className="w-3 h-3 mr-1" /> DELIVERED
          </span>
        );
      case 'RETRYING':
        return (
          <span className="inline-flex items-center text-[11px] font-medium px-2.5 py-0.5 rounded-full border bg-status-warning-bg text-status-warning-text border-status-warning-border">
            <RotateCw className="w-3 h-3 mr-1 animate-spin" /> RETRYING
          </span>
        );
      case 'CLAIMED':
        return (
          <span className="inline-flex items-center text-[11px] font-medium px-2.5 py-0.5 rounded-full border bg-status-info-bg text-status-info-text border-status-info-border">
            <Clock className="w-3 h-3 mr-1" /> CLAIMED
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center text-[11px] font-medium px-2.5 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
            <Clock className="w-3 h-3 mr-1" /> PENDING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center text-[11px] font-medium px-2.5 py-0.5 rounded-full border bg-status-danger-bg text-status-danger-text border-status-danger-border">
            <AlertTriangle className="w-3 h-3 mr-1" /> {status}
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Transactional Outbox
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Durable PostgreSQL-backed event ledger with row leases and exponential retry backoff.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Events', val: summary?.total ?? 0, color: 'text-foreground' },
          { label: 'Pending', val: summary?.pending ?? 0, color: 'text-muted-foreground' },
          { label: 'In-Flight Lease', val: summary?.claimed ?? 0, color: 'text-status-info-text' },
          { label: 'Retrying (Backoff)', val: summary?.retrying ?? 0, color: 'text-status-warning-text' },
          { label: 'Delivered (200 OK)', val: summary?.delivered ?? 0, color: 'text-status-success-text' },
          { label: 'Failed (Exhausted)', val: summary?.failed ?? 0, color: 'text-status-danger-text' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-card border border-border rounded-lg p-3.5 shadow-xs">
            <span className="text-[11px] text-muted-foreground font-medium block">{stat.label}</span>
            <span className={`text-2xl font-semibold tracking-tight mt-1.5 block ${stat.color}`}>
              {stat.val}
            </span>
          </div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border rounded-lg p-3 shadow-xs">
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          {['ALL', 'PENDING', 'CLAIMED', 'RETRYING', 'DELIVERED', 'FAILED'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st === 'ALL' ? '' : st)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                (st === 'ALL' && !selectedStatus) || selectedStatus === st
                  ? 'bg-primary-surface text-primary border-primary-surface-border font-semibold shadow-2xs'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter by recipient email..."
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            className="w-full sm:w-64 bg-background border border-border rounded-md pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
      </div>

      {/* Outbox Event Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Event Type</th>
                <th className="py-2.5 px-4">Recipient</th>
                <th className="py-2.5 px-4">Attempts</th>
                <th className="py-2.5 px-4">Next Retry / Delivered</th>
                <th className="py-2.5 px-4">Last Error</th>
                <th className="py-2.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {notifications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Inbox className="w-8 h-8 mx-auto text-muted-foreground mb-2.5 opacity-60" />
                    <p className="text-foreground font-semibold text-xs">No outbox events found</p>
                    <p className="text-muted-foreground text-xs mt-1 max-w-sm mx-auto leading-relaxed">
                      {summary?.total === 0
                        ? 'No events have been dispatched to the outbox yet. Registering a member will generate an atomic outbox event.'
                        : 'No outbox events match your status or recipient filters.'}
                    </p>
                  </td>
                </tr>
              ) : (
                notifications.map((n) => (
                  <tr key={n.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">{getStatusBadge(n.status)}</td>
                    <td className="py-3 px-4 text-foreground font-medium text-xs">
                      {n.event_type === 'WORKSHOP_REGISTRATION_CONFIRMATION'
                        ? 'CONFIRMATION'
                        : 'CANCELLATION'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-foreground font-medium text-xs">{n.recipient_name}</div>
                      <div className="text-muted-foreground font-mono text-[11px]">{n.recipient_email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-foreground text-xs">{n.attempt_count}</span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      {n.status === 'DELIVERED' && n.delivered_at
                        ? new Date(n.delivered_at).toLocaleTimeString()
                        : n.next_retry_at
                        ? new Date(n.next_retry_at).toLocaleTimeString()
                        : '—'}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      {n.last_error ? (
                        <span
                          className="text-status-danger-text truncate block text-[11px] font-mono"
                          title={n.last_error}
                        >
                          {n.last_error}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setInspectItem(n)}
                        className="inline-flex items-center space-x-1 text-primary hover:bg-primary-surface px-2.5 py-1 rounded text-xs font-medium transition-colors"
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

      {/* Payload Inspection Dialog */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-lg w-full p-6 shadow-lg animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-semibold text-foreground">Event Payload Inspector</h3>
                  {getStatusBadge(inspectItem.status)}
                </div>
                <p className="text-xs font-mono text-muted-foreground mt-1">ID: {inspectItem.id}</p>
              </div>
              <button
                onClick={() => setInspectItem(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 overflow-y-auto flex-1 text-xs">
              {/* Idempotency Key */}
              <div className="p-3 rounded-lg border border-border bg-muted/40 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                  <span>DETERMINISTIC IDEMPOTENCY KEY</span>
                  <button
                    onClick={() => handleCopy(inspectItem.idempotency_key)}
                    className="flex items-center space-x-1 text-primary hover:underline font-medium"
                  >
                    {copiedKey ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
                  </button>
                </div>
                <div className="text-foreground font-mono text-xs break-all">{inspectItem.idempotency_key}</div>
              </div>

              {/* Delivery Metadata */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg border border-border bg-background">
                  <span className="text-muted-foreground text-[11px] block font-medium">Attempts Count</span>
                  <span className="text-foreground font-semibold mt-0.5 block">{inspectItem.attempt_count}</span>
                </div>
                <div className="p-2.5 rounded-lg border border-border bg-background">
                  <span className="text-muted-foreground text-[11px] block font-medium">Claimed By</span>
                  <span className="text-foreground truncate block mt-0.5">{inspectItem.claimed_by || 'Unclaimed'}</span>
                </div>
                <div className="p-2.5 rounded-lg border border-border bg-background">
                  <span className="text-muted-foreground text-[11px] block font-medium">Created At</span>
                  <span className="text-foreground mt-0.5 block">{new Date(inspectItem.created_at).toLocaleString()}</span>
                </div>
                <div className="p-2.5 rounded-lg border border-border bg-background">
                  <span className="text-muted-foreground text-[11px] block font-medium">Next Retry At</span>
                  <span className="text-foreground mt-0.5 block">
                    {inspectItem.next_retry_at ? new Date(inspectItem.next_retry_at).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Last Error if any */}
              {inspectItem.last_error && (
                <div className="p-3 rounded-lg border border-status-danger-border bg-status-danger-bg text-status-danger-text space-y-1">
                  <span className="text-xs font-semibold block">LAST RECORDED ERROR</span>
                  <div className="text-xs font-mono break-all leading-relaxed">{inspectItem.last_error}</div>
                </div>
              )}

              {/* JSON Payload */}
              <div>
                <span className="text-muted-foreground text-xs font-medium block mb-1">DISPATCH PAYLOAD (JSON)</span>
                <pre className="p-3 rounded-lg border border-border bg-muted/30 font-mono text-xs text-foreground overflow-x-auto leading-relaxed">
                  {JSON.stringify(inspectItem.payload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-end">
              <button
                onClick={() => setInspectItem(null)}
                className="px-4 py-1.5 rounded-md text-xs font-medium bg-primary hover:bg-primary-hover text-white shadow-xs transition-colors"
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
