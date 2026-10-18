'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Lock, Mail, User as UserIcon, Check, AlertCircle } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, initialMode = 'signin' }: AuthModalProps) {
  const { login, signup, error, clearError } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'ORGANIZER' | 'MEMBER'>('MEMBER');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    const cleanEmail = email.trim();
    const cleanPassword = password;
    const cleanName = name.trim();

    if (!cleanEmail) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    if (!cleanPassword) {
      setLocalError('Please enter your password.');
      return;
    }

    if (mode === 'signup') {
      if (!cleanName || cleanName.length < 2) {
        setLocalError('Please enter your full name (minimum 2 characters).');
        return;
      }
      if (cleanPassword.length < 8) {
        setLocalError('Password must be at least 8 characters long.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        await login({ email: cleanEmail, password: cleanPassword });
      } else {
        await signup({
          email: cleanEmail,
          password: cleanPassword,
          name: cleanName,
          role,
        });
      }
      onClose();
    } catch (err: any) {
      const msg = typeof err?.message === 'string' && err.message
        ? err.message
        : typeof err === 'string'
        ? err
        : 'Authentication failed. Please check your details.';
      setLocalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const rawError = localError || error;
  const errorText = typeof rawError === 'string'
    ? rawError
    : rawError && typeof rawError === 'object'
    ? (rawError as any).detail || (rawError as any).message || JSON.stringify(rawError)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-[hsl(var(--border-subtle))]">
          <div className="flex items-center gap-2.5">
            <BrandLogo size="md" />
            <div>
              <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">
                {mode === 'signin' ? 'Sign in to EchoLet' : 'Create an EchoLet Account'}
              </h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Reliable Workshop Registration &amp; Outbox Dispatch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 p-1 bg-[hsl(var(--muted))] rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setLocalError(null);
                clearError();
              }}
              className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                mode === 'signin'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setLocalError(null);
                clearError();
              }}
              className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                mode === 'signup'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              }`}
            >
              New Account
            </button>
          </div>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorText && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[hsl(var(--status-danger-bg))] border border-[hsl(var(--status-danger-border))] text-[hsl(var(--status-danger-text))] text-xs leading-relaxed animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorText}</span>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[hsl(var(--muted-foreground))] absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Henderson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[hsl(var(--muted-foreground))] absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-[hsl(var(--foreground))]">
                Password
              </label>
              {mode === 'signup' && (
                <span className="text-[11px] text-[hsl(var(--muted-foreground))]">
                  Min. 8 characters
                </span>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[hsl(var(--muted-foreground))] absolute left-3 top-2.5" />
              <input
                type="password"
                required
                minLength={mode === 'signup' ? 8 : 1}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] transition-all"
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1.5">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setRole('MEMBER')}
                  className={`p-3 text-left border rounded-xl transition-all ${
                    role === 'MEMBER'
                      ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary-surface))] ring-1 ring-[hsl(var(--primary))]'
                      : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[hsl(var(--foreground))]">Member</span>
                    {role === 'MEMBER' && <Check className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />}
                  </div>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-tight">
                    Browse workshops &amp; register seats.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('ORGANIZER')}
                  className={`p-3 text-left border rounded-xl transition-all ${
                    role === 'ORGANIZER'
                      ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary-surface))] ring-1 ring-[hsl(var(--primary))]'
                      : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[hsl(var(--foreground))]">Organizer</span>
                    {role === 'ORGANIZER' && <Check className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />}
                  </div>
                  <p className="text-[11px] text-[hsl(var(--muted-foreground))] leading-tight">
                    Create workshops &amp; view outbox logs.
                  </p>
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-google-primary w-full mt-2 py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : mode === 'signin' ? (
              'Sign In'
            ) : (
              `Create ${role === 'ORGANIZER' ? 'Organizer' : 'Member'} Account`
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="px-6 py-3.5 bg-[hsl(var(--muted))] border-t border-[hsl(var(--border-subtle))] text-center">
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
            {mode === 'signin' ? (
              <>
                New to EchoLet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setLocalError(null);
                  }}
                  className="text-[hsl(var(--primary))] hover:underline font-medium"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setLocalError(null);
                  }}
                  className="text-[hsl(var(--primary))] hover:underline font-medium"
                >
                  Sign in here
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
