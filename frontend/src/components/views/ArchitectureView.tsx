'use client';

import React from 'react';
import {
  Server,
  Database,
  Cpu,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  ArrowRight,
  RefreshCw,
  Lock,
} from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* View Header */}
      <div className="pb-6 border-b border-border">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          System Architecture &amp; Guarantees
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Technical design of EchoLet&apos;s Transactional Outbox pattern, ACID transaction boundaries, and receiver idempotency.
        </p>
      </div>

      {/* Visual Pipeline / Flow Diagram */}
      <div className="border border-border rounded-lg p-6 bg-card space-y-6">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground uppercase font-mono text-[11px]">
            Data Flow &amp; Transaction Boundaries
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Single-transaction atomicity prevents dual-write inconsistencies between the database and notification network.
          </p>
        </div>

        {/* Visual Node Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {/* Node 1: Client Request */}
          <div className="border border-border rounded-lg p-4 bg-background flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground font-semibold">1. INCOMING REQUEST</span>
                <Server className="w-4 h-4 text-muted-foreground" />
              </div>
              <h3 className="text-xs font-semibold text-foreground mt-1.5">FastAPI REST API</h3>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                Client issues <code className="text-foreground font-mono">POST /workshops/:id/registrations</code>.
              </p>
            </div>
            <div className="pt-2 border-t border-border/60 text-[10px] font-mono text-muted-foreground">
              Validates capacity &amp; schema
            </div>
          </div>

          {/* Node 2: Database ACID Boundary */}
          <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-lg p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  2. ACID BOUNDARY
                </span>
                <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-xs font-semibold text-foreground mt-1.5">Relational Transaction</h3>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                Atomically updates capacity, inserts registration record, and inserts pending outbox record.
              </p>
            </div>
            <div className="pt-2 border-t border-emerald-500/20 text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
              Single DB Commit &bull; Zero Dual-Writes
            </div>
          </div>

          {/* Node 3: Outbox Worker */}
          <div className="border border-border rounded-lg p-4 bg-background flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground font-semibold">3. ASYNC WORKER</span>
                <Cpu className="w-4 h-4 text-muted-foreground" />
              </div>
              <h3 className="text-xs font-semibold text-foreground mt-1.5">Outbox Polling Daemon</h3>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                Claims pending events via lease with row locking. External HTTP calls run outside DB transactions.
              </p>
            </div>
            <div className="pt-2 border-t border-border/60 text-[10px] font-mono text-muted-foreground">
              Lease expiry recovery &bull; Backoff
            </div>
          </div>

          {/* Node 4: Mock Service */}
          <div className="border border-border rounded-lg p-4 bg-background flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground font-semibold">4. NOTIFICATION SINK</span>
                <Mail className="w-4 h-4 text-muted-foreground" />
              </div>
              <h3 className="text-xs font-semibold text-foreground mt-1.5">Mock HTTP Service</h3>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                Evaluates <code className="text-foreground font-mono">Idempotency-Key</code> header to deduplicate duplicate deliveries.
              </p>
            </div>
            <div className="pt-2 border-t border-border/60 text-[10px] font-mono text-muted-foreground">
              Port 8001 &bull; At-least-once safety
            </div>
          </div>
        </div>
      </div>

      {/* Core Architectural Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pillar 1: Atomic Outbox */}
        <div className="border border-border rounded-lg p-5 bg-card space-y-3">
          <div className="flex items-center space-x-2 text-foreground font-semibold text-xs">
            <Lock className="w-4 h-4" />
            <span>Atomic Registration &amp; Outbox</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            In standard microservices, saving a registration and immediately sending an HTTP notification risks dual-write inconsistency: if the network call fails or times out, the registration is committed but no notification is sent. EchoLet eliminates this by persisting both in the exact same database transaction.
          </p>
        </div>

        {/* Pillar 2: Concurrency-Safe Leasing */}
        <div className="border border-border rounded-lg p-5 bg-card space-y-3">
          <div className="flex items-center space-x-2 text-foreground font-semibold text-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>Worker Lease &amp; Concurrency</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Multiple worker instances can run in parallel without double-dispatching notifications. Each worker claims a batch of pending events by acquiring a timestamped lease (<code className="font-mono text-foreground">claimed_by</code>, <code className="font-mono text-foreground">claim_expires_at</code>). If a worker process crashes mid-flight, another worker re-claims the expired lease.
          </p>
        </div>

        {/* Pillar 3: Idempotency Keys */}
        <div className="border border-border rounded-lg p-5 bg-card space-y-3">
          <div className="flex items-center space-x-2 text-foreground font-semibold text-xs">
            <RefreshCw className="w-4 h-4" />
            <span>Deterministic Idempotency</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Because network partitions can cause timeouts even after a notification was processed, at-least-once delivery is transformed into effectively exactly-once delivery via the <code className="font-mono text-foreground">Idempotency-Key: reg_&lt;UUID&gt;</code> header. The receiver records keys and deduplicates re-transmissions.
          </p>
        </div>
      </div>

      {/* Failure Scenario Matrix */}
      <div className="border border-border rounded-lg p-6 bg-card space-y-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Failure Recovery Matrix
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            How the system behaves across unexpected network and hardware faults.
          </p>
        </div>

        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Failure Scenario</th>
                <th className="py-2.5 px-4">System Behavior</th>
                <th className="py-2.5 px-4">Guaranteed Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              <tr className="hover:bg-muted/20">
                <td className="py-3 px-4 font-medium text-foreground">
                  Database transaction rolls back (e.g. capacity exceeded)
                </td>
                <td className="py-3 px-4 text-muted-foreground leading-relaxed">
                  FastAPI endpoint rolls back both the registration and outbox insert atomically.
                </td>
                <td className="py-3 px-4 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                  No phantom notification is ever queued or sent.
                </td>
              </tr>
              <tr className="hover:bg-muted/20">
                <td className="py-3 px-4 font-medium text-foreground">
                  Downstream HTTP service returns 500 or times out
                </td>
                <td className="py-3 px-4 text-muted-foreground leading-relaxed">
                  Worker catches the error, marks event as <code className="font-mono text-foreground">RETRYING</code>, and schedules next retry using exponential backoff with jitter.
                </td>
                <td className="py-3 px-4 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                  Zero message loss; retries resume automatically on recovery.
                </td>
              </tr>
              <tr className="hover:bg-muted/20">
                <td className="py-3 px-4 font-medium text-foreground">
                  Worker process terminated mid-dispatch (SIGKILL / power loss)
                </td>
                <td className="py-3 px-4 text-muted-foreground leading-relaxed">
                  The row lease expires automatically after <code className="font-mono text-foreground">LEASE_TIMEOUT_SECONDS</code>. Any running worker reclaims the stale row.
                </td>
                <td className="py-3 px-4 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                  Events never get stranded in CLAIMED state.
                </td>
              </tr>
              <tr className="hover:bg-muted/20">
                <td className="py-3 px-4 font-medium text-foreground">
                  Workshop cancellation with multiple registered members
                </td>
                <td className="py-3 px-4 text-muted-foreground leading-relaxed">
                  Single transaction transitions workshop to CANCELLED and inserts cancellation outbox events for all attendees.
                </td>
                <td className="py-3 px-4 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                  All registered members guaranteed notification fan-out.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Verification Commands Snippet */}
      <div className="border border-border rounded-lg p-6 bg-card space-y-4">
        <div className="flex items-center space-x-2 text-foreground font-semibold text-xs">
          <Terminal className="w-4 h-4" />
          <span>Automated Verification via CLI</span>
        </div>

        <div className="bg-background border border-border rounded-md p-4 font-mono text-[11px] text-muted-foreground space-y-3 overflow-x-auto">
          <div>
            <span className="text-foreground font-bold"># 1. Run Comprehensive Pytest Suite (Unit + Integration + Recovery)</span>
            <div className="text-foreground mt-1">.venv\Scripts\pytest tests/ -v</div>
          </div>

          <div className="pt-2 border-t border-border/40">
            <span className="text-foreground font-bold"># 2. Check System Health Endpoint</span>
            <div className="text-foreground mt-1">curl http://127.0.0.1:8000/api/v1/health</div>
          </div>

          <div className="pt-2 border-t border-border/40">
            <span className="text-foreground font-bold"># 3. Inspect Mock Notification Service Status &amp; Deliveries</span>
            <div className="text-foreground mt-1">curl http://127.0.0.1:8001/api/v1/simulate/status</div>
          </div>
        </div>
      </div>
    </div>
  );
};
