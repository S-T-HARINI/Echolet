'use client';

import React, { useState } from 'react';
import {
  SimulatorStatus,
  configureSimulator,
  resetSimulator,
} from '../../lib/api';
import {
  ShieldAlert,
  Zap,
  Clock,
  Bug,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Cpu,
} from 'lucide-react';

interface SimulatorViewProps {
  simulator: SimulatorStatus | null;
  onRefresh: () => void;
  showMessage: (msg: string, isError?: boolean) => void;
}

export const SimulatorView: React.FC<SimulatorViewProps> = ({
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
      showMessage('Simulator reset to Normal operation mode.');
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
    if (!failEmail.trim()) return;
    setIsUpdating(true);
    try {
      const currentList = simulator?.fail_recipients || [];
      const updatedList = Array.from(new Set([...currentList, failEmail.trim().toLowerCase()]));
      await configureSimulator({
        mode: simulator?.mode || 'normal',
        fail_recipients: updatedList,
      });
      showMessage(`Added "${failEmail.trim()}" to targeted failure list.`);
      setFailEmail('');
      onRefresh();
    } catch (err: any) {
      showMessage(err.message, true);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveFailingRecipient = async (emailToRemove: string) => {
    setIsUpdating(true);
    try {
      const currentList = simulator?.fail_recipients || [];
      const updatedList = currentList.filter((email) => email !== emailToRemove);
      await configureSimulator({
        mode: simulator?.mode || 'normal',
        fail_recipients: updatedList,
      });
      showMessage(`Removed "${emailToRemove}" from targeted failure list.`);
      onRefresh();
    } catch (err: any) {
      showMessage(err.message, true);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Failure Simulator &amp; Mock Service
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure real downstream network faults on port 8001 to verify Outbox retry and recovery.
          </p>
        </div>
        <div>
          <button
            onClick={handleReset}
            disabled={isUpdating}
            className="btn-google-secondary px-3.5 py-1.5 text-xs font-medium inline-flex items-center space-x-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Normal</span>
          </button>
        </div>
      </div>

      {/* Live Mock Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-4 shadow-xs">
          <span className="text-xs text-muted-foreground font-medium block">HTTP Requests Received</span>
          <span className="text-2xl font-semibold text-foreground mt-1 block">
            {simulator?.total_received ?? 0}
          </span>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-xs">
          <span className="text-xs text-muted-foreground font-medium block">Deliveries Recorded (200 OK)</span>
          <span className="text-2xl font-semibold text-status-success-text mt-1 block">
            {simulator?.total_delivered ?? 0}
          </span>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-xs">
          <span className="text-xs text-muted-foreground font-medium block">Faults Injected (500/Timeout)</span>
          <span className="text-2xl font-semibold text-status-danger-text mt-1 block">
            {simulator?.total_failed ?? 0}
          </span>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 shadow-xs">
          <span className="text-xs text-muted-foreground font-medium block">Idempotently Deduplicated</span>
          <span className="text-2xl font-semibold text-status-info-text mt-1 block">
            {simulator?.total_deduplicated ?? 0}
          </span>
        </div>
      </div>

      {/* Simulation Mode Cards */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Failure Simulation Modes
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select a mode to alter downstream notification service responses in real time.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Normal Mode */}
          <div
            onClick={() => handleModeChange('normal')}
            className={`p-4 rounded-lg border text-left cursor-pointer transition-all ${
              simulator?.mode === 'normal'
                ? 'border-primary bg-primary-surface ring-1 ring-primary/40 shadow-xs'
                : 'border-border bg-card hover:border-primary/40 hover:shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-foreground">Normal Operation</span>
              <CheckCircle2
                className={`w-4 h-4 ${
                  simulator?.mode === 'normal' ? 'text-primary' : 'text-muted-foreground/40'
                }`}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Returns HTTP 200 OK immediately and durably records delivery in mock persistence.
            </p>
            <div className="mt-3 pt-2 border-t border-border-subtle text-[11px] text-muted-foreground font-medium">
              Worker marks DELIVERED
            </div>
          </div>

          {/* HTTP 500 Outage */}
          <div
            onClick={() => handleModeChange('fail_500')}
            className={`p-4 rounded-lg border text-left cursor-pointer transition-all ${
              simulator?.mode === 'fail_500'
                ? 'border-red-500 bg-status-danger-bg ring-1 ring-red-500/40 shadow-xs'
                : 'border-border bg-card hover:border-red-400 hover:shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-foreground">HTTP 500 Server Outage</span>
              <ShieldAlert
                className={`w-4 h-4 ${
                  simulator?.mode === 'fail_500' ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground/40'
                }`}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Returns HTTP 500 Internal Server Error for incoming notification requests.
            </p>
            <div className="mt-3 pt-2 border-t border-border-subtle text-[11px] text-muted-foreground font-medium">
              Worker: backoff retry
            </div>
          </div>

          {/* Gateway Timeout */}
          <div
            onClick={() => handleModeChange('timeout', { delay_seconds: 6.0 })}
            className={`p-4 rounded-lg border text-left cursor-pointer transition-all ${
              simulator?.mode === 'timeout'
                ? 'border-amber-500 bg-status-warning-bg ring-1 ring-amber-500/40 shadow-xs'
                : 'border-border bg-card hover:border-amber-400 hover:shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-foreground">Gateway Timeout</span>
              <Clock
                className={`w-4 h-4 ${
                  simulator?.mode === 'timeout' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground/40'
                }`}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Injects artificial delay exceeding HTTP client timeout (6s vs 5s limit).
            </p>
            <div className="mt-3 pt-2 border-t border-border-subtle text-[11px] text-muted-foreground font-medium">
              Worker: timeout catch &amp; retry
            </div>
          </div>

          {/* Flaky Network */}
          <div
            onClick={() => handleModeChange('flaky', { failure_rate: 0.5 })}
            className={`p-4 rounded-lg border text-left cursor-pointer transition-all ${
              simulator?.mode === 'flaky'
                ? 'border-purple-500 bg-purple-500/10 ring-1 ring-purple-500/40 shadow-xs'
                : 'border-border bg-card hover:border-purple-400 hover:shadow-2xs'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-foreground">Flaky Network (50%)</span>
              <Bug
                className={`w-4 h-4 ${
                  simulator?.mode === 'flaky' ? 'text-purple-600 dark:text-purple-400' : 'text-muted-foreground/40'
                }`}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Randomly drops 50% of requests with simulated network disconnects.
            </p>
            <div className="mt-3 pt-2 border-t border-border-subtle text-[11px] text-muted-foreground font-medium">
              Receiver deduplicates
            </div>
          </div>
        </div>
      </div>

      {/* Targeted Failure Injection */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-xs space-y-3.5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Targeted Failure by Recipient Email
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Force downstream HTTP 500 failure exclusively for specific emails while letting other deliveries succeed.
          </p>
        </div>

        <form onSubmit={handleAddFailingRecipient} className="flex gap-2 max-w-md">
          <input
            type="email"
            required
            placeholder="e.g. failing.member@example.com"
            value={failEmail}
            onChange={(e) => setFailEmail(e.target.value)}
            className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
          <button
            type="submit"
            disabled={isUpdating}
            className="btn-google-primary px-4 py-1.5 text-xs font-semibold whitespace-nowrap"
          >
            Add Recipient
          </button>
        </form>

        {simulator?.fail_recipients && simulator.fail_recipients.length > 0 ? (
          <div className="space-y-2 pt-1">
            <span className="text-xs text-muted-foreground font-medium block">
              Configured failing recipients:
            </span>
            <div className="flex flex-wrap gap-2">
              {simulator.fail_recipients.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center space-x-1.5 text-xs font-mono px-2.5 py-1 rounded-md border border-status-danger-border bg-status-danger-bg text-status-danger-text"
                >
                  <span>{email}</span>
                  <button
                    onClick={() => handleRemoveFailingRecipient(email)}
                    className="hover:text-red-800 ml-1 font-bold p-0.5"
                    title="Remove recipient"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground font-medium">
            No specific recipients currently configured for targeted failure.
          </p>
        )}
      </div>

      {/* Outbox Resilience Technical Card */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-xs space-y-2 text-xs leading-relaxed">
        <h3 className="text-sm font-semibold text-foreground">
          How Outbox Resilience Protects Registration Integrity
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          When the notification service fails or times out, the member registration record remains 100% committed and valid in PostgreSQL. The independent outbox worker:
        </p>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Catches HTTP errors and retains the outbox record in durable storage</li>
          <li>Increments the attempt counter and logs the exact HTTP error message</li>
          <li>Schedules the next retry using exponential backoff with randomized jitter</li>
          <li>Releases the row lease so other worker instances can claim it when the backoff window opens</li>
          <li>Sends deterministic <code className="text-foreground font-mono">Idempotency-Key</code> so duplicate delivery attempts are deduplicated</li>
        </ul>
      </div>
    </div>
  );
};
