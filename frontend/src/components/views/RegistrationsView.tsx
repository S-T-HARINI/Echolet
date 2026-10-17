'use client';

import React, { useState } from 'react';
import {
  Workshop,
  GlobalRegistrationItem,
  registerMember,
} from '../../lib/api';
import {
  Users,
  Search,
  Filter,
  Plus,
  Calendar,
  CheckCircle2,
  X,
  UserPlus,
} from 'lucide-react';

interface RegistrationsViewProps {
  registrations: GlobalRegistrationItem[];
  workshops: Workshop[];
  onRefresh: () => void;
  showMessage: (msg: string, isError?: boolean) => void;
}

export const RegistrationsView: React.FC<RegistrationsViewProps> = ({
  registrations,
  workshops,
  onRefresh,
  showMessage,
}) => {
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Registration modal form state
  const [formWorkshopId, setFormWorkshopId] = useState<string>('');
  const [memberId, setMemberId] = useState('');
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableWorkshops = workshops.filter(
    (w) => w.status === 'SCHEDULED' && w.available_capacity > 0
  );

  const handleOpenRegisterModal = () => {
    if (availableWorkshops.length > 0) {
      setFormWorkshopId(availableWorkshops[0].id);
    }
    setShowRegisterModal(true);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWorkshopId || !memberId.trim() || !memberName.trim() || !memberEmail.trim()) {
      showMessage('Please select a workshop and complete all member fields.', true);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await registerMember(formWorkshopId, {
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
    } catch (err: any) {
      showMessage(err.message, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRegistrations = registrations.filter((reg) => {
    const matchesWorkshop =
      selectedWorkshopId === 'ALL' || reg.workshop_id === selectedWorkshopId;
    const matchesSearch =
      reg.member_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.member_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.workshop_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.member_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesWorkshop && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Registrations
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Confirmed member registrations across all scheduled workshop events.
          </p>
        </div>
        <div>
          <button
            onClick={handleOpenRegisterModal}
            disabled={availableWorkshops.length === 0}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium bg-primary hover:bg-primary-hover text-white shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>Register Member</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border rounded-lg p-3 shadow-xs">
        {/* Workshop filter dropdown */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-muted-foreground ml-1" />
          <span className="text-xs text-foreground font-medium">Workshop:</span>
          <select
            value={selectedWorkshopId}
            onChange={(e) => setSelectedWorkshopId(e.target.value)}
            className="bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          >
            <option value="ALL">All Workshops ({registrations.length})</option>
            {workshops.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title} ({w.registered_count} registered)
              </option>
            ))}
          </select>
        </div>

        {/* Member Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search member, email, workshop..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-72 bg-background border border-border rounded-md pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
      </div>

      {/* Registrations Table or Empty State */}
      <div className="border border-border rounded-lg overflow-hidden bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Member Details</th>
                <th className="py-2.5 px-4">Workshop</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Registered At</th>
                <th className="py-2.5 px-4 font-mono">Member ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Users className="w-8 h-8 mx-auto text-muted-foreground mb-2.5 opacity-60" />
                    <p className="text-foreground font-semibold text-xs">No registrations found</p>
                    <p className="text-muted-foreground text-xs mt-1 max-w-sm mx-auto leading-relaxed">
                      {registrations.length === 0
                        ? 'No members have registered for any workshops yet. Use the Register Member button to add attendees.'
                        : 'No registrations match your current workshop or search filter.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="text-foreground font-semibold text-xs">
                        {reg.member_name}
                      </div>
                      <div className="text-muted-foreground text-[11px] font-mono mt-0.5">
                        {reg.member_email}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-foreground font-medium text-xs line-clamp-1">
                        {reg.workshop_title}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-medium mt-0.5">
                        Status: {reg.workshop_status}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center text-[11px] font-medium px-2.5 py-0.5 rounded-full border bg-status-success-bg text-status-success-text border-status-success-border">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {reg.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      {new Date(reg.registered_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
                      {reg.member_id}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Member Dialog */}
      {showRegisterModal && (
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
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Select an active scheduled workshop with available capacity.
            </p>

            <form onSubmit={handleRegisterSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-foreground mb-1 font-medium">Select Workshop *</label>
                <select
                  required
                  value={formWorkshopId}
                  onChange={(e) => setFormWorkshopId(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                >
                  {availableWorkshops.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.title} ({w.available_capacity} free seats)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-foreground mb-1 font-medium">Member ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. mem-204"
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
                  placeholder="e.g. Maya Lin"
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
                  placeholder="maya.lin@example.com"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="rounded-lg bg-primary-surface p-3 text-xs text-primary border border-primary-surface-border leading-relaxed">
                <span className="font-semibold">Atomic ACID Guarantee:</span> Persisting this member commits an event in the outbox table. The worker asynchronously delivers confirmation over HTTP.
              </div>

              <div className="mt-5 pt-3 border-t border-border flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-md text-xs font-medium bg-primary hover:bg-primary-hover text-white shadow-xs disabled:opacity-50 transition-colors"
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
