'use client';

import React, { useState } from 'react';
import { SimulatorStatus, configureSimulator, resetSimulator } from '../lib/api';
import { ShieldAlert, Zap, Clock, Bug, RotateCcw, CheckCircle2 } from 'lucide-react';

interface MockSimulatorSectionProps {
  simulator: SimulatorStatus | null;
  onRefresh: () => void;
  showMessage: (msg: string, isError?: boolean) => void;
}

export const MockSimulatorSection: React.FC<MockSimulatorSectionProps> = ({
  simulator,
  onRefresh,
  showMessage,
}) => {
  const [failEmail, setFailEmail] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleModeChange = async (mode: string, extra: any = {}) => {
    setIsUpdating(true);
    try {
      await configureSimulator({
        mode,
        ...extra,
      });
      showMessage(`Simulator mode updated to: ${mode.toUpperCase()}`);
      onRefresh();
    } catch (err: any) {
      showMessage(err.message, true);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReset = async () => {
    setIsUpdating(true);
    try {
      await resetSimulator();
      showMessage('Simulator reset to Normal mode.');
      setFailEmail('');
      onRefresh();
    } catch (err: any) {
      showMessage(err.message, true);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddFailingRecipient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!failEmail) return;
    setIsUpdating(true);
    try {
      const currentList = simulator?.fail_recipients || [];
      const updatedList = Array.from(new Set([...currentList, failEmail.trim().toLowerCase()]));
      await configureSimulator({
        mode: simulator?.mode || 'normal',
        fail_recipients: updatedList,
      });
      showMessage(`Added ${failEmail} to deterministic failure list.`);
      setFailEmail('');
      onRefresh();
    } catch (err: any) {
      showMessage(err.message, true);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Mock HTTP Notification Service</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Simulate transient network faults, HTTP 500 errors, gateway timeouts, and verify receiver-side idempotency deduplication.
        </p>
      </div>

      {/* Simulator Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="border border-border rounded-lg p-3 bg-card">
          <span className="text-[11px] text-muted-foreground block">Requests Received</span>
          <span className="text-xl font-semibold text-foreground mt-1 block">
            {simulator?.total_received ?? 0}
          </span>
        </div>
        <div className="border border-border rounded-lg p-3 bg-card">
          <span className="text-[11px] text-muted-foreground block">Deliveries Recorded</span>
          <span className="text-xl font-semibold text-emerald-500 mt-1 block">
            {simulator?.total_delivered ?? 0}
          </span>
        </div>
        <div className="border border-border rounded-lg p-3 bg-card">
          <span className="text-[11px] text-muted-foreground block">Faults Injected</span>
          <span className="text-xl font-semibold text-rose-500 mt-1 block">
            {simulator?.total_failed ?? 0}
          </span>
        </div>
        <div className="border border-border rounded-lg p-3 bg-card">
          <span className="text-[11px] text-muted-foreground block">Idempotent Deduplicated</span>
          <span className="text-xl font-semibold text-sky-500 mt-1 block">
            {simulator?.total_deduplicated ?? 0}
          </span>
        </div>
      </div>

      {/* Mode Controls */}
      <div className="border border-border rounded-lg p-5 bg-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Failure Simulation Mode</h3>
          <button
            onClick={handleReset}
            disabled={isUpdating}
            className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset to Normal</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Normal Mode */}
          <button
            onClick={() => handleModeChange('normal')}
            disabled={isUpdating}
            className={`p-3 rounded-lg border text-left transition-all ${
              simulator?.mode === 'normal'
                ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30'
                : 'border-border bg-background hover:border-foreground/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-foreground">Normal Operation</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">200 OK responses with immediate durable storage recording.</p>
          </button>

          {/* HTTP 500 Outage */}
          <button
            onClick={() => handleModeChange('fail_500')}
            disabled={isUpdating}
            className={`p-3 rounded-lg border text-left transition-all ${
              simulator?.mode === 'fail_500'
                ? 'border-rose-500 bg-rose-500/5 ring-1 ring-rose-500/30'
                : 'border-border bg-background hover:border-foreground/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-foreground">HTTP 500 Outage</span>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Simulates internal server errors. Triggers worker exponential backoff.</p>
          </button>

          {/* Timeout Mode */}
          <button
            onClick={() => handleModeChange('timeout')}
            disabled={isUpdating}
            className={`p-3 rounded-lg border text-left transition-all ${
              simulator?.mode === 'timeout'
                ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/30'
                : 'border-border bg-background hover:border-foreground/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-foreground">Gateway Timeout</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Sleeps 5s exceeding worker's 3s bounded timeout.</p>
          </button>

          {/* Flaky Latency */}
          <button
            onClick={() => handleModeChange('flaky', { failure_rate: 0.5, delay_seconds: 1.0 })}
            disabled={isUpdating}
            className={`p-3 rounded-lg border text-left transition-all ${
              simulator?.mode === 'flaky'
                ? 'border-sky-500 bg-sky-500/5 ring-1 ring-sky-500/30'
                : 'border-border bg-background hover:border-foreground/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-foreground">50% Flaky Mode</span>
              <Bug className="w-4 h-4 text-sky-500" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">50% failure probability with 1s network latency.</p>
          </button>
        </div>
      </div>

      {/* Target Recipient Failure Simulation */}
      <div className="border border-border rounded-lg p-5 bg-card space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Target Recipient Failure (Recipient Isolation Test)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure specific email addresses to fail with HTTP 500 while all other registered members succeed simultaneously.
          </p>
        </div>

        <form onSubmit={handleAddFailingRecipient} className="flex gap-2">
          <input
            type="email"
            placeholder="e.g., fail@example.com"
            value={failEmail}
            onChange={(e) => setFailEmail(e.target.value)}
            className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
          />
          <button
            type="submit"
            disabled={isUpdating || !failEmail}
            className="px-3 py-1.5 rounded-md text-xs font-medium bg-foreground text-background hover:opacity-90 disabled:opacity-50"
          >
            Add Failing Recipient
          </button>
        </form>

        {simulator?.fail_recipients && simulator.fail_recipients.length > 0 && (
          <div className="space-y-1.5 pt-2">
            <span className="text-[11px] font-mono text-muted-foreground block">Active Targeted Failure List:</span>
            <div className="flex flex-wrap gap-2">
              {simulator.fail_recipients.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center space-x-1 text-xs font-mono px-2 py-0.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-400"
                >
                  <span>{email}</span>
                  <button
                    onClick={async () => {
                      const updated = simulator.fail_recipients.filter((e) => e !== email);
                      await configureSimulator({
                        mode: simulator.mode,
                        fail_recipients: updated,
                      });
                      onRefresh();
                    }}
                    className="hover:text-foreground text-[10px] ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
