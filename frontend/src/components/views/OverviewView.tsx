'use client';

import React from 'react';
import {
  Workshop,
  NotificationOutbox,
  NotificationSummary,
  SimulatorStatus,
  GlobalRegistrationItem,
} from '../../lib/api';
import {
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Clock,
  Calendar,
  Users,
  Server,
  Zap,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Plus,
} from 'lucide-react';

interface OverviewViewProps {
  workshops: Workshop[];
  notifications: NotificationOutbox[];
  registrations: GlobalRegistrationItem[];
  summary: NotificationSummary | null;
  simulator: SimulatorStatus | null;
  systemStatus: string;
  onNavigate: (tab: 'overview' | 'workshops' | 'registrations' | 'outbox' | 'simulator' | 'architecture') => void;
  onOpenCreateWorkshop: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  workshops,
  notifications,
  registrations,
  summary,
  simulator,
  systemStatus,
  onNavigate,
  onOpenCreateWorkshop,
}) => {
  const activeWorkshops = workshops.filter((w) => w.status === 'SCHEDULED');
  const cancelledWorkshops = workshops.filter((w) => w.status === 'CANCELLED');
  const totalCapacity = activeWorkshops.reduce((acc, w) => acc + w.capacity, 0);
  const totalRegisteredInActive = activeWorkshops.reduce((acc, w) => acc + w.registered_count, 0);
  const capacityUtilization = totalCapacity > 0 ? Math.round((totalRegisteredInActive / totalCapacity) * 100) : 0;

  const totalEvents = summary?.total ?? 0;
  const deliveredEvents = summary?.delivered ?? 0;
  const deliverySuccessRate = totalEvents > 0 ? Math.round((deliveredEvents / totalEvents) * 100) : 100;
  const inFlightCount = (summary?.pending ?? 0) + (summary?.claimed ?? 0) + (summary?.retrying ?? 0);

  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Top Banner: Google-style clean welcome & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            System Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time status of atomic workshop registrations, outbox delivery, and worker dispatch.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('outbox')}
            className="px-3.5 py-2 rounded-md text-xs font-medium border border-border bg-card hover:bg-muted text-foreground transition-colors"
          >
            Outbox Ledger ({totalEvents})
          </button>
          <button
            onClick={onOpenCreateWorkshop}
            className="px-4 py-2 rounded-md text-xs font-medium bg-primary hover:bg-primary-hover text-white shadow-xs transition-colors flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Workshop</span>
          </button>
        </div>
      </div>

      {/* Primary Google Material KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Workshops */}
        <div
          onClick={() => onNavigate('workshops')}
          className="bg-card border border-border rounded-lg p-5 shadow-xs hover:border-primary/40 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Workshops
            </span>
            <div className="w-7 h-7 rounded-md bg-primary-surface flex items-center justify-center text-primary">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-foreground tracking-tight">
              {workshops.length}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              ({activeWorkshops.length} active, {cancelledWorkshops.length} cancelled)
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-muted-foreground">
            <span>Capacity Utilized</span>
            <span className="text-foreground font-semibold">{capacityUtilization}%</span>
          </div>
        </div>

        {/* Confirmed Registrations */}
        <div
          onClick={() => onNavigate('registrations')}
          className="bg-card border border-border rounded-lg p-5 shadow-xs hover:border-primary/40 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Registrations
            </span>
            <div className="w-7 h-7 rounded-md bg-status-success-bg flex items-center justify-center text-status-success-text">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-foreground tracking-tight">
              {registrations.length}
            </span>
            <span className="text-xs text-muted-foreground font-medium">members registered</span>
          </div>
          <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-muted-foreground">
            <span>Capacity Check</span>
            <span className="text-status-success-text font-semibold">Atomic DB UPDATE</span>
          </div>
        </div>

        {/* Outbox Delivery Success */}
        <div
          onClick={() => onNavigate('outbox')}
          className="bg-card border border-border rounded-lg p-5 shadow-xs hover:border-primary/40 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Outbox Delivery
            </span>
            <div className="w-7 h-7 rounded-md bg-status-info-bg flex items-center justify-center text-status-info-text">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-foreground tracking-tight">
              {deliverySuccessRate}%
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              ({deliveredEvents}/{totalEvents} delivered)
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-muted-foreground">
            <span>In-flight / Retrying</span>
            <span className={`font-semibold ${inFlightCount > 0 ? 'text-status-warning-text' : 'text-foreground'}`}>
              {inFlightCount} event{inFlightCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Mock Notification Service */}
        <div
          onClick={() => onNavigate('simulator')}
          className="bg-card border border-border rounded-lg p-5 shadow-xs hover:border-primary/40 hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Notification Sink
            </span>
            <div className="w-7 h-7 rounded-md bg-status-warning-bg flex items-center justify-center text-status-warning-text">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-semibold text-foreground uppercase tracking-tight">
              {simulator?.mode || 'NORMAL'}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-muted-foreground">
            <span>Deduplication</span>
            <span className="text-foreground font-semibold">
              {simulator?.total_deduplicated ?? 0} idempotent
            </span>
          </div>
        </div>
      </div>

      {/* Architecture Subsystem Status */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Architecture Subsystems
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live status and decoupled process communication.
            </p>
          </div>
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full border bg-status-success-bg text-status-success-text border-status-success-border">
            All Systems {systemStatus.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {/* FastAPI Core */}
          <div className="p-3.5 rounded-lg border border-border bg-background flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">FastAPI REST Server</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <p className="text-muted-foreground text-xs mt-1.5 leading-relaxed">
                Port 8000. Provides atomic registration and asynchronous workshop endpoints.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-border-subtle font-mono text-[11px] text-muted-foreground">
              Host: 127.0.0.1:8000
            </div>
          </div>

          {/* Relational DB */}
          <div className="p-3.5 rounded-lg border border-border bg-background flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Relational Persistence</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <p className="text-muted-foreground text-xs mt-1.5 leading-relaxed">
                Single ACID transaction commits registration and outbox event together.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-border-subtle font-mono text-[11px] text-muted-foreground">
              Dual-write prevention: Active
            </div>
          </div>

          {/* Outbox Worker */}
          <div className="p-3.5 rounded-lg border border-border bg-background flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Outbox Worker Daemon</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <p className="text-muted-foreground text-xs mt-1.5 leading-relaxed">
                Polls pending outbox records using lease locks &amp; exponential retry backoff.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-border-subtle font-mono text-[11px] text-muted-foreground">
              Claims {summary?.claimed ?? 0} in-flight
            </div>
          </div>

          {/* Mock HTTP Sink */}
          <div className="p-3.5 rounded-lg border border-border bg-background flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Mock HTTP Service</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    simulator?.mode === 'normal'
                      ? 'bg-emerald-500'
                      : simulator?.mode === 'fail_500'
                      ? 'bg-red-500'
                      : 'bg-amber-500'
                  }`}
                ></span>
              </div>
              <p className="text-muted-foreground text-xs mt-1.5 leading-relaxed">
                Port 8001. Enforces receiver idempotency keys and simulated fault injection.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-border-subtle font-mono text-[11px] text-muted-foreground">
              Recorded deliveries: {simulator?.total_delivered ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Snapshot: Recent Activity & Workshop Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Outbox Activity */}
        <div className="bg-card border border-border rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">
                Recent Outbox Notifications
              </h3>
              <button
                onClick={() => onNavigate('outbox')}
                className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {recentNotifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground font-medium">
                  No notifications recorded yet. Register a member to trigger an outbox event.
                </div>
              ) : (
                recentNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="flex items-center justify-between p-2.5 rounded-md border border-border bg-background text-xs"
                  >
                    <div className="space-y-0.5 max-w-[65%]">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">
                          {notif.recipient_name}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono truncate">
                          ({notif.recipient_email})
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {notif.event_type.replace('WORKSHOP_', '')} &bull; Attempt {notif.attempt_count}
                      </div>
                    </div>

                    <div>
                      {notif.status === 'DELIVERED' && (
                        <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border bg-status-success-bg text-status-success-text border-status-success-border">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> DELIVERED
                        </span>
                      )}
                      {notif.status === 'RETRYING' && (
                        <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border bg-status-warning-bg text-status-warning-text border-status-warning-border">
                          <RotateCw className="w-3 h-3 mr-1 animate-spin" /> RETRYING
                        </span>
                      )}
                      {notif.status === 'CLAIMED' && (
                        <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border bg-status-info-bg text-status-info-text border-status-info-border">
                          <Clock className="w-3 h-3 mr-1" /> CLAIMED
                        </span>
                      )}
                      {notif.status === 'PENDING' && (
                        <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
                          PENDING
                        </span>
                      )}
                      {notif.status === 'FAILED' && (
                        <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full border bg-status-danger-bg text-status-danger-text border-status-danger-border">
                          <AlertTriangle className="w-3 h-3 mr-1" /> FAILED
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Scheduled Workshops Snapshot */}
        <div className="bg-card border border-border rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">
                Scheduled Workshops
              </h3>
              <button
                onClick={() => onNavigate('workshops')}
                className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
              >
                <span>Manage</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {activeWorkshops.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground font-medium">
                  No active workshops scheduled. Click &quot;+ New Workshop&quot; to begin.
                </div>
              ) : (
                activeWorkshops.slice(0, 4).map((w) => {
                  const pct = Math.min(100, Math.round((w.registered_count / w.capacity) * 100));
                  return (
                    <div
                      key={w.id}
                      className="p-2.5 rounded-md border border-border bg-background space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground tracking-tight line-clamp-1">
                          {w.title}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                          {w.registered_count} / {w.capacity} seats
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-muted-foreground">
            <span>Race Condition Safety</span>
            <span className="text-status-success-text font-semibold">Atomic DB UPDATE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
