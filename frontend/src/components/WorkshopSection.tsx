
'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Workshop, createWorkshop, cancelWorkshop, registerMember } from '../lib/api';
import { Plus, Users, Calendar, ArrowRight } from 'lucide-react';

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
  const { user } = useAuth();
  const isOrganizer = user?.role === 'ORGANIZER';

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState('');
  const [capacity, setCapacity] = useState(20);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !schedule || capacity <= 0) {
      showMessage('Please provide all required workshop fields.', true);
      return;
    }
    setIsSubmitting(true);
    try {
      await createWorkshop({
        title: title.trim(),
        description: description.trim() || undefined,
        schedule: new Date(schedule).toISOString(),
        capacity: Number(capacity),
      });
      showMessage('Workshop created successfully!');
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setSchedule('');
      onRefresh();
    } catch (err: unknown) {
      showMessage(err instanceof Error ? err.message : 'Unable to create workshop.', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkshop || isOrganizer) return;
    if (!memberId.trim() || !memberName.trim() || !memberEmail.trim()) {
      showMessage('All member fields are required.', true);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await registerMember(selectedWorkshop.id, {
        member_id: memberId.trim(),
        member_name: memberName.trim(),
        member_email: memberEmail.trim(),
      });
      showMessage(`Registered successfully! Outbox confirmation event: ${res.notification_id?.slice(0, 8) ?? 'created'} (PENDING)`);
      setShowRegisterModal(false);
      setMemberId('');
      setMemberName('');
      setMemberEmail('');
      onRefresh();
    } catch (err: unknown) {
      showMessage(err instanceof Error ? err.message : 'Unable to register member.', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelWorkshop = async (workshop: Workshop) => {
    if (!confirm(`Are you sure you want to cancel '${workshop.title}'? This may queue cancellation notifications for registered members.`)) {
      return;
    }
    try {
      const res = await cancelWorkshop(workshop.id);
      showMessage(`Workshop cancelled! ${res.notifications_queued} cancellation notification(s) queued in outbox.`);
      onRefresh();
    } catch (err: unknown) {
      showMessage(err instanceof Error ? err.message : 'Unable to cancel workshop.', true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Workshops</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isOrganizer
              ? 'Create and manage workshops and monitor attendance.'
              : 'Browse scheduled workshops and register to attend.'}
          </p>
        </div>
        {isOrganizer && (
          <button
            type="button"
            onClick={() => {
              const futureDate = new Date();
              futureDate.setDate(futureDate.getDate() + 2);
              futureDate.setHours(14, 0, 0, 0);
              setSchedule(
                `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}T${String(futureDate.getHours()).padStart(2, '0')}:${String(futureDate.getMinutes()).padStart(2, '0')}`
              );
              setShowCreateModal(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium bg-[#1a73e8] text-white hover:bg-[#1765cc] transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Workshop</span>
          </button>
        )}
      </div>

      {workshops.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <Calendar className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-sm font-medium text-foreground">No workshops scheduled</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {isOrganizer
              ? 'Create your first workshop to begin testing registration and notifications.'
              : 'There are no workshops available right now. Please check again later.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workshops.map((workshop) => {
            const isCancelled = workshop.status === 'CANCELLED';
            const isFull = workshop.registered_count >= workshop.capacity;
            const fillPct = workshop.capacity > 0
              ? Math.min(100, Math.round((workshop.registered_count / workshop.capacity) * 100))
              : 0;

            return (
              <div
                key={workshop.id}
                className="border border-border rounded-xl p-5 bg-card flex flex-col justify-between transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm hover:border-[#1a73e8]/30"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-foreground text-sm tracking-tight line-clamp-1">
                      {workshop.title}
                    </h3>
                    <span className={`shrink-0 text-[10px] font-medium px-2 py-1 rounded-full border ${isCancelled
                      ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                      : isFull
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      }`}>
                      {workshop.status}
                    </span>
                  </div>

                  <p className={`text-xs mt-2 line-clamp-2 ${workshop.description ? 'text-muted-foreground' : 'text-muted-foreground/70 italic'
                    }`}>
                    {workshop.description || 'No description provided.'}
                  </p>

                  <div className="mt-4 space-y-3 text-xs">
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-2 shrink-0" />
                      <span>
                        {new Date(workshop.schedule).toLocaleString(undefined, {
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
                        <Users className="w-4 h-4 mr-2 shrink-0" />
                        <span>Attendance</span>
                      </div>
                      <span className="font-medium text-foreground">
                        {workshop.registered_count} / {workshop.capacity} seats ({workshop.available_capacity} free)
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${isCancelled ? 'bg-muted-foreground' : isFull ? 'bg-amber-500' : 'bg-[#1a73e8]'
                          }`}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-border flex items-center justify-between gap-2">
                  {!isOrganizer && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedWorkshop(workshop);
                        setShowRegisterModal(true);
                      }}
                      disabled={isCancelled || isFull}
                      className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-[#1a73e8] text-white hover:bg-[#1765cc] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0"
                    >
                      <span>Register</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className="flex-1" />

                  {isOrganizer && !isCancelled && (
                    <button
                      type="button"
                      onClick={() => handleCancelWorkshop(workshop)}
                      className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && isOrganizer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">Create Workshop</h3>
            <p className="text-sm text-muted-foreground mt-1">Enter the workshop details and seating capacity.</p>

            <form onSubmit={handleCreate} className="mt-5 space-y-4 text-sm">
              <div>
                <label className="block text-muted-foreground mb-1.5 font-medium">Workshop Title *</label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  placeholder="e.g., Distributed Systems Workshop"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1.5 font-medium">Description</label>
                <textarea
                  rows={3}
                  maxLength={2000}
                  placeholder="Brief workshop description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground mb-1.5 font-medium">Date and Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    className="w-full min-w-0 bg-background border border-border rounded-lg px-2 py-2.5 text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1.5 font-medium">Capacity *</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1a73e8] text-white hover:bg-[#1765cc] disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Workshop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRegisterModal && selectedWorkshop && !isOrganizer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">Register for Workshop</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Workshop: <span className="font-medium text-foreground">{selectedWorkshop.title}</span>
            </p>

            <form onSubmit={handleRegister} className="mt-5 space-y-4 text-sm">
              <div>
                <label className="block text-muted-foreground mb-1.5 font-medium">Member ID *</label>
                <input
                  type="text"
                  required
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  placeholder="e.g., mem-402"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1.5 font-medium">Full Name *</label>
                <input
                  type="text"
                  required
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1.5 font-medium">Email Address *</label>
                <input
                  type="email"
                  required
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                />
              </div>

              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground border border-border">
                Your registration is saved before the confirmation notification is delivered asynchronously.
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1a73e8] text-white hover:bg-[#1765cc] disabled:opacity-50"
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
