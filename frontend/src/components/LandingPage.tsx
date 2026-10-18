'use client';

import React from 'react';
import {
  ShieldCheck,
  Zap,
  Repeat,
  Layers,
  Lock,
  ArrowRight,
  Database,
  Radio,
  CheckCircle2,
  Server,
  FileCode,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface LandingPageProps {
  onOpenAuth: (mode: 'signin' | 'signup') => void;
}

export function LandingPage({ onOpenAuth }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[hsl(var(--card))]/90 backdrop-blur-md border-b border-[hsl(var(--border))]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" />
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-tight text-[hsl(var(--foreground))]">
                EchoLet
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border-subtle))]">
                v2.0 Enterprise
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenAuth('signin')}
              className="btn-google-secondary text-xs px-3.5 py-1.5 font-medium"
            >
              Sign In
            </button>
            <button
              onClick={() => onOpenAuth('signup')}
              className="btn-google-primary text-xs px-3.5 py-1.5 font-semibold"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center flex-1">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--primary-surface))] border border-[hsl(var(--primary-surface-border))] text-[hsl(var(--primary))] text-xs font-medium mb-6 animate-in fade-in">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          <span>Transactional Outbox • Zero Message Loss</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[hsl(var(--foreground))] leading-tight sm:leading-snug">
          Reliable Event Delivery for{' '}
          <span className="text-[hsl(var(--primary))]">High-Throughput</span> Workshops
        </h1>

        <p className="mt-5 text-sm sm:text-base text-[hsl(var(--muted-foreground))] max-w-2xl mx-auto leading-relaxed">
          A production-grade workshop registration and notification platform. Engineered with
          PostgreSQL ACID transactions, outbox row leasing, deterministic idempotency keys, and
          automatic crash recovery.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onOpenAuth('signup')}
            className="btn-google-primary w-full sm:w-auto px-6 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2"
          >
            <span>Create Your Account</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onOpenAuth('signin')}
            className="btn-google-secondary w-full sm:w-auto px-6 py-2.5 text-xs sm:text-sm font-medium"
          >
            Sign In with Existing Account
          </button>
        </div>

        {/* Key Guarantees Row */}
        <div className="mt-12 pt-8 border-t border-[hsl(var(--border-subtle))] grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
          <div className="p-3">
            <p className="text-lg font-bold text-[hsl(var(--foreground))]">100%</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Atomicity Guarantee</p>
          </div>
          <div className="p-3">
            <p className="text-lg font-bold text-[hsl(var(--foreground))]">0 Loss</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Transactional Outbox</p>
          </div>
          <div className="p-3">
            <p className="text-lg font-bold text-[hsl(var(--foreground))]">UUIDv5</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Receiver Idempotency</p>
          </div>
          <div className="p-3">
            <p className="text-lg font-bold text-[hsl(var(--foreground))]">RBAC</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Data Isolation</p>
          </div>
        </div>

        {/* Features / Architecture Showcase */}
        <div className="mt-16 text-left">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-6">
            System Reliability & Architecture
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="google-card p-5 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
              <div className="w-9 h-9 rounded-xl bg-[hsl(var(--primary-surface))] text-[hsl(var(--primary))] flex items-center justify-center mb-3">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-1.5">
                Dual-Write Safety
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                Registrations and notification events commit inside the exact same database
                transaction. Network crashes never leave orphaned state.
              </p>
            </div>

            <div className="google-card p-5 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
              <div className="w-9 h-9 rounded-xl bg-[hsl(var(--primary-surface))] text-[hsl(var(--primary))] flex items-center justify-center mb-3">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-1.5">
                Worker Row-Leasing
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                Background worker claims pending outbox events using row locks and lease timeouts.
                Crashed workers automatically yield jobs to live runners.
              </p>
            </div>

            <div className="google-card p-5 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
              <div className="w-9 h-9 rounded-xl bg-[hsl(var(--primary-surface))] text-[hsl(var(--primary))] flex items-center justify-center mb-3">
                <Repeat className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-1.5">
                Exponential Retries & Jitter
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                Transient 500 downstream errors trigger exponential backoff retry schedules,
                preventing thundering herd attacks during service recovery.
              </p>
            </div>

            <div className="google-card p-5 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
              <div className="w-9 h-9 rounded-xl bg-[hsl(var(--primary-surface))] text-[hsl(var(--primary))] flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-1.5">
                Receiver Deduplication
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                Deterministic UUIDv5 idempotency keys ensure the downstream notification mock or
                email provider never dispatches duplicate notifications.
              </p>
            </div>

            <div className="google-card p-5 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
              <div className="w-9 h-9 rounded-xl bg-[hsl(var(--primary-surface))] text-[hsl(var(--primary))] flex items-center justify-center mb-3">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-1.5">
                Strict RBAC & Data Isolation
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                Independent Organizer and Member roles prevent Insecure Direct Object Reference
                (IDOR) tampering across workshops and attendees.
              </p>
            </div>

            <div className="google-card p-5 rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))]">
              <div className="w-9 h-9 rounded-xl bg-[hsl(var(--primary-surface))] text-[hsl(var(--primary))] flex items-center justify-center mb-3">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-1.5">
                Live Fault Simulation
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                Built-in chaos engineering harness allows organizers to inject latencies, mock
                timeouts, and targeted HTTP 500 errors in real time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[hsl(var(--muted-foreground))]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[hsl(var(--foreground))]">EchoLet</span>
            <span>—</span>
            <span>GDG Tech Wildcard Backend Development Task 2</span>
          </div>
          <div className="flex items-center gap-4">
            <span>FastAPI</span>
            <span>•</span>
            <span>PostgreSQL / SQLite</span>
            <span>•</span>
            <span>Next.js 15</span>
            <span>•</span>
            <span>Transactional Outbox</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
