'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Header } from '../components/Header';
import { WorkshopSection } from '../components/WorkshopSection';
import { OutboxSection } from '../components/OutboxSection';
import { MockSimulatorSection } from '../components/MockSimulatorSection';
import {
  Workshop,
  NotificationOutbox,
  NotificationSummary,
  SimulatorStatus,
  fetchWorkshops,
  fetchNotifications,
  fetchNotificationSummary,
  fetchSimulatorStatus,
  fetchHealth,
} from '../lib/api';
import {
  Layers,
  Inbox,
  Cpu,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Terminal,
} from 'lucide-react';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'workshops' | 'outbox' | 'simulator' | 'guide'>('workshops');
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [notifications, setNotifications] = useState<NotificationOutbox[]>([]);
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [simulator, setSimulator] = useState<SimulatorStatus | null>(null);
  const [systemStatus, setSystemStatus] = useState<string>('healthy');

  // Filter states
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [emailFilter, setEmailFilter] = useState<string>('');

  // UI state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [toast, setToast] = useState<{ message: string; isError: boolean } | null>(null);

  const showMessage = (message: string, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  const loadAllData = useCallback(async () => {
    try {
      const [wList, notifData, sumData, simData, healthData] = await Promise.allSettled([
        fetchWorkshops(),
        fetchNotifications({
          status: selectedStatus || undefined,
          recipient_email: emailFilter || undefined,
        }),
        fetchNotificationSummary(),
        fetchSimulatorStatus(),
        fetchHealth(),
      ]);

      if (wList.status === 'fulfilled') setWorkshops(wList.value);
      if (notifData.status === 'fulfilled') setNotifications(notifData.value.items);
      if (sumData.status === 'fulfilled') setSummary(sumData.value);
      if (simData.status === 'fulfilled') setSimulator(simData.value);
      if (healthData.status === 'fulfilled') setSystemStatus(healthData.value.status || 'healthy');
    } catch (err: any) {
      console.error('Data load error:', err);
    }
  }, [selectedStatus, emailFilter]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadAllData();
    setIsRefreshing(false);
  };

  // Initial load
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Auto refresh polling every 3 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadAllData();
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadAllData]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        systemStatus={systemStatus}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Toast / Notification Banner */}
        {toast && (
          <div
            className={`mb-6 p-3 rounded-lg border text-xs flex items-center justify-between shadow-sm animate-in slide-in-from-top-2 ${
              toast.isError
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            <div className="flex items-center space-x-2">
              {toast.isError ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              ) : (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
              )}
              <span>{toast.message}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-muted-foreground hover:text-foreground text-sm font-mono ml-4"
            >
              ×
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-border mb-6 space-x-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('workshops')}
            className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'workshops'
                ? 'border-foreground text-foreground font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Workshops & Registrations</span>
          </button>

          <button
            onClick={() => setActiveTab('outbox')}
            className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'outbox'
                ? 'border-foreground text-foreground font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Transactional Outbox</span>
            {summary && summary.pending + summary.retrying > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-500">
                {summary.pending + summary.retrying}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'simulator'
                ? 'border-foreground text-foreground font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Failure Simulator</span>
            {simulator && simulator.mode !== 'normal' && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-500">
                {simulator.mode.toUpperCase()}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors ${
              activeTab === 'guide'
                ? 'border-foreground text-foreground font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>System Architecture</span>
          </button>
        </div>

        {/* Tab Views */}
        {activeTab === 'workshops' && (
          <WorkshopSection
            workshops={workshops}
            onRefresh={handleManualRefresh}
            showMessage={showMessage}
          />
        )}

        {activeTab === 'outbox' && (
          <OutboxSection
            notifications={notifications}
            summary={summary}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            emailFilter={emailFilter}
            setEmailFilter={setEmailFilter}
          />
        )}

        {activeTab === 'simulator' && (
          <MockSimulatorSection
            simulator={simulator}
            onRefresh={handleManualRefresh}
            showMessage={showMessage}
          />
        )}

        {activeTab === 'guide' && (
          <div className="border border-border rounded-lg p-6 bg-card space-y-6">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                EchoLet Architecture & Transaction Boundaries
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Guaranteed notification delivery without distributed dual-write inconsistencies.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="border border-border rounded p-4 bg-background">
                <span className="font-semibold text-foreground font-mono block mb-1">
                  1. Atomic Registration
                </span>
                <p className="text-muted-foreground leading-relaxed">
                  The member registration and its corresponding confirmation outbox event are persisted inside the
                  exact same relational database transaction. If capacity is exhausted or duplicate member detected, both roll back.
                </p>
              </div>

              <div className="border border-border rounded p-4 bg-background">
                <span className="font-semibold text-foreground font-mono block mb-1">
                  2. Concurrency-Safe Worker
                </span>
                <p className="text-muted-foreground leading-relaxed">
                  The background worker polls pending events using row leases and <code className="font-mono text-foreground">FOR UPDATE SKIP LOCKED</code>. Database transactions are closed before external HTTP dispatch.
                </p>
              </div>

              <div className="border border-border rounded p-4 bg-background">
                <span className="font-semibold text-foreground font-mono block mb-1">
                  3. Receiver Idempotency
                </span>
                <p className="text-muted-foreground leading-relaxed">
                  Deterministic idempotency keys (<code className="font-mono text-foreground">reg_UUID</code>) prevent duplicate deliveries when ambiguous timeouts or network retries occur.
                </p>
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center">
                <Terminal className="w-3.5 h-3.5 mr-1.5" /> Core API Verification Commands
              </h3>
              <div className="bg-background border border-border rounded p-3 text-[11px] font-mono text-muted-foreground space-y-2 overflow-x-auto">
                <div># 1. Create a workshop</div>
                <div className="text-foreground">
                  curl -X POST http://localhost:8000/api/v1/workshops -H &quot;Content-Type: application/json&quot; -d &apos;&#123;&quot;title&quot;: &quot;Distributed Outbox Workshop&quot;, &quot;schedule&quot;: &quot;2026-12-01T10:00:00Z&quot;, &quot;capacity&quot;: 50&#125;&apos;
                </div>
                <div className="pt-2"># 2. Register a member</div>
                <div className="text-foreground">
                  curl -X POST http://localhost:8000/api/v1/workshops/WORKSHOP_ID/registrations -H &quot;Content-Type: application/json&quot; -d &apos;&#123;&quot;member_id&quot;: &quot;mem-1&quot;, &quot;member_name&quot;: &quot;Alice&quot;, &quot;member_email&quot;: &quot;alice@example.com&quot;&#125;&apos;
                </div>
                <div className="pt-2"># 3. Cancel workshop and fan out notifications</div>
                <div className="text-foreground">
                  curl -X POST http://localhost:8000/api/v1/workshops/WORKSHOP_ID/cancel
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground font-mono">
        EchoLet &bull; Production Workshop Registration &amp; Transactional Outbox Notification System
      </footer>
    </div>
  );
}
