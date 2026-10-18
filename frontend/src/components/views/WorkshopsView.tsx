'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
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
  Ban,
  UserPlus,
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
  const { user } = useAuth();
  const isOrganizer = user?.role === 'ORGANIZER';

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
      showMessage('Please provide a workshop title, schedule, and valid capacity.', true);
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
      showMessage(`Registration successful! Outbox notification queued: ${res.notification_id?.slice(0, 8)}...`);
      setShowRegisterModal(false);
      setMemberId('');
      setMemberName('');
      setMemberEmail('');
      onRefresh();
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
        `Are you sure you want to cancel "${workshop.title}"? This will transactionally fan out cancellation notifications to all registered members.`
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
    // For members, strictly exclude cancelled workshops from the available list
    if (!isOrganizer && w.status === 'CANCELLED') {
      return false;
    }
    const matchesSearch =
      w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.description && w.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus =
      statusFilter === 'ALL' || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header: Google-style title, description, and prominent Blue action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Workshops
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isOrganizer
              ? 'Schedule workshops, enforce atomic capacity limits under concurrency, and track registrations.'
              : 'Browse scheduled engineering workshops and reserve your seat with instant confirmation.'}
          </p>
        </div>
        {isOrganizer && (
          <div>
            <button
              onClick={openCreateModal}
              className="btn-google-primary px-4 py-2 text-sm font-semibold flex items-center space-x-2"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Workshop</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border rounded-lg p-3 shadow-xs">
        {/* Google-style Filter Chips for Organizers */}
        {isOrganizer ? (
          <div className="flex items-center space-x-1.5">
            {(['ALL', 'SCHEDULED', 'CANCELLED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  statusFilter === st
                    ? 'bg-primary-surface text-primary border-primary-surface-border font-semibold shadow-2xs'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {st === 'ALL' ? 'All Workshops' : st === 'SCHEDULED' ? 'Scheduled' : 'Cancelled'}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-xs font-medium text-muted-foreground">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary-surface text-primary border border-primary-surface-border font-semibold">
              Available Sessions ({filteredWorkshops.length})
            </span>
          </div>
        )}

        {/* Functional Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search workshops by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-72 bg-background border border-border rounded-md pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
      </div>

      {/* Workshop Grid or Empty State */}
      {filteredWorkshops.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center bg-card/60">
          <Calendar className="w-10 h-10 mx-auto text-muted-foreground mb-3 opacity-60" />
          <h3 className="text-sm font-semibold text-foreground">
            {workshops.length === 0 ? 'No workshops created yet' : 'No workshops match filter'}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
            {workshops.length === 0
              ? isOrganizer
                ? 'You have not scheduled any workshops yet. Click "Create your first workshop" to publish a session and configure capacity.'
                : 'No workshops are currently scheduled. Check back soon for upcoming sessions.'
              : 'No workshops match the selected status or search query.'}
          </p>
          {workshops.length === 0 && isOrganizer && (
            <button
              onClick={openCreateModal}
              className="mt-4 btn-google-primary inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create your first workshop</span>
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
                className="google-card bg-card border border-border rounded-xl p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Card Title & Status Badge */}
                  <div className="flex items-start justify-between gap-2.5">
                    <h3 className="font-semibold text-foreground text-sm tracking-tight line-clamp-1">
                      {w.title}
                    </h3>
                    <span
                      className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border shrink-0 ${
                        isCancelled
                          ? 'bg-status-danger-bg text-status-danger-text border-status-danger-border'
                          : isFull
                          ? 'bg-status-warning-bg text-status-warning-text border-status-warning-border'
                          : 'bg-status-success-bg text-status-success-text border-status-success-border'
                      }`}
                    >
                      {w.status}
                    </span>
                  </div>

                  {/* Description */}
                  {w.description ? (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                      {w.description}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic mt-2">No description provided.</p>
                  )}

                  {/* Schedule & Capacity Metadata */}
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center text-foreground font-medium">
                      <Calendar className="w-3.5 h-3.5 mr-2 text-muted-foreground shrink-0" />
                      <span>
                        {new Date(w.schedule).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center text-muted-foreground">
                        <Users className="w-3.5 h-3.5 mr-2 shrink-0" />
                        <span>Attendance</span>
                      </div>
                      <span className="font-medium text-foreground">
                        {w.registered_count} / {w.capacity} seats ({w.available_capacity} free)
                      </span>
                    </div>

                    {/* Google-style Capacity Progress Meter */}
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-1">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isCancelled
                            ? 'bg-muted-foreground/40'
                            : isFull
                            ? 'bg-amber-500'
                            : 'bg-primary'
                        }`}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-5 pt-3.5 border-t border-border-subtle flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedWorkshop(w);
                        setMemberName(user?.name || '');
                        setMemberEmail(user?.email || '');
                        setMemberId(user?.id ? `mem_${user.id.slice(0, 8)}` : `mem_${Math.random().toString(36).substring(2, 7)}`);
                        setShowRegisterModal(true);
                      }}
                      disabled={isCancelled || isFull}
                      className="btn-google-primary px-3.5 py-1.5 text-xs font-semibold inline-flex items-center space-x-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{isFull ? 'Sold Out' : isCancelled ? 'Cancelled' : 'Register'}</span>
                    </button>

                    <button
                      onClick={() => openDetailView(w)}
                      className="btn-google-secondary px-3 py-1.5 text-xs font-medium inline-flex items-center space-x-1"
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                  </div>

                  {!isCancelled && isOrganizer && (
                    <button
                      onClick={() => handleCancelWorkshop(w)}
                      className="text-xs font-medium text-status-danger-text hover:underline transition-colors px-1"
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-lg w-full p-6 shadow-lg animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-border">
              <div>
                <div className="flex items-center space-x-2.5">
                  <h3 className="text-base font-semibold text-foreground tracking-tight">
                    {detailWorkshop.title}
                  </h3>
                  <span
                    className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                      detailWorkshop.status === 'CANCELLED'
                        ? 'bg-status-danger-bg text-status-danger-text border-status-danger-border'
                        : 'bg-status-success-bg text-status-success-text border-status-success-border'
                    }`}
                  >
                    {detailWorkshop.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-1">ID: {detailWorkshop.id}</p>
              </div>
              <button
                onClick={() => setDetailWorkshop(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4 overflow-y-auto flex-1 text-xs">
              {detailWorkshop.description && (
                <div>
                  <span className="text-muted-foreground block text-xs font-medium">Description</span>
                  <p className="text-foreground mt-1 leading-relaxed">{detailWorkshop.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-border bg-muted/40">
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium">Schedule (UTC)</span>
                  <span className="text-foreground font-semibold mt-0.5 block text-xs">
                    {new Date(detailWorkshop.schedule).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium">Capacity</span>
                  <span className="text-foreground font-semibold mt-0.5 block text-xs">
                    {detailWorkshop.registered_count} / {detailWorkshop.capacity} seats ({detailWorkshop.available_capacity} free)
                  </span>
                </div>
              </div>

              {/* Attendee Roster */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-foreground text-xs">Registered Attendees</span>
                  <span className="text-muted-foreground text-xs font-medium">
                    {detailAttendees.length} confirmed
                  </span>
                </div>

                {isLoadingAttendees ? (
                  <div className="p-6 text-center text-muted-foreground text-xs">
                    Loading attendee roster...
                  </div>
                ) : detailAttendees.length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed border-border text-center text-muted-foreground text-xs">
                    No attendees registered yet for this workshop.
                  </div>
                ) : (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/60 border-b border-border text-muted-foreground font-medium text-[11px]">
                        <tr>
                          <th className="py-2 px-3">Member</th>
                          <th className="py-2 px-3">Email</th>
                          <th className="py-2 px-3">Registered At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {detailAttendees.map((att) => (
                          <tr key={att.id} className="hover:bg-muted/30">
                            <td className="py-2 px-3 text-foreground font-medium">{att.member_name}</td>
                            <td className="py-2 px-3 text-muted-foreground font-mono text-[11px]">{att.member_email}</td>
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
                    className="text-xs text-status-danger-text hover:underline font-medium flex items-center space-x-1"
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
                  className="btn-google-secondary px-3.5 py-1.5 text-xs font-medium"
                >
                  Close
                </button>
                {detailWorkshop.status !== 'CANCELLED' && detailWorkshop.available_capacity > 0 && (
                  <button
                    onClick={() => {
                      setSelectedWorkshop(detailWorkshop);
                      setShowRegisterModal(true);
                    }}
                    className="btn-google-primary px-4 py-1.5 text-xs font-medium"
                  >
                    Register Member
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google-style New Workshop Dialog */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-6 shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">New Workshop</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Define the workshop title, scheduled time, and maximum seating capacity.
            </p>

            <form onSubmit={handleCreate} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-foreground mb-1 font-medium">Workshop Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Consensus & Raft Architecture"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>

              <div>
                <label className="block text-foreground mb-1 font-medium">Description</label>
                <textarea
                  rows={2}
                  placeholder="Overview of topics and learning objectives..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-foreground mb-1 font-medium">Schedule (Future UTC) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    className="w-full bg-background border border-border rounded-md px-2.5 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-foreground mb-1 font-medium">Capacity (Max Seats) *</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-border flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-google-secondary px-3.5 py-1.5 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="btn-google-primary px-4 py-1.5 text-xs font-medium"
                >
                  {isSubmittingCreate ? 'Saving...' : 'Save Workshop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Member Modal */}
      {showRegisterModal && selectedWorkshop && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg max-w-md w-full p-6 shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-semibold text-foreground">Register Member</h3>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Registering for <span className="text-foreground font-semibold">{selectedWorkshop.title}</span>.
            </p>

            <form onSubmit={handleRegister} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-foreground mb-1 font-medium">Member ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. mem-701"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-foreground mb-1 font-medium">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David Miller"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-foreground mb-1 font-medium">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="david.miller@example.com"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="rounded-lg bg-primary-surface p-3 text-xs text-primary border border-primary-surface-border leading-relaxed">
                <span className="font-semibold">Transactional Outbox:</span> Member registration and confirmation notification commit within the same atomic database transaction.
              </div>

              <div className="mt-5 pt-3 border-t border-border flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="btn-google-secondary px-3.5 py-1.5 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRegister}
                  className="btn-google-primary px-4 py-1.5 text-xs font-medium"
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
