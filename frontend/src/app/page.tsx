'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Header, NavigationTab } from '../components/Header';
import { OverviewView } from '../components/views/OverviewView';
import { WorkshopsView } from '../components/views/WorkshopsView';
import { RegistrationsView } from '../components/views/RegistrationsView';
import { OutboxView } from '../components/views/OutboxView';
import { SimulatorView } from '../components/views/SimulatorView';
import { ArchitectureView } from '../components/views/ArchitectureView';
import {
  Workshop,
  GlobalRegistrationItem,
  NotificationOutbox,
  NotificationSummary,
  SimulatorStatus,
  fetchWorkshops,
  fetchAllRegistrations,
  fetchNotifications,
  fetchNotificationSummary,
  fetchSimulatorStatus,
  fetchHealth,
} from '../lib/api';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('overview');
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [registrations, setRegistrations] = useState<GlobalRegistrationItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationOutbox[]>([]);
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [simulator, setSimulator] = useState<SimulatorStatus | null>(null);
  const [systemStatus, setSystemStatus] = useState<string>('healthy');

  // Outbox filter states
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [emailFilter, setEmailFilter] = useState<string>('');

  // UI state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [toast, setToast] = useState<{ message: string; isError: boolean } | null>(null);

  // Trigger for "+ New Workshop" from other views
  const [triggerCreateWorkshop, setTriggerCreateWorkshop] = useState(false);

  const showMessage = (message: string, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  const loadAllData = useCallback(async () => {
    try {
      const [wList, regList, notifData, sumData, simData, healthData] = await Promise.allSettled([
        fetchWorkshops(),
        fetchAllRegistrations(),
        fetchNotifications({
          status: selectedStatus || undefined,
          recipient_email: emailFilter || undefined,
        }),
        fetchNotificationSummary(),
        fetchSimulatorStatus(),
        fetchHealth(),
      ]);

      if (wList.status === 'fulfilled') setWorkshops(wList.value);
      if (regList.status === 'fulfilled') setRegistrations(regList.value);
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

  const handleOpenCreateWorkshopFromOverview = () => {
    setActiveTab('workshops');
    setTriggerCreateWorkshop(true);
  };

  const inFlightCount = (summary?.pending ?? 0) + (summary?.claimed ?? 0) + (summary?.retrying ?? 0);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground antialiased">
      {/* Google-style Compact Header and Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={handleManualRefresh}
        isRefreshing={isRefreshing}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        systemStatus={systemStatus}
        outboxPendingCount={inFlightCount}
        simulatorMode={simulator?.mode}
      />

      {/* Main Container with consistent max-width and compact padding */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Google Material Snackbar / Toast */}
        {toast && (
          <div
            className={`mb-5 p-3.5 rounded-lg border text-sm flex items-center justify-between shadow-xs animate-in slide-in-from-top-1 duration-150 ${
              toast.isError
                ? 'bg-status-danger-bg border-status-danger-border text-status-danger-text'
                : 'bg-status-success-bg border-status-success-border text-status-success-text'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {toast.isError ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              )}
              <span className="font-medium text-xs sm:text-sm">{toast.message}</span>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors ml-4"
              aria-label="Dismiss message"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dedicated View Components */}
        {activeTab === 'overview' && (
          <OverviewView
            workshops={workshops}
            notifications={notifications}
            registrations={registrations}
            summary={summary}
            simulator={simulator}
            systemStatus={systemStatus}
            onNavigate={(tab) => setActiveTab(tab)}
            onOpenCreateWorkshop={handleOpenCreateWorkshopFromOverview}
          />
        )}

        {activeTab === 'workshops' && (
          <WorkshopsView
            workshops={workshops}
            onRefresh={handleManualRefresh}
            showMessage={showMessage}
            showCreateModalInitial={triggerCreateWorkshop}
          />
        )}

        {activeTab === 'registrations' && (
          <RegistrationsView
            registrations={registrations}
            workshops={workshops}
            onRefresh={handleManualRefresh}
            showMessage={showMessage}
          />
        )}

        {activeTab === 'outbox' && (
          <OutboxView
            notifications={notifications}
            summary={summary}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            emailFilter={emailFilter}
            setEmailFilter={setEmailFilter}
            onRefresh={handleManualRefresh}
          />
        )}

        {activeTab === 'simulator' && (
          <SimulatorView
            simulator={simulator}
            onRefresh={handleManualRefresh}
            showMessage={showMessage}
          />
        )}

        {activeTab === 'architecture' && <ArchitectureView />}
      </main>

      {/* Google-style Clean Compact Footer */}
      <footer className="border-t border-border bg-card/60 py-3 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
          <div className="font-medium">
            EchoLet &bull; Production Workshop Registration &amp; Transactional Outbox
          </div>
          <div className="flex items-center space-x-3 text-[11px]">
            <span>ACID Dual-Write Safety</span>
            <span>&bull;</span>
            <span>FOR UPDATE SKIP LOCKED</span>
            <span>&bull;</span>
            <span>Exponential Backoff</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
