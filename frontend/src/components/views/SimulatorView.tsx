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
  Layers,
  ArrowRight,
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
  const [delaySec, setDelaySec] = useState<number>(3);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleModeChange = async (mode: string, extra: any = {}) => {
    setIsUpdating(true);
    try {
      await configureSimulator({
        mode,
        ...extra,
      });
      showMessage(`Simulator mode set to: ${mode.toUpperCase()}`);
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
      showMessage(`Added '${failEmail.trim()}' to targeted failure recipient list.`);
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
      showMessage(`Removed '${emailToRemove}' from targeted failure list.`);
      onRefresh();
    } catch (err: any) {
      showMessage(err.message, true);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Mock Notification Service &amp; Failure Simulator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Simulate real HTTP 500 outages, gateway timeouts, and network flakiness to verify Outbox worker resilience.
          </p>
        </div>
        <div>
          <button
            onClick={handleReset}
            disabled={isUpdating}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Normal</span>
          </button>
        </div>
      </div>

      {/* Live Service Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
        <div className="border border-border rounded-lg p-4 bg-card">
          <span className="text-[11px] text-muted-foreground block">HTTP Requests Received</span>
          <span className="text-2xl font-semibold text-foreground mt-1.5 block">
            {simulator?.total_received ?? 0}
          </span>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <span className="text-[11px] text-muted-foreground block">Deliveries Recorded (200 OK)</span>
          <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1.5 block">
            {simulator?.total_delivered ?? 0}
          </span>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <span className="text-[11px] text-muted-foreground block">Faults Injected (500/Timeout)</span>
          <span className="text-2xl font-semibold text-rose-500 mt-1.5 block">
            {simulator?.total_failed ?? 0}
          </span>
        </div>
        <div className="border border-border rounded-lg p-4 bg-card">
          <span className="text-[11px] text-muted-foreground block">Idempotently Deduplicated</span>
          <span className="text-2xl font-semibold text-sky-500 mt-1.5 block">
            {simulator?.total_deduplicated ?? 0}
          </span>
        </div>
      </div>

      {/* Simulator Modes Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Failure Injection Modes
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select a mode to alter downstream behavior on port 8001 in real time.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Normal Mode */}
          <div
            onClick={() => handleModeChange('normal')}
            className={`p-4 rounded-lg border text-left cursor-pointer transition-all ${
              simulator?.mode === 'normal'
                ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30'
                : 'border-border bg-card hover:border-foreground/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-foreground">Normal Operation</span>
              <CheckCircle2
                className={`w-4 h-4 ${
                  simulator?.mode === 'normal' ? 'text-emerald-500' : 'text-muted-foreground/40'
                }`}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
              Returns HTTP 200 OK immediately and durably records deliveries in the mock store.
            </p>
            <div className="mt-4 pt-2 border-t border-border/50 text-[10px] font-mono text-muted-foreground">
              Worker: transitions event to DELIVERED
            </div>
          </div>

          {/* HTTP 500 Outage */}
          <div
            onClick={() => handleModeChange('fail_500')}
            className={`p-4 rounded-lg border text-left cursor-pointer transition-all ${
              simulator?.mode === 'fail_500'
                ? 'border-rose-500 bg-rose-500/5 ring-1 ring-rose-500/30'
                : 'border-border bg-card hover:border-foreground/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-foreground">HTTP 500 Server Outage</span>
              <ShieldAlert
                className={`w-4 h-4 ${
                  simulator?.mode === 'fail_500' ? 'text-rose-500' : 'text-muted-foreground/40'
                }`}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
              Returns HTTP 500 Internal Server Error for every incoming delivery request.
            </p>
            <div className="mt-4 pt-2 border-t border-border/50 text-[10px] font-mono text-muted-foreground">
              Worker: logs error, sets RETRYING with exponential backoff
            </div>
          </div>

          {/* Gateway Timeout */}
          <div
            onClick={() => handleModeChange('timeout', { delay_seconds: 6.0 })}
            className={`p-4 rounded-lg border text-left cursor-pointer transition-all ${
              simulator?.mode === 'timeout'
                ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/30'
                : 'border-border bg-card hover:border-foreground/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-foreground">Gateway Timeout</span>
              <Clock
                className={`w-4 h-4 ${
                  simulator?.mode === 'timeout' ? 'text-amber-500' : 'text-muted-foreground/40'
                }`}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
              Injects artificial delay exceeding HTTP client timeout (6s vs 5s limit).
            </p>
            <div className="mt-4 pt-2 border-t border-border/50 text-[10px] font-mono text-muted-foreground">
              Worker: catches httpx.TimeoutException, schedules retry
            </div>
          </div>

          {/* Flaky Network */}
          <div
            onClick={() => handleModeChange('flaky', { failure_rate: 0.5 })}
            className={`p-4 rounded-lg border text-left cursor-pointer transition-all ${
              simulator?.mode === 'flaky'
                ? 'border-purple-500 bg-purple-500/5 ring-1 ring-purple-500/30'
                : 'border-border bg-card hover:border-foreground/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-foreground">Flaky Network (50%)</span>
              <Bug
                className={`w-4 h-4 ${
                  simulator?.mode === 'flaky' ? 'text-purple-500' : 'text-muted-foreground/40'
                }`}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
              Randomly drops 50% of requests with simulated network disconnects.
            </p>
            <div className="mt-4 pt-2 border-t border-border/50 text-[10px] font-mono text-muted-foreground">
              Worker: retries until success, receiver deduplicates
            </div>
          </div>
        </div>
      </div>

      {/* Targeted Failure Injection by Recipient */}
      <div className="border border-border rounded-lg p-6 bg-card space-y-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Targeted Failure Injection by Recipient
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Force HTTP 500 failure exclusively for specific email addresses while allowing other deliveries to succeed.
          </p>
        </div>

        <form onSubmit={handleAddFailingRecipient} className="flex gap-2 max-w-md">
          <input
            type="email"
            required
            placeholder="e.g. failing.member@example.com"
            value={failEmail}
            onChange={(e) => setFailEmail(e.target.value)}
            className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
          />
          <button
            type="submit"
            disabled={isUpdating}
            className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap"
          >
            Add Targeted Recipient
          </button>
        </form>

        {simulator?.fail_recipients && simulator.fail_recipients.length > 0 ? (
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-mono text-muted-foreground block">
              Currently failing recipients:
            </span>
            <div className="flex flex-wrap gap-2">
              {simulator.fail_recipients.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center space-x-1.5 text-xs font-mono px-2.5 py-1 rounded border border-rose-500/30 bg-rose-500/10 text-rose-500"
                >
                  <span>{email}</span>
                  <button
                    onClick={() => handleRemoveFailingRecipient(email)}
                    className="hover:text-rose-700 ml-1 p-0.5"
                    title="Remove recipient"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground font-mono">
            No specific recipients currently configured for targeted failure.
          </p>
        )}
      </div>

      {/* Explanation of Guaranteed Delivery Guarantees */}
      <div className="border border-border rounded-lg p-6 bg-card space-y-3 text-xs leading-relaxed">
        <h3 className="text-sm font-semibold text-foreground">
          How Outbox Resilience Works During Downstream Outages
        </h3>
        <p className="text-muted-foreground">
          When the notification service fails or times out, the independent background worker leaves the original workshop registration completely unaffected. The worker:
        </p>
        <ul className="list-disc list-inside space-y-1.5 text-muted-foreground font-mono text-[11px]">
          <li>Catches the HTTP failure response without dropping the database event</li>
          <li>Increments the attempt counter on the outbox record</li>
          <li>Applies exponential backoff with jitter: <code className="text-foreground">delay = min(max_delay, base * 2^attempt + jitter)</code></li>
          <li>Releases the row lease so other workers can safely claim it once the backoff window elapses</li>
          <li>Passes the deterministic idempotency key (<code className="text-foreground">reg_&lt;UUID&gt;</code>) so duplicate deliveries are safely ignored by the receiver</li>
        </ul>
      </div>
    </div>
  );
};
