'use client';

import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Inbox,
  Cpu,
  BookOpen,
  LogOut,
  X,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

export type NavigationTab =
  | 'overview'
  | 'workshops'
  | 'registrations'
  | 'outbox'
  | 'simulator'
  | 'architecture';

interface SidebarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  outboxPendingCount?: number;
  simulatorMode?: string;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  outboxPendingCount = 0,
  simulatorMode = 'normal',
  mobileOpen,
  setMobileOpen,
}) => {
  const { user, logout } = useAuth();
  const isOrganizer = user?.role === 'ORGANIZER';

  const navItems: {
    id: NavigationTab;
    label: string;
    icon: React.ReactNode;
    badge?: React.ReactNode;
    organizerOnly?: boolean;
    section: 'main' | 'operations' | 'resources';
  }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
      section: 'main',
    },
    {
      id: 'workshops',
      label: 'Workshops',
      icon: <Calendar className="w-4 h-4 shrink-0" />,
      section: 'main',
    },
    {
      id: 'registrations',
      label: isOrganizer ? 'Registrations' : 'My Registrations',
      icon: <Users className="w-4 h-4 shrink-0" />,
      section: 'main',
    },
    {
      id: 'outbox',
      label: 'Transactional Outbox',
      icon: <Inbox className="w-4 h-4 shrink-0" />,
      organizerOnly: true,
      section: 'operations',
      badge:
        outboxPendingCount > 0 ? (
          <span className="ml-auto px-2 py-0.5 rounded-full text-[11px] font-semibold bg-status-warning-bg text-status-warning-text border border-status-warning-border">
            {outboxPendingCount}
          </span>
        ) : undefined,
    },
    {
      id: 'simulator',
      label: 'Failure Simulator',
      icon: <Cpu className="w-4 h-4 shrink-0" />,
      organizerOnly: true,
      section: 'operations',
      badge:
        simulatorMode && simulatorMode !== 'normal' ? (
          <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-status-danger-bg text-status-danger-text border border-status-danger-border">
            {simulatorMode}
          </span>
        ) : undefined,
    },
    {
      id: 'architecture',
      label: 'System Architecture',
      icon: <BookOpen className="w-4 h-4 shrink-0" />,
      section: 'resources',
    },
  ];

  const visibleItems = navItems.filter((item) => !item.organizerOnly || isOrganizer);

  const mainItems = visibleItems.filter((i) => i.section === 'main');
  const opItems = visibleItems.filter((i) => i.section === 'operations');
  const resItems = visibleItems.filter((i) => i.section === 'resources');

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  const handleSelectTab = (tab: NavigationTab) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  const renderNavGroup = (items: typeof navItems, groupTitle?: string) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1">
        {groupTitle && (
          <div className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            {groupTitle}
          </div>
        )}
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isActive
                  ? 'bg-primary-surface text-primary font-semibold shadow-xs border border-primary-surface-border'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
              }`}
            >
              <span
                className={`transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                }`}
              >
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
              {item.badge}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 md:z-20 h-screen w-64 bg-card border-r border-border flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Section: Brand & Close Button (mobile) */}
        <div>
          <div className="h-14 px-4 border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-xs">
                <span className="text-sm font-bold text-white tracking-wider leading-none">E</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground text-sm tracking-tight leading-tight">
                    EchoLet
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium bg-muted text-muted-foreground border border-border">
                    v2.0
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground leading-none font-medium mt-0.5">
                  Reliable Outbox Engine
                </span>
              </div>
            </div>

            <button
              onClick={() => setMobileOpen(false)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted md:hidden"
              aria-label="Close navigation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links Scrollable Body */}
          <div className="p-3 space-y-4 overflow-y-auto max-h-[calc(100vh-140px)]">
            {renderNavGroup(mainItems, 'Workspace')}
            {renderNavGroup(opItems, 'Operations & Reliability')}
            {renderNavGroup(resItems, 'Documentation')}
          </div>
        </div>

        {/* Bottom Section: Authenticated User & Sign Out */}
        <div className="p-3 border-t border-border-subtle bg-muted/20">
          {user ? (
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card border border-border shadow-xs">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-bold shrink-0">
                  {initials}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-foreground truncate leading-tight">
                    {user.name}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {isOrganizer ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        Organizer
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                        <UserCheck className="w-2.5 h-2.5" />
                        Member
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={logout}
                className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors shrink-0"
                title="Sign out of EchoLet"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-2">
              Not authenticated
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
