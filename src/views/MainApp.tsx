/**
 * MainApp - Tab-based navigation shell
 * 
 * After login, this component renders the bottom tab bar
 * and switches between the main screens:
 * - Today / Log
 * - Dashboard
 * - Files / Bills
 * - Reminders
 * - Search / AI
 * - Profile / Settings
 */

import { useState } from 'react';
import {
  PenLine, LayoutDashboard, FolderOpen, Bell,
  Sparkles, UserCircle
} from 'lucide-react';
import TodayTab from './tabs/TodayTab';
import DashboardTab from './tabs/DashboardTab';
import FilesTab from './tabs/FilesTab';
import RemindersTab from './tabs/RemindersTab';
import SearchTab from './tabs/SearchTab';
import ProfileTab from './tabs/ProfileTab';

type TabId = 'today' | 'dashboard' | 'files' | 'reminders' | 'search' | 'profile';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

const TABS: Tab[] = [
  { id: 'today', label: 'Today', icon: PenLine },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'reminders', label: 'Reminders', icon: Bell },
  { id: 'search', label: 'AI', icon: Sparkles },
  { id: 'profile', label: 'Profile', icon: UserCircle },
];

export default function MainApp() {
  const [activeTab, setActiveTab] = useState<TabId>('today');

  const renderTab = () => {
    switch (activeTab) {
      case 'today': return <TodayTab />;
      case 'dashboard': return <DashboardTab />;
      case 'files': return <FilesTab />;
      case 'reminders': return <RemindersTab />;
      case 'search': return <SearchTab />;
      case 'profile': return <ProfileTab />;
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Scrollable Content Area */}
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24 overflow-y-auto" style={{ minHeight: 'calc(100vh - 72px)' }}>
        {renderTab()}
      </div>

      {/* Bottom Tab Bar */}
      <div className="tab-bar">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className="flex flex-col items-center gap-0.5 py-1 px-2 min-w-0 transition-all"
              onClick={() => setActiveTab(tab.id)}
              aria-label={tab.label}
              aria-selected={isActive}
              role="tab"
            >
              <Icon
                className="w-6 h-6 transition-all"
                style={{
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                  transform: isActive ? 'scale(1.1)' : 'scale(1)',
                }}
              />
              <span
                className="text-[10px] font-medium transition-all"
                style={{
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
