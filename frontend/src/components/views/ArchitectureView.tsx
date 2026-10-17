'use client';

import React from 'react';
import {
  Server,
  Database,
  Cpu,
  Mail,
  ShieldCheck,
  Terminal,
  RefreshCw,
  Lock,
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="pb-4 border-b border-border">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">
          System Architecture &amp; Guarantees
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Technical design of EchoLet&apos;s Transactional Outbox pattern, ACID transaction boundaries, and receiver idempotency.
        </p>
      </div>

      {/* Visual Pipeline / Flow Diagram */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Data Flow &amp; Transaction Boundaries
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Single-transaction atomicity eliminates dual-write inconsistencies between the database and the network.
          </p>
        </div>

        {/* Visual Node Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Node 1: Client Request */}
          <div className="border border-border rounded-lg p-4 bg-background flex flex-col justify-between space-y-2.5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">1. REQUEST</span>
                <Server className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mt-1">FastAPI REST Server</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Client issues <code className="text-foreground font-mono">POST /workshops/:id/registrations</code>.
              </p>
            </div>
            <div className="pt-2 border-t border-border-subtle text-[11px] text-muted-foreground font-medium">
              Validates schema &amp; capacity
            </div>
          </div>

          {/* Node 2: Database ACID Boundary */}
          <div className="border border-primary-surface-border bg-primary-surface rounded-lg p-4 flex flex-col justify-between space-y-2.5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-primary uppercase">
                  2. ACID BOUNDARY
                </span>
                <Database className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mt-1">Relational Database</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Single transaction updates workshop capacity, inserts registration, and inserts pending outbox record.
              </p>
            </div>
            <div className="pt-2 border-t border-primary/20 text-[11px] text-primary font-semibold">
              Atomic Commit &bull; Zero Dual-Writes
            </div>
          </div>

          {/* Node 3: Outbox Worker */}
          <div className="border border-border rounded-lg p-4 bg-background flex flex-col justify-between space-y-2.5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">3. ASYNC WORKER</span>
                <Cpu className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mt-1">Outbox Daemon</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Claims pending events via lease with row locking. External HTTP calls run outside DB transactions.
              </p>
            </div>
            <div className="pt-2 border-t border-border-subtle text-[11px] text-muted-foreground font-medium">
              Lease expiry recovery &bull; Backoff
            </div>
          </div>

          {/* Node 4: Mock Service */}
          <div className="border border-border rounded-lg p-4 bg-background flex flex-col justify-between space-y-2.5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase">4. SINK</span>
                <Mail className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mt-1">Mock HTTP Service</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Evaluates <code className="text-foreground font-mono">Idempotency-Key</code> header to deduplicate duplicate deliveries.
              </p>
            </div>
            <div className="pt-2 border-t border-border-subtle text-[11px] text-muted-foreground font-medium">
              Port 8001 &bull; At-least-once safety
            </div>
          </div>
        </div>
      </div>

      {/* Core Architectural Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pillar 1 */}
        <div className="bg-card border border-border rounded-lg p-5 shadow-xs space-y-2">
          <div className="flex items-center space-x-2 text-foreground font-semibold text-sm">
            <Lock className="w-4 h-4 text-primary" />
            <span>Atomic Registration &amp; Outbox</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            In standard systems, committing a registration and immediately sending an HTTP request risks dual-write inconsistency: if the network call fails or times out, the registration is committed but no notification is sent. EchoLet eliminates this by persisting both in the exact same database transaction.
          </p>
        </div>

        {/* Pillar 2 */}
        <div className="bg-card border border-border rounded-lg p-5 shadow-xs space-y-2">
          <div className="flex items-center space-x-2 text-foreground font-semibold text-sm">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Worker Lease &amp; Concurrency</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Multiple worker instances can run concurrently without double-dispatching notifications. Each worker claims a batch of pending events by acquiring a timestamped lease (<code className="font-mono text-foreground">claimed_by</code>, <code className="font-mono text-foreground">claim_expires_at</code>). If a worker process crashes mid-flight, another worker re-claims the expired lease.
          </p>
        </div>

        {/* Pillar 3 */}
        <div className="bg-card border border-border rounded-lg p-5 shadow-xs space-y-2">
          <div className="flex items-center space-x-2 text-foreground font-semibold text-sm">
            <RefreshCw className="w-4 h-4 text-primary" />
            <span>Deterministic Idempotency</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Because network partitions can cause timeouts even after a notification was processed, at-least-once delivery is transformed into effectively exactly-once delivery via the <code className="font-mono text-foreground">Idempotency-Key: reg_&lt;UUID&gt;</code> header. The receiver records keys and deduplicates re-transmissions.
          </p>
        </div>
      </div>

      {/* Failure Scenario Matrix */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-xs space-y-3.5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Failure Recovery Matrix
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            System guarantees across unexpected network and hardware faults.
          </p>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Failure Scenario</th>
                <th className="py-2.5 px-4">System Behavior</th>
                <th className="py-2.5 px-4">Guaranteed Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              <tr className="hover:bg-muted/30">
                <td className="py-3 px-4 font-semibold text-foreground">
                  Database transaction rolls back (e.g. capacity exceeded)
                </td>
                <td className="py-3 px-4 text-muted-foreground leading-relaxed">
                  FastAPI endpoint rolls back both the registration and outbox insert atomically.
                </td>
                <td className="py-3 px-4 text-xs font-semibold text-status-success-text">
                  No phantom notification is ever queued or sent.
                </td>
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="py-3 px-4 font-semibold text-foreground">
                  Downstream HTTP service returns 500 or times out
                </td>
                <td className="py-3 px-4 text-muted-foreground leading-relaxed">
                  Worker catches the error, marks event as <code className="font-mono text-foreground">RETRYING</code>, and schedules next retry using exponential backoff with jitter.
                </td>
                <td className="py-3 px-4 text-xs font-semibold text-status-success-text">
                  Zero message loss; retries resume automatically on recovery.
                </td>
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="py-3 px-4 font-semibold text-foreground">
                  Worker process terminated mid-dispatch (SIGKILL / power loss)
                </td>
                <td className="py-3 px-4 text-muted-foreground leading-relaxed">
                  The row lease expires automatically after <code className="font-mono text-foreground">LEASE_TIMEOUT_SECONDS</code>. Any running worker reclaims the stale row.
                </td>
                <td className="py-3 px-4 text-xs font-semibold text-status-success-text">
                  Events never get stranded in CLAIMED state.
                </td>
              </tr>
              <tr className="hover:bg-muted/30">
                <td className="py-3 px-4 font-semibold text-foreground">
                  Workshop cancellation with multiple registered members
                </td>
                <td className="py-3 px-4 text-muted-foreground leading-relaxed">
                  Single transaction transitions workshop to CANCELLED and inserts cancellation outbox events for all attendees.
                </td>
                <td className="py-3 px-4 text-xs font-semibold text-status-success-text">
                  All registered members guaranteed notification fan-out.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Commands */}
      <div className="bg-card border border-border rounded-lg p-5 shadow-xs space-y-3">
        <div className="flex items-center space-x-2 text-foreground font-semibold text-xs">
          <Terminal className="w-4 h-4 text-primary" />
          <span>Automated Verification via CLI</span>
        </div>

        <div className="bg-background border border-border rounded-md p-3.5 font-mono text-xs text-muted-foreground space-y-2.5 overflow-x-auto">
          <div>
            <span className="text-foreground font-bold"># 1. Run Complete Automated Pytest Suite</span>
            <div className="text-foreground mt-0.5">.venv\Scripts\pytest tests/ -v</div>
          </div>

          <div className="pt-2 border-t border-border-subtle">
            <span className="text-foreground font-bold"># 2. Check System Health</span>
            <div className="text-foreground mt-0.5">curl http://127.0.0.1:8000/api/v1/health</div>
          </div>

          <div className="pt-2 border-t border-border-subtle">
            <span className="text-foreground font-bold"># 3. Inspect Mock Notification Sink</span>
            <div className="text-foreground mt-0.5">curl http://127.0.0.1:8001/api/v1/simulate/status</div>
          </div>
        </div>
      </div>
    </div>
  );
};
