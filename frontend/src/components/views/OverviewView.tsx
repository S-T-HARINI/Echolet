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
  Layers,
  Users,
  Server,
  Zap,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Activity,
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
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner / Welcome & Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            System Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time transactional integrity, atomic workshop registrations, and outbox delivery metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('outbox')}
            className="px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors"
          >
            View Outbox ({totalEvents})
          </button>
          <button
            onClick={onOpenCreateWorkshop}
            className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity"
          >
            + New Workshop
          </button>
        </div>
      </div>

      {/* Primary Key Performance Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Workshops */}
        <div
          onClick={() => onNavigate('workshops')}
          className="border border-border rounded-lg p-5 bg-card hover:border-foreground/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Workshops
            </span>
            <Layers className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-foreground font-mono">
              {workshops.length}
            </span>
            <span className="text-xs text-muted-foreground">
              ({activeWorkshops.length} active, {cancelledWorkshops.length} cancelled)
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Capacity Utilized</span>
            <span className="font-mono text-foreground font-medium">{capacityUtilization}%</span>
          </div>
        </div>

        {/* Total Confirmed Registrations */}
        <div
          onClick={() => onNavigate('registrations')}
          className="border border-border rounded-lg p-5 bg-card hover:border-foreground/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Registrations
            </span>
            <Users className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-foreground font-mono">
              {registrations.length}
            </span>
            <span className="text-xs text-muted-foreground">total members</span>
          </div>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Enforcement</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">Atomic ACID</span>
          </div>
        </div>

        {/* Outbox Delivery Success */}
        <div
          onClick={() => onNavigate('outbox')}
          className="border border-border rounded-lg p-5 bg-card hover:border-foreground/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Outbox Delivery
            </span>
            <TrendingUp className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-foreground font-mono">
              {deliverySuccessRate}%
            </span>
            <span className="text-xs text-muted-foreground">
              ({deliveredEvents}/{totalEvents})
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>In-flight / Retrying</span>
            <span className={`font-mono font-medium ${inFlightCount > 0 ? 'text-amber-500' : 'text-foreground'}`}>
              {inFlightCount} event{inFlightCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* Mock Notification Service Mode */}
        <div
          onClick={() => onNavigate('simulator')}
          className="border border-border rounded-lg p-5 bg-card hover:border-foreground/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Mock Service Status
            </span>
            <Zap className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-semibold tracking-tight text-foreground font-mono uppercase">
              {simulator?.mode || 'OFFLINE'}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Deduplicated</span>
            <span className="font-mono text-foreground font-medium">
              {simulator?.total_deduplicated ?? 0} idempotent
            </span>
          </div>
        </div>
      </div>

      {/* Component Architecture Live Health Status */}
      <div className="border border-border rounded-lg p-6 bg-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Architecture Subsystems
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live communication verification between decoupled processes.
            </p>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
            System {systemStatus.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          {/* FastAPI Core */}
          <div className="p-3.5 rounded border border-border bg-background flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">FastAPI REST Server</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <p className="text-muted-foreground text-[11px] mt-1.5 leading-relaxed">
                Port 8000. Provides atomic registration and asynchronous workshop endpoints.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-border font-mono text-[10px] text-muted-foreground">
              Host: 127.0.0.1:8000
            </div>
          </div>

          {/* Database */}
          <div className="p-3.5 rounded border border-border bg-background flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Relational Persistence</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              </div>
              <p className="text-muted-foreground text-[11px] mt-1.5 leading-relaxed">
                ACID transactions bundle registration commits and outbox events together.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-border font-mono text-[10px] text-muted-foreground">
              Tables: workshops, registrations, outbox
            </div>
          </div>

          {/* Outbox Worker */}
          <div className="p-3.5 rounded border border-border bg-background flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Outbox Worker Daemon</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <p className="text-muted-foreground text-[11px] mt-1.5 leading-relaxed">
                Polls pending outbox events using row leases &amp; exponential backoff.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-border font-mono text-[10px] text-muted-foreground">
              Active: Claims {summary?.claimed ?? 0} in-flight
            </div>
          </div>

          {/* Mock Notification Service */}
          <div className="p-3.5 rounded border border-border bg-background flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Mock HTTP Service</span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    simulator?.mode === 'normal'
                      ? 'bg-emerald-500'
                      : simulator?.mode === 'fail_500'
                      ? 'bg-rose-500'
                      : 'bg-amber-500'
                  }`}
                ></span>
              </div>
              <p className="text-muted-foreground text-[11px] mt-1.5 leading-relaxed">
                Port 8001. Enforces receiver-side idempotency keys and simulated fault injection.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-border font-mono text-[10px] text-muted-foreground">
              Total deliveries: {simulator?.total_delivered ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Activity & Workshop Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Outbox Activity */}
        <div className="border border-border rounded-lg p-5 bg-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                Recent Outbox Notifications
              </h3>
              <button
                onClick={() => onNavigate('outbox')}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {recentNotifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground font-mono">
                  No notifications recorded yet. Register a member to trigger an event.
                </div>
              ) : (
                recentNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="flex items-center justify-between p-2.5 rounded border border-border bg-background text-xs"
                  >
                    <div className="space-y-0.5 max-w-[65%]">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">
                          {notif.recipient_name}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground truncate">
                          ({notif.recipient_email})
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate">
                        {notif.event_type.replace('WORKSHOP_', '')} &bull; Attempt {notif.attempt_count}
                      </div>
                    </div>

                    <div>
                      {notif.status === 'DELIVERED' && (
                        <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                          <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> DELIVERED
                        </span>
                      )}
                      {notif.status === 'RETRYING' && (
                        <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-500 border-amber-500/20">
                          <RotateCw className="w-2.5 h-2.5 mr-1 animate-spin" /> RETRYING
                        </span>
                      )}
                      {notif.status === 'CLAIMED' && (
                        <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full border bg-sky-500/10 text-sky-500 border-sky-500/20">
                          <Clock className="w-2.5 h-2.5 mr-1" /> CLAIMED
                        </span>
                      )}
                      {notif.status === 'PENDING' && (
                        <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
                          PENDING
                        </span>
                      )}
                      {notif.status === 'FAILED' && (
                        <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full border bg-rose-500/10 text-rose-500 border-rose-500/20">
                          <AlertTriangle className="w-2.5 h-2.5 mr-1" /> FAILED
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Active Workshops Snapshot */}
        <div className="border border-border rounded-lg p-5 bg-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                Scheduled Workshops
              </h3>
              <button
                onClick={() => onNavigate('workshops')}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-mono"
              >
                <span>Manage</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {activeWorkshops.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground font-mono">
                  No active workshops scheduled. Click &quot;+ New Workshop&quot; to begin.
                </div>
              ) : (
                activeWorkshops.slice(0, 4).map((w) => {
                  const pct = Math.min(100, Math.round((w.registered_count / w.capacity) * 100));
                  return (
                    <div
                      key={w.id}
                      className="p-3 rounded border border-border bg-background space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground tracking-tight line-clamp-1">
                          {w.title}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {w.registered_count}/{w.capacity} seats
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-foreground transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Deterministic Concurrency Check</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">Atomic SQL UPDATE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
