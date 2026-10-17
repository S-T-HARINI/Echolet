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
  Mail,
  UserCheck,
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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Registrations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global ledger of all confirmed workshop registrations across all scheduled events.
          </p>
        </div>
        <div>
          <button
            onClick={handleOpenRegisterModal}
            disabled={availableWorkshops.length === 0}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-md text-xs font-semibold bg-foreground text-background hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Register Member</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border border-border rounded-lg p-2.5 bg-card">
        {/* Workshop filter dropdown */}
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-muted-foreground ml-1" />
          <span className="text-xs text-muted-foreground font-medium">Workshop:</span>
          <select
            value={selectedWorkshopId}
            onChange={(e) => setSelectedWorkshopId(e.target.value)}
            className="bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
          >
            <option value="ALL">All Workshops ({registrations.length})</option>
            {workshops.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title} ({w.registered_count} attendees)
              </option>
            ))}
          </select>
        </div>

        {/* Member Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search member, email, workshop..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-72 bg-background border border-border rounded-md pl-8 pr-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
      </div>

      {/* Registrations Table or Empty State */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground font-mono text-[11px]">
              <tr>
                <th className="py-2.5 px-4 font-medium">Member Details</th>
                <th className="py-2.5 px-4 font-medium">Workshop</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium">Registered At</th>
                <th className="py-2.5 px-4 font-medium font-mono">Member ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-[11px]">
              {filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <Users className="w-8 h-8 mx-auto text-muted-foreground mb-3 opacity-60" />
                    <p className="text-foreground font-medium text-xs">No registrations found</p>
                    <p className="text-muted-foreground text-[11px] mt-1 max-w-sm mx-auto">
                      {registrations.length === 0
                        ? 'No members have registered for any workshops yet. Use the Register Member button above to add attendees.'
                        : 'No registrations match your current filter criteria.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="text-foreground font-medium text-xs font-sans">
                        {reg.member_name}
                      </div>
                      <div className="text-muted-foreground text-[10px] font-mono">
                        {reg.member_email}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-foreground font-medium font-sans text-xs line-clamp-1">
                        {reg.workshop_title}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Status: {reg.workshop_status}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                        <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                        {reg.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground text-[11px]">
                      {new Date(reg.registered_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono text-[10px]">
                      {reg.member_id}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Member Modal */}
      {showRegisterModal && (
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
              Select an active workshop with available seats and register a new attendee.
            </p>

            <form onSubmit={handleRegisterSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1 font-medium">Select Workshop *</label>
                <select
                  required
                  value={formWorkshopId}
                  onChange={(e) => setFormWorkshopId(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
                >
                  {availableWorkshops.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.title} ({w.available_capacity} free seats)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-muted-foreground mb-1 font-medium">Member ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., mem-101"
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
                  placeholder="e.g., Alex Johnson"
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
                  placeholder="alex.johnson@example.com"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-foreground"
                />
              </div>

              <div className="rounded-md bg-muted/40 p-2.5 text-[11px] text-muted-foreground border border-border leading-relaxed">
                <span className="font-semibold text-foreground">Outbox Guarantee:</span> Persisting this member commits an event in the outbox table. The worker asynchronously relays confirmation to the notification service.
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
                  className="px-4 py-1.5 rounded-md text-xs font-semibold bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition-opacity"
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
