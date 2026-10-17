'use client';

import React, { useState } from 'react';
import {
  Workshop,
  Registration,
  createWorkshop,
  cancelWorkshop,
  registerMember,
  fetchRegistrations,
} from '../../lib/api';
import {
  Plus,
  Calendar,
  Users,
  Search,
  ArrowRight,
  Info,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mail,
  UserCheck,
  Ban,
} from 'lucide-react';

interface WorkshopsViewProps {
  workshops: Workshop[];
  onRefresh: () => void;
  showMessage: (msg: string, isError?: boolean) => void;
  showCreateModalInitial?: boolean;
}

export const WorkshopsView: React.FC<WorkshopsViewProps> = ({
  workshops,
  onRefresh,
  showMessage,
  showCreateModalInitial = false,
}) => {
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(showCreateModalInitial);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [detailWorkshop, setDetailWorkshop] = useState<Workshop | null>(null);
  const [detailAttendees, setDetailAttendees] = useState<Registration[]>([]);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SCHEDULED' | 'CANCELLED'>('ALL');

  // Create Workshop Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [schedule, setSchedule] = useState('');
  const [capacity, setCapacity] = useState(25);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Register Member Form State
  const [memberId, setMemberId] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [isSubmittingRegister, setIsSubmittingRegister] = useState(false);

  const openCreateModal = () => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    defaultDate.setHours(14, 0, 0, 0);
    setSchedule(defaultDate.toISOString().slice(0, 16));
    setShowCreateModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !schedule || capacity <= 0) {
      showMessage('Please provide workshop title, schedule, and valid capacity.', true);
      return;
    }
    setIsSubmittingCreate(true);
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
      setCapacity(25);
      onRefresh();
    } catch (err: any) {
      showMessage(err.message, true);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkshop) return;
    if (!memberId.trim() || !memberName.trim() || !memberEmail.trim()) {
      showMessage('All member registration fields are required.', true);
      return;
    }
    setIsSubmittingRegister(true);
    try {
      const res = await registerMember(selectedWorkshop.id, {
        member_id: memberId.trim(),
        member_name: memberName.trim(),
        member_email: memberEmail.trim(),
      });
      showMessage(`Registration successful! Outbox confirmation queued: ${res.notification_id?.slice(0, 8)}...`);
      setShowRegisterModal(false);
      setMemberId('');
      setMemberName('');
      setMemberEmail('');
      onRefresh();
      // If detail view open for this workshop, refresh attendees
      if (detailWorkshop?.id === selectedWorkshop.id) {
        loadAttendees(selectedWorkshop.id);
      }
    } catch (err: any) {
      showMessage(err.message, true);
    } finally {
      setIsSubmittingRegister(false);
    }
  };

  const handleCancelWorkshop = async (workshop: Workshop) => {
    if (
      !confirm(
        `Are you sure you want to cancel '${workshop.title}'? This will transactionally fan out cancellation notifications to all registered members.`
      )
    ) {
      return;
    }
    try {
      const res = await cancelWorkshop(workshop.id);
      showMessage(`Workshop cancelled! ${res.notifications_queued} cancellation notification(s) queued in outbox.`);
      onRefresh();
      if (detailWorkshop?.id === workshop.id) {
        setDetailWorkshop((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
      }
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const loadAttendees = async (workshopId: string) => {
    setIsLoadingAttendees(true);
    try {
      const list = await fetchRegistrations(workshopId);
      setDetailAttendees(list);
    } catch (err) {
      console.error('Failed to load attendees:', err);
      setDetailAttendees([]);
    } finally {
      setIsLoadingAttendees(false);
    }
  };

  const openDetailView = (workshop: Workshop) => {
    setDetailWorkshop(workshop);
    loadAttendees(workshop.id);
  };

  const filteredWorkshops = workshops.filter((w) => {
    const matchesSearch =
      w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.description && w.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus =
      statusFilter === 'ALL' || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Workshops
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage scheduled workshops, enforce race-condition-safe capacity, and track member attendance.
          </p>
        </div>
        <div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-md text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Workshop</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border border-border rounded-lg p-2.5 bg-card">
        <div className="flex items-center space-x-1.5">
          {(['ALL', 'SCHEDULED', 'CANCELLED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`text-xs px-3 py-1 rounded-md font-mono transition-colors ${
                statusFilter === st
                  ? 'bg-foreground text-background font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search workshops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 bg-background border border-border rounded-md pl-8 pr-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
      </div>

      {/* Workshop Grid or Empty State */}
      {filteredWorkshops.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-16 text-center bg-card/40">
          <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-60" />
          <h3 className="text-sm font-semibold text-foreground">No workshops found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {workshops.length === 0
              ? 'No workshops have been created yet. Create your first workshop to begin registering members and generating transactional outbox events.'
              : 'No workshops match the selected filter or search query.'}
          </p>
          {workshops.length === 0 && (
            <button
              onClick={openCreateModal}
              className="mt-4 inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-md text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Workshop</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkshops.map((w) => {
            const isCancelled = w.status === 'CANCELLED';
            const isFull = w.registered_count >= w.capacity;
            const fillPct = Math.min(100, Math.round((w.registered_count / w.capacity) * 100));

            return (
              <div
                key={w.id}
                className="border border-border rounded-lg p-5 bg-card flex flex-col justify-between hover:border-foreground/40 transition-all duration-150 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground text-sm tracking-tight line-clamp-1">
                      {w.title}
                    </h3>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${
                        isCancelled
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          : isFull
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {w.status}
                    </span>
                  </div>

                  {w.description ? (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                      {w.description}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic mt-2">No description provided.</p>
                  )}

                  <div className="mt-4 space-y-2.5 text-xs">
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
                      <span className="font-mono text-[11px] text-foreground font-medium">
                        {w.registered_count} / {w.capacity} seats ({w.available_capacity} free)
                      </span>
                    </div>

                    {/* Capacity Visual Meter */}
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isCancelled
                            ? 'bg-muted-foreground/40'
                            : isFull
                            ? 'bg-amber-500'
                            : 'bg-foreground'
                        }`}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3.5 border-t border-border flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedWorkshop(w);
                        setShowRegisterModal(true);
                      }}
                      disabled={isCancelled || isFull}
                      className="inline-flex items-center space-x-1 text-xs font-medium px-2.5 py-1 rounded border border-border bg-background hover:bg-muted text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <span>Register</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => openDetailView(w)}
                      className="inline-flex items-center space-x-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 transition-colors"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                  </div>

                  {!isCancelled && (
                    <button
                      onClick={() => handleCancelWorkshop(w)}
                      className="text-xs text-muted-foreground hover:text-rose-500 transition-colors"
                      title="Cancel workshop and notify members"
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

      {/* Workshop Detail Slide-over / Modal */}
      {detailWorkshop && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-xl w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-semibold text-foreground tracking-tight">
                    {detailWorkshop.title}
                  </h3>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      detailWorkshop.status === 'CANCELLED'
                        ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    }`}
                  >
                    {detailWorkshop.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Workshop ID: {detailWorkshop.id}</p>
              </div>
              <button
                onClick={() => setDetailWorkshop(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4 overflow-y-auto flex-1 text-xs">
              {detailWorkshop.description && (
                <div>
                  <span className="text-muted-foreground block text-[11px] font-mono">Description</span>
                  <p className="text-foreground mt-1">{detailWorkshop.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 p-3 rounded border border-border bg-background font-mono text-[11px]">
                <div>
                  <span className="text-muted-foreground block">Schedule (UTC)</span>
                  <span className="text-foreground font-semibold mt-0.5 block">
                    {new Date(detailWorkshop.schedule).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Capacity</span>
                  <span className="text-foreground font-semibold mt-0.5 block">
                    {detailWorkshop.registered_count} / {detailWorkshop.capacity} seats ({detailWorkshop.available_capacity} free)
                  </span>
                </div>
              </div>

              {/* Attendee Roster */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground text-xs">Registered Attendees</span>
                  <span className="font-mono text-muted-foreground text-[11px]">
                    {detailAttendees.length} member{detailAttendees.length === 1 ? '' : 's'}
                  </span>
                </div>

                {isLoadingAttendees ? (
                  <div className="p-6 text-center text-muted-foreground font-mono text-xs">
                    Loading attendee roster...
                  </div>
                ) : detailAttendees.length === 0 ? (
                  <div className="p-4 rounded border border-dashed border-border text-center text-muted-foreground text-xs">
                    No attendees registered yet for this workshop.
                  </div>
                ) : (
                  <div className="border border-border rounded-md overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono text-[11px]">
                        <tr>
                          <th className="py-2 px-3">Member</th>
                          <th className="py-2 px-3">Email</th>
                          <th className="py-2 px-3">Registered At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border font-mono text-[11px]">
                        {detailAttendees.map((att) => (
                          <tr key={att.id} className="hover:bg-muted/20">
                            <td className="py-2 px-3 text-foreground font-medium">{att.member_name}</td>
                            <td className="py-2 px-3 text-muted-foreground">{att.member_email}</td>
                            <td className="py-2 px-3 text-muted-foreground">
                              {new Date(att.registered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-border flex items-center justify-between">
              <div>
                {detailWorkshop.status !== 'CANCELLED' && (
                  <button
                    onClick={() => handleCancelWorkshop(detailWorkshop)}
                    className="text-xs text-rose-500 hover:text-rose-600 transition-colors font-medium flex items-center space-x-1"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Cancel Workshop</span>
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setDetailWorkshop(null)}
                  className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground"
                >
                  Close
                </button>
                {detailWorkshop.status !== 'CANCELLED' && detailWorkshop.available_capacity > 0 && (
                  <button
                    onClick={() => {
                      setSelectedWorkshop(detailWorkshop);
                      setShowRegisterModal(true);
                    }}
                    className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-foreground text-background hover:opacity-90"
                  >
                    Register Member
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Workshop Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">Create Workshop</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Define the workshop schedule and enforce atomic registration limits.
            </p>

            <form onSubmit={handleCreate} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1 font-medium">Workshop Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Transactional Outbox Deep Dive"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-medium">Description</label>
                <textarea
                  rows={2}
                  placeholder="Curriculum overview and objectives..."
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
                  disabled={isSubmittingCreate}
                  className="px-4 py-1.5 rounded-md text-xs font-semibold bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isSubmittingCreate ? 'Creating...' : 'Create Workshop'}
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
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">Register Member</h3>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Registering for <span className="text-foreground font-semibold">{selectedWorkshop.title}</span>.
            </p>

            <form onSubmit={handleRegister} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1 font-medium">Member ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., mem-501"
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
                  placeholder="e.g., Sarah Chen"
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
                  placeholder="sarah.chen@example.com"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>

              <div className="rounded-md bg-muted/40 p-2.5 text-[11px] text-muted-foreground border border-border leading-relaxed">
                <span className="font-semibold text-foreground">Transactional Guarantees:</span> Member registration and the pending outbox notification commit within the same ACID database transaction.
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
                  disabled={isSubmittingRegister}
                  className="px-4 py-1.5 rounded-md text-xs font-semibold bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {isSubmittingRegister ? 'Registering...' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
