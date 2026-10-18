'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { Sidebar, NavigationTab } from '../components/Sidebar';
import { BrandLogo } from '../components/BrandLogo';
import { LandingPage } from '../components/LandingPage';
import { AuthModal } from '../components/AuthModal';
import { OverviewView } from '../components/views/OverviewView';
import { WorkshopsView } from '../components/views/WorkshopsView';
import { RegistrationsView } from '../components/views/RegistrationsView';
import { OutboxView } from '../components/views/OutboxView';
import { SimulatorView } from '../components/views/SimulatorView';
import { ArchitectureView } from '../components/views/ArchitectureView';
import { SettingsView } from '../components/views/SettingsView';
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
  const { user, isLoading } = useAuth();

  // Auth Modal state for unauthenticated landing page
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  // Navigation state & Mobile sidebar drawer
  const [activeTab, setActiveTab] = useState<NavigationTab>('overview');
  const [mobileOpen, setMobileOpen] = useState(false);

  // Core Data
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

  // Enforce role-based tab access
  useEffect(() => {
    if (user && user.role === 'MEMBER') {
      if (activeTab === 'outbox' || activeTab === 'simulator' || activeTab === 'architecture') {
        setActiveTab('overview');
      }
    }
  }, [user, activeTab]);

  const loadAllData = useCallback(async () => {
    if (!user) return;

    try {
      if (user.role === 'ORGANIZER') {
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

        if (wList.status === 'fulfilled') {
          setWorkshops(wList.value);
        } else if (wList.reason?.message) {
          showMessage(`Workshops API: ${wList.reason.message}`, true);
        }

        if (regList.status === 'fulfilled') {
          setRegistrations(regList.value);
        } else if (regList.reason?.message) {
          showMessage(`Registrations API: ${regList.reason.message}`, true);
        }

        if (notifData.status === 'fulfilled') setNotifications(notifData.value.items);
        if (sumData.status === 'fulfilled') setSummary(sumData.value);
        if (simData.status === 'fulfilled') setSimulator(simData.value);
        if (healthData.status === 'fulfilled') setSystemStatus(healthData.value.status || 'healthy');
      } else {
        // MEMBER: only fetch public/scoped data, never internal outbox/simulator
        const [wList, regList, healthData] = await Promise.allSettled([
          fetchWorkshops(),
          fetchAllRegistrations(),
          fetchHealth(),
        ]);

        if (wList.status === 'fulfilled') {
          setWorkshops(wList.value);
        } else if (wList.reason?.message) {
          showMessage(`Workshops API: ${wList.reason.message}`, true);
        }

        if (regList.status === 'fulfilled') {
          setRegistrations(regList.value);
        } else if (regList.reason?.message) {
          showMessage(`Registrations API: ${regList.reason.message}`, true);
        }

        if (healthData.status === 'fulfilled') setSystemStatus(healthData.value.status || 'healthy');
      }
    } catch (err: any) {
      showMessage(err?.message || 'Failed to load application data', true);
    }
  }, [user, selectedStatus, emailFilter]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadAllData();
    setIsRefreshing(false);
  };

  // Initial load when user logs in
  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user, loadAllData]);

  // Auto refresh polling every 3 seconds for authenticated users
  useEffect(() => {
    if (!user || !autoRefresh) return;
    const interval = setInterval(() => {
      loadAllData();
    }, 3000);
    return () => clearInterval(interval);
  }, [user, autoRefresh, loadAllData]);

  const handleOpenCreateWorkshopFromOverview = () => {
    setActiveTab('workshops');
    setTriggerCreateWorkshop(true);
  };

  // 1. Loading State: Clean Google-style spinner with canonical BrandLogo
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <BrandLogo size="lg" versionBadge="v2.0" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
            <div className="w-3.5 h-3.5 border-2 border-[#1a73e8] border-t-transparent rounded-full animate-spin" />
            <span>Verifying session...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State: Show public landing page only
  if (!user) {
    return (
      <>
        <LandingPage
          onOpenAuth={(mode) => {
            setAuthModalMode(mode);
            setAuthModalOpen(true);
          }}
        />
        <AuthModal
          isOpen={authModalOpen}
          initialMode={authModalMode}
          onClose={() => setAuthModalOpen(false)}
        />
      </>
    );
  }

  // 3. Authenticated State: Full role-isolated dashboard
  const inFlightCount = (summary?.pending ?? 0) + (summary?.claimed ?? 0) + (summary?.retrying ?? 0);

  return (
    <div className="min-h-screen flex bg-background text-foreground antialiased">
      {/* Persistent Vertical Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        outboxPendingCount={inFlightCount}
        simulatorMode={simulator?.mode}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Google-style Compact Top Header */}
        <Header
          activeTab={activeTab}
          onRefresh={handleManualRefresh}
          isRefreshing={isRefreshing}
          autoRefresh={autoRefresh}
          setAutoRefresh={setAutoRefresh}
          systemStatus={systemStatus}
          onToggleMobileSidebar={() => setMobileOpen(!mobileOpen)}
        />

        {/* Main View Area with clean max-width and comfortable margins */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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

          {activeTab === 'outbox' && user.role === 'ORGANIZER' && (
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

          {activeTab === 'simulator' && user.role === 'ORGANIZER' && (
            <SimulatorView
              simulator={simulator}
              onRefresh={handleManualRefresh}
              showMessage={showMessage}
            />
          )}

          {activeTab === 'architecture' && user.role === 'ORGANIZER' && <ArchitectureView />}

          {activeTab === 'settings' && <SettingsView />}
        </main>

        {/* Google-style Clean Compact Footer */}
        <footer className="border-t border-border bg-card/60 py-3 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
            <div className="font-medium">
              EchoLet &bull; Production Workshop Registration &amp; Transactional Outbox
            </div>
            <div className="flex items-center space-x-3 text-[11px]">
              <span>ACID Dual-Write Safety</span>
              <span>&bull;</span>
              <span>FOR UPDATE SKIP LOCKED</span>
              <span>&bull;</span>
              <span>Exponential Backoff</span>
              <span>&bull;</span>
              <span>Role-Based Data Isolation</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
