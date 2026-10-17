'use client';

import React, { useState } from 'react';
import { Workshop, createWorkshop, cancelWorkshop, registerMember } from '../lib/api';
import { Plus, Users, Calendar, AlertCircle, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

interface WorkshopSectionProps {
  workshops: Workshop[];
  onRefresh: () => void;
  showMessage: (msg: string, isError?: boolean) => void;
}

export const WorkshopSection: React.FC<WorkshopSectionProps> = ({
  workshops,
  onRefresh,
  showMessage,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Create Workshop Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState('');
  const [capacity, setCapacity] = useState(20);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Register Member Form State
  const [memberId, setMemberId] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !schedule || capacity <= 0) {
      showMessage('Please provide all required workshop fields.', true);
      return;
    }
    setIsSubmitting(true);
    try {
      await createWorkshop({
        title,
        description: description || undefined,
        schedule: new Date(schedule).toISOString(),
        capacity: Number(capacity),
      });
      showMessage('Workshop created successfully!');
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setSchedule('');
      onRefresh();
    } catch (err: any) {
      showMessage(err.message, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkshop) return;
    if (!memberId || !memberName || !memberEmail) {
      showMessage('All member fields are required.', true);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await registerMember(selectedWorkshop.id, {
        member_id: memberId,
        member_name: memberName,
        member_email: memberEmail,
      });
      showMessage(`Registered successfully! Outbox confirmation event: ${res.notification_id?.slice(0, 8)}... (PENDING)`);
      setShowRegisterModal(false);
      setMemberId('');
      setMemberName('');
      setMemberEmail('');
      onRefresh();
    } catch (err: any) {
      showMessage(err.message, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelWorkshop = async (workshop: Workshop) => {
    if (!confirm(`Are you sure you want to cancel '${workshop.title}'? This will transactionally fan out cancellation notifications to all registered members.`)) {
      return;
    }
    try {
      const res = await cancelWorkshop(workshop.id);
      showMessage(`Workshop cancelled! ${res.notifications_queued} cancellation notification(s) queued in outbox.`);
      onRefresh();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Workshops</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage scheduled workshops, enforce capacity under concurrency, and register members.
          </p>
        </div>
        <button
          onClick={() => {
            // Set default future date (tomorrow)
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 2);
            tomorrow.setHours(14, 0, 0, 0);
            setSchedule(tomorrow.toISOString().slice(0, 16));
            setShowCreateModal(true);
          }}
          className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Workshop</span>
        </button>
      </div>

      {/* Workshop Grid */}
      {workshops.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-sm font-medium text-foreground">No workshops scheduled</h3>
          <p className="text-xs text-muted-foreground mt-1">Create your first workshop to begin testing registration and notifications.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workshops.map((w) => {
            const isCancelled = w.status === 'CANCELLED';
            const isFull = w.registered_count >= w.capacity;
            const fillPct = Math.min(100, Math.round((w.registered_count / w.capacity) * 100));

            return (
              <div
                key={w.id}
                className="border border-border rounded-lg p-5 bg-card flex flex-col justify-between hover:border-foreground/30 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-foreground text-sm tracking-tight line-clamp-1">
                      {w.title}
                    </h3>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        isCancelled
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          : isFull
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      }`}
                    >
                      {w.status}
                    </span>
                  </div>

                  {w.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{w.description}</p>
                  )}

                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5 mr-2 shrink-0" />
                      <span className="font-mono text-[11px]">
                        {new Date(w.schedule).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-muted-foreground">
                      <div className="flex items-center">
                        <Users className="w-3.5 h-3.5 mr-2 shrink-0" />
                        <span>Capacity</span>
                      </div>
                      <span className="font-mono text-[11px] text-foreground">
                        {w.registered_count} / {w.capacity} ({w.available_capacity} left)
                      </span>
                    </div>

                    {/* Capacity Bar */}
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isCancelled ? 'bg-muted-foreground' : isFull ? 'bg-amber-500' : 'bg-foreground'
                        }`}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 pt-3 border-t border-border flex items-center justify-between gap-2">
                  <button
                    onClick={() => {
                      setSelectedWorkshop(w);
                      setShowRegisterModal(true);
                    }}
                    disabled={isCancelled || isFull}
                    className="inline-flex items-center space-x-1 text-xs font-medium px-2.5 py-1 rounded border border-border bg-muted/30 hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <span>Register</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  {!isCancelled && (
                    <button
                      onClick={() => handleCancelWorkshop(w)}
                      className="text-xs text-muted-foreground hover:text-rose-500 transition-colors"
                    >
                      Cancel Workshop
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Workshop Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-semibold text-foreground">Create Workshop</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Specify workshop schedule, details, and seating capacity.</p>

            <form onSubmit={handleCreate} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1 font-medium">Workshop Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Distributed Consensus & Raft"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-medium">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of the workshop..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1 font-medium">Schedule (Future UTC) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    className="w-full bg-background border border-border rounded-md px-2.5 py-2 text-foreground font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-foreground"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1 font-medium">Capacity (Max Seats) *</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
                  />
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-border flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-foreground text-background hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Workshop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Member Modal */}
      {showRegisterModal && selectedWorkshop && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-semibold text-foreground">Register Member</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Registering for <span className="text-foreground font-medium">{selectedWorkshop.title}</span>.
            </p>

            <form onSubmit={handleRegister} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1 font-medium">Member ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., mem-402"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-medium">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., John Doe"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-medium">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="john.doe@example.com"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>

              <div className="rounded-md bg-muted/40 p-2.5 text-[11px] text-muted-foreground border border-border">
                <span className="font-semibold text-foreground">Note:</span> Registration commits atomically with an outbox event. The API returns immediately without waiting for HTTP delivery.
              </div>

              <div className="mt-5 pt-3 border-t border-border flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-foreground text-background hover:opacity-90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
